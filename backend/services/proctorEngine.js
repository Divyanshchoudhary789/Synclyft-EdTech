const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3 } = require("../config/cloudflare-config.js"); 
const ProctorSessionReport = require("../models/ProctorSessionReportModel.js");
const logger = require("../services/loggerService.js");

const VIOLATION_CONFIG = {
    'face_absence': { weight: 20 },
    'multiple_faces': { weight: 30 },
    'gaze_deviation': { weight: 8 },
    'tab_switch': { weight: 25 },
    'window_minimize': { weight: 25 },
    'paste_attempt': { weight: 15 },
    'scripted_input': { weight: 20 },
    'multiple_voices': { weight: 18 },
    'mobile_detected': { weight: 40 }
};

const MAX_VIOLATION_THRESHOLD = 100;
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

function initializeProctoringEngine(io) {
    setInterval(() => {
        for (let socketId of Object.keys(activeLiveSessions)) {
            let liveData = activeLiveSessions[socketId];
            if (liveData.currentScore > 0) {
                liveData.currentScore = Math.max(0, Math.floor(liveData.currentScore * 0.95) - 1);
                io.to(socketId).emit('RISK_SCORE_UPDATE', { 
                    riskScore: liveData.currentScore, 
                    message: "Score slightly decayed due to consistent compliant performance." 
                });
            }
        }
    }, 15000);

    io.on('connection', (socket) => {
        socket.on('START_PROCTORING', async ({ sessionId, candidateId }) => {
            try {
                let report = await ProctorSessionReport.findOne({ session: sessionId });
                if (!report) {
                    report = await ProctorSessionReport.create({ 
                        session: sessionId, 
                        candidateId, 
                        cumulativeRiskScore: 0, 
                        violationsLog: [] 
                    });
                }

                activeLiveSessions[socket.id] = {
                    sessionId,
                    candidateId,
                    currentScore: report.cumulativeRiskScore,
                    throttleMap: {}
                };
                
                socket.emit('PROCTORING_INITIALIZED', { 
                    status: 'secure', 
                    currentScore: report.cumulativeRiskScore 
                });
            } catch (error) {
                logger.error("Proctoring initialization error:", error);
            }
        });

        socket.on('PROCTOR_EVENT', async (payload) => {
            const liveSession = activeLiveSessions[socket.id];
            if (!liveSession) return;

            const { type, roundType, rawData, imageCapture } = payload;
            const now = Date.now();

            if (liveSession.throttleMap[type] && (now - liveSession.throttleMap[type] < 3500)) return;
            liveSession.throttleMap[type] = now;

            const configuration = VIOLATION_CONFIG[type];
            if (!configuration) return;

            let uploadedUrl = '';
            if (imageCapture) {
                uploadedUrl = await uploadSnapshotToR2(imageCapture, liveSession.sessionId, type);
            }

            liveSession.currentScore = Math.min(MAX_VIOLATION_THRESHOLD, liveSession.currentScore + configuration.weight);

            try {
                await ProctorSessionReport.findOneAndUpdate(
                    { session: liveSession.sessionId },
                    { 
                        $set: { cumulativeRiskScore: liveSession.currentScore },
                        $push: { 
                            violationsLog: {
                                roundType,
                                violationType: type,
                                severityWeight: configuration.weight,
                                snapshotUrl: uploadedUrl,
                                rawEventData: rawData || {}
                            }
                        }
                    }
                );

                socket.emit('RISK_SCORE_UPDATE', { 
                    riskScore: liveSession.currentScore, 
                    message: `Security Warning! Infraction detected: ${type.toUpperCase().replace('_', ' ')}` 
                });

                if (liveSession.currentScore >= MAX_VIOLATION_THRESHOLD) {
                    await ProctorSessionReport.findOneAndUpdate(
                        { session: liveSession.sessionId },
                        { $set: { isDisqualified: true } }
                    );
                    socket.emit('TERMINATE_SESSION', { 
                        reason: 'Automated disqualification triggered by proctoring compliance engine.' 
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