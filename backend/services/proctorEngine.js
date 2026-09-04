const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3 } = require("../config/cloudflare-config.js");
const ProctorSessionReport = require("../models/ProctorSessionReportModel.js");
const { verifySocketSession } = require("../utils/socketAuth.js");
const logger = require("../services/loggerService.js");

// ─────────────────────────────────────────────────────────────────────────────
// Violation policy
//
// `weight`     — points added per confirmed occurrence
// `cap`        — the maximum this single violation type may ever contribute to
//                the cumulative score. Stops one misfiring sensor (a noisy mic,
//                a jittery face model) from ever terminating a session on its
//                own — a real disqualification needs a multi-signal pattern.
// `grace`      — when false the violation still counts during the warm-up window
//                (used for hard signals like a detected phone).
// ─────────────────────────────────────────────────────────────────────────────
const VIOLATION_CONFIG = {
    face_absence:     { weight: 12, cap: 40, grace: true },
    multiple_faces:   { weight: 22, cap: 66, grace: false },
    gaze_deviation:   { weight: 5,  cap: 20, grace: true },
    tab_switch:       { weight: 18, cap: 60, grace: true },
    window_minimize:  { weight: 14, cap: 45, grace: true },
    paste_attempt:    { weight: 12, cap: 40, grace: true },
    scripted_input:   { weight: 18, cap: 54, grace: true },
    multiple_voices:  { weight: 8,  cap: 24, grace: true },
    mobile_detected:  { weight: 50, cap: 85, grace: false },
};

const HARD_LIMIT = 100;          // auto-terminate at/above this
const SOFT_WARN_AT = 55;         // surface a "you're close" banner at/above this
const GRACE_PERIOD_MS = 20000;   // first 20s: settling in — violations count at 40%
const GRACE_MULTIPLIER = 0.4;
const PER_TYPE_THROTTLE_MS = 4000;
const DECAY_INTERVAL_MS = 20000;
const DECAY_FACTOR = 0.8;         // -20% every 20s of clean behaviour
const IDLE_FAST_DECAY_AFTER_MS = 45000;
const IDLE_FAST_DECAY_FACTOR = 0.6;

let activeLiveSessions = {};

async function uploadSnapshotToR2(base64Data, sessionID, type) {
    if (!base64Data) return '';
    try {
        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Clean, 'base64');

        const generatedKey = `snapshots/${sessionID}/${type}-${Date.now()}.jpg`;

        const uploadParams = {
            Bucket: process.env.R2_BUCKET,
            Key: generatedKey,
            Body: imageBuffer,
            ContentType: "image/jpeg"
        };

        await s3.send(new PutObjectCommand(uploadParams));

        return `${process.env.R2_PUBLIC_URL}/${generatedKey}`;
    } catch (e) {
        logger.error("R2 upload error:", e);
        return '';
    }
}

function recomputeScore(liveData) {
    // Score is the sum of each type's capped contribution — order-independent and
    // impossible for a single sensor to run away with.
    let total = 0;
    for (const type of Object.keys(liveData.typeTotals)) {
        const cfg = VIOLATION_CONFIG[type];
        if (!cfg) continue;
        total += Math.min(cfg.cap, liveData.typeTotals[type]);
    }
    return Math.min(HARD_LIMIT, Math.round(total));
}

