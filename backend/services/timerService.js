// =============================================================================
// INTERVIEW ROUND TIMER SERVICE
// -----------------------------------------------------------------------------
// Server-authoritative per-round timer.
//
// Layers of truth (defence in depth):
//   1. MongoDB (RoundDetail.startedAt / endsAt)  -> source of truth
//   2. Redis KV + TTL                            -> fast per-round state
//   3. Redis ZSET of due timers                  -> O(due) sweep
//   4. Submit middleware                         -> rejects late submissions
//   5. DB fallback cron                          -> finalizes overdue rounds if
//                                                  Redis is ever lost
//
// All time maths use the SERVER clock. Client time is never trusted.
// =============================================================================

const { client: redis, isRedisReady } = require("../config/redis");
const { getIO } = require("../config/socket");
const logger = require("./loggerService");
const RoundDetail = require("../models/RoundDetailModel");
const InterviewSession = require("../models/InterviewSessionModel");

// ZSET holding "sessionId:roundType" -> score = endsAt(ms). The sweeper drains
// members whose score <= now.
const TIMER_ZSET = "interview:roundTimers";

// Per-round KV key (value = endsAt epoch ms, EX = duration + buffer).
const roundKey = (sessionId, roundType) => `interview:timer:${sessionId}:${roundType}`;

// Small buffer (ms) to absorb legitimate network latency on the final submit.
const GRACE_MS = 2000;

// Per-round lock prevents duplicate finalization when multiple instances run
// the sweeper or when client + sweeper both trigger at once.
const finalizeLockKey = (sessionId, roundType) =>
    `interview:finalizeLock:${sessionId}:${roundType}`;

/**
 * Start (or no-op if already started) the timer for a round.
 * Idempotent: safe to call on every question fetch / round entry.
 * @returns {number|null} endsAt epoch ms, or null if already started / failed
 */
async function startRoundTimer(sessionId, roundType, durationSeconds) {
    const endsAt = Date.now() + durationSeconds * 1000;

    try {
        const result = await RoundDetail.updateOne(
            { session: sessionId, roundType, startedAt: { $exists: false } },
            {
                $set: {
                    startedAt: new Date(),
                    endsAt: new Date(endsAt),
                    durationSeconds,
                    status: "active",
                },
            }
        );

        // matchedCount === 0 => round already had a timer; do not restart.
        if (result.matchedCount === 0) return null;

        if (isRedisReady()) {
            await redis.set(roundKey(sessionId, roundType), String(endsAt), {
                EX: durationSeconds + 60,
            });
            await redis.zAdd(TIMER_ZSET, [
                { score: endsAt, value: `${sessionId}:${roundType}` },
            ]);
        }
        return endsAt;
    } catch (err) {
        // Timer is additive; never block the interview on timer failure.
        logger.error("startRoundTimer failed", { sessionId, roundType, error: err.message });
        return null;
    }
}

/**
 * Remaining time in ms until the round ends.
 * Uses Redis when available, falls back to MongoDB (source of truth).
 */
async function getRemainingMs(sessionId, roundType) {
    try {
        if (isRedisReady()) {
            const raw = await redis.get(roundKey(sessionId, roundType));
            if (raw) return Math.max(0, Number(raw) - Date.now());
        }
        const doc = await RoundDetail.findOne(
            { session: sessionId, roundType },
            "endsAt"
        ).lean();
        if (!doc?.endsAt) return 0;
        return Math.max(0, new Date(doc.endsAt).getTime() - Date.now());
    } catch (err) {
        logger.error("getRemainingMs failed", { sessionId, roundType, error: err.message });
        return 0;
    }
}

/**
 * Authoritative, idempotent finalization when a round's time is up.
 * Marks the round completed + forceEnded and notifies the client via Socket.io.
 */
async function finalizeRoundOnTimeout(sessionId, roundType) {
    const lockKey = finalizeLockKey(sessionId, roundType);

    // Only one process may finalize this round.
    let lockAcquired = false;
    try {
        if (isRedisReady()) {
            lockAcquired = await redis.set(lockKey, "1", { NX: true, EX: 120 });
            if (!lockAcquired) return; // another instance is handling it
        }

        const round = await RoundDetail.findOne({ session: sessionId, roundType });
        if (!round || round.status === "completed") return;

        round.status = "completed";
        round.forceEnded = true;
        round.endedAt = new Date();
        await round.save();

        // Notify the candidate (socket room is the user id, per socket.js).
        const session = await InterviewSession.findById(sessionId)
            .select("student")
            .lean();
        if (session) {
            getIO()
                .to(String(session.student))
                .emit("ROUND_ENDED", { sessionId, roundType, reason: "time_up" });
        }

        logger.info("Round auto-finalized on timeout", { sessionId, roundType });
    } catch (err) {
        logger.error("finalizeRoundOnTimeout failed", {
            sessionId,
            roundType,
            error: err.message,
        });
    } finally {
        if (lockAcquired && isRedisReady()) {
            await redis.del(lockKey).catch(() => {});
        }
    }
}

/**
 * Remove all timer state for a session (called on interview completion).
 */
async function clearRoundTimers(sessionId, roundTypes = ["aptitude", "coding", "technical", "hr"]) {
    try {
        if (!isRedisReady()) return;
        const pipeline = roundTypes.map((rt) => {
            redis.zRem(TIMER_ZSET, `${sessionId}:${rt}`);
            redis.del(roundKey(sessionId, rt));
        });
        await Promise.all(pipeline);
    } catch (err) {
        logger.error("clearRoundTimers failed", { sessionId, error: err.message });
    }
}

/**
 * Background sweeper. Runs on every instance; the per-round lock makes
 * finalization idempotent, so concurrent sweepers are safe.
 */
function startTimerSweeper(intervalMs = 1000) {
    const timer = setInterval(async () => {
        try {
            if (!isRedisReady()) return;

            const now = Date.now();
            const due = await redis.zRangeByScore(TIMER_ZSET, 0, now);

            for (const member of due) {
                await redis.zRem(TIMER_ZSET, member);
                const [sessionId, roundType] = member.split(":");
                if (sessionId && roundType) {
                    await finalizeRoundOnTimeout(sessionId, roundType);
                }
            }
        } catch (err) {
            logger.error("Timer sweep iteration failed", { error: err.message });
        }
    }, intervalMs);

    // Do not keep the process alive solely for the sweeper.
    if (timer.unref) timer.unref();
    return timer;
}

module.exports = {
    startRoundTimer,
    getRemainingMs,
    finalizeRoundOnTimeout,
    clearRoundTimers,
    startTimerSweeper,
    GRACE_MS,
};