function initializeProctoringEngine(io) {
    setInterval(() => {
        const now = Date.now();
        for (let socketId of Object.keys(activeLiveSessions)) {
            let liveData = activeLiveSessions[socketId];
            if (liveData.currentScore <= 0) continue;

            const idle = now - (liveData.lastEventAt || liveData.startedAt);
            const factor = idle > IDLE_FAST_DECAY_AFTER_MS ? IDLE_FAST_DECAY_FACTOR : DECAY_FACTOR;

            // Decay every tracked type proportionally so caps stay meaningful.
            for (const type of Object.keys(liveData.typeTotals)) {
                liveData.typeTotals[type] = liveData.typeTotals[type] * factor;
                if (liveData.typeTotals[type] < 0.5) delete liveData.typeTotals[type];
            }

            const next = recomputeScore(liveData);
            if (next !== liveData.currentScore) {
                liveData.currentScore = next;
                liveData.warned = liveData.warned && next >= SOFT_WARN_AT;
                io.to(socketId).emit('RISK_SCORE_UPDATE', { riskScore: next, message: "", decay: true });
                ProctorSessionReport.updateOne(
                    { session: liveData.sessionId },
                    { $set: { cumulativeRiskScore: next } }
                ).catch(() => {});
            }
        }
    }, DECAY_INTERVAL_MS);

    io.on('connection', (socket) => {
        socket.on('START_PROCTORING', async ({ sessionId }) => {
            try {
                const auth = await verifySocketSession(socket, sessionId);
                if (!auth.ok) {
                    socket.emit('PROCTORING_ERROR', { reason: auth.reason });
                    return;
                }
                const candidateId = String(socket.user._id);

                let report = await ProctorSessionReport.findOne({ session: sessionId });
                if (!report) {
                    report = await ProctorSessionReport.create({
                        session: sessionId,
                        candidateId,
                        cumulativeRiskScore: 0,
                        violationsLog: []
                    });
                }

                // Rebuild the per-type totals from whatever is already persisted so
                // a page refresh mid-round resumes the real score, not zero.
                const typeTotals = {};
                for (const v of report.violationsLog || []) {
                    typeTotals[v.violationType] = (typeTotals[v.violationType] || 0) + (v.severityWeight || 0);
                }

                activeLiveSessions[socket.id] = {
                    sessionId,
                    candidateId,
                    currentScore: report.cumulativeRiskScore || 0,
                    typeTotals,
                    distinctTypes: new Set(Object.keys(typeTotals)),
                    throttleMap: {},
                    startedAt: Date.now(),
                    lastEventAt: 0,
                    warned: false,
                };

                socket.emit('PROCTORING_INITIALIZED', {
                    status: 'secure',
                    currentScore: report.cumulativeRiskScore || 0,
                    graceMs: GRACE_PERIOD_MS,
                });
            } catch (error) {
                logger.error("Proctoring initialization error:", error);
                socket.emit('PROCTORING_ERROR', { reason: 'init_failed' });
            }
        });

        socket.on('PROCTOR_EVENT', async (payload) => {
            const liveSession = activeLiveSessions[socket.id];
            if (!liveSession) return;

            const { type, roundType, rawData, imageCapture } = payload;
            const now = Date.now();

            const configuration = VIOLATION_CONFIG[type];
            if (!configuration) return;

            if (liveSession.throttleMap[type] && (now - liveSession.throttleMap[type] < PER_TYPE_THROTTLE_MS)) return;
            liveSession.throttleMap[type] = now;

            // Already maxed out on this signal — record nothing, it can't change the
            // outcome and we don't want to spam storage/R2.
            if ((liveSession.typeTotals[type] || 0) >= configuration.cap) return;

            const inGrace = now - liveSession.startedAt < GRACE_PERIOD_MS;
            const effectiveWeight = inGrace && configuration.grace
                ? configuration.weight * GRACE_MULTIPLIER
                : configuration.weight;

            let uploadedUrl = '';
            if (imageCapture) {
                uploadedUrl = await uploadSnapshotToR2(imageCapture, liveSession.sessionId, type);
            }

            liveSession.typeTotals[type] = (liveSession.typeTotals[type] || 0) + effectiveWeight;
            liveSession.distinctTypes.add(type);
            liveSession.lastEventAt = now;
            liveSession.currentScore = recomputeScore(liveSession);

            try {
                await ProctorSessionReport.findOneAndUpdate(
                    { session: liveSession.sessionId },
                    {
                        $set: { cumulativeRiskScore: liveSession.currentScore },
                        $push: {
                            violationsLog: {
                                roundType,
                                violationType: type,
                                severityWeight: Math.round(effectiveWeight),
                                snapshotUrl: uploadedUrl,
                                rawEventData: rawData || {}
                            }
                        }
                    }
                );

                const score = liveSession.currentScore;
                const crossedWarn = !liveSession.warned && score >= SOFT_WARN_AT && score < HARD_LIMIT;
                if (crossedWarn) liveSession.warned = true;

                socket.emit('RISK_SCORE_UPDATE', {
                    riskScore: score,
                    violationType: type,
                    message: crossedWarn
                        ? "Proctoring risk is high. Stay in frame, keep this tab focused, and no one else in the room."
                        : "",
                });

                // Auto-terminate only on a genuine multi-signal pattern — never on
                // one repeated sensor (its capped contribution can't reach 100).
                const isPattern = liveSession.distinctTypes.size >= 2;
                if (score >= HARD_LIMIT && isPattern) {
                    await ProctorSessionReport.findOneAndUpdate(
                        { session: liveSession.sessionId },
                        { $set: { isDisqualified: true } }
                    );
                    socket.emit('TERMINATE_SESSION', {
                        reason: 'The interview was ended automatically because multiple proctoring rules were broken repeatedly.'
                    });
                    socket.disconnect(true);
                }
            } catch (dbError) {
                logger.error("Database log update error:", dbError);
            }
        });

        socket.on('disconnect', () => {
            delete activeLiveSessions[socket.id];
        });
    });
}

module.exports = initializeProctoringEngine;
