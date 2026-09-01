// =============================================================================
// ENFORCE ROUND TIMER MIDDLEWARE
// -----------------------------------------------------------------------------
// Guards submission endpoints. Two responsibilities:
//   1. Authorization: confirms the interview session belongs to the logged-in
//      student (closes an existing ownership gap in the submit routes).
//   2. Time enforcement: rejects submissions after the server-side round
//      deadline (with a small grace buffer). Client time is never trusted.
// =============================================================================

const InterviewSession = require("../models/InterviewSessionModel");
const RoundDetail = require("../models/RoundDetailModel");
const { GRACE_MS } = require("../services/timerService");
const sendError = require("../utils/sendError");
const logger = require("../services/loggerService");

module.exports = (roundType) => async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user?.id;

        if (!sessionId || !studentId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // (1) Ownership check — session must belong to this student.
        const session = await InterviewSession.findOne(
            { _id: sessionId, student: studentId },
            "_id"
        ).lean();
        if (!session) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this interview session.",
            });
        }

        // (2) Server-side time check. Use DB (source of truth) directly so it
        // works even if Redis is unavailable.
        const round = await RoundDetail.findOne(
            { session: sessionId, roundType },
            "endsAt status"
        ).lean();

        if (round && round.status !== "completed" && round.endsAt) {
            const deadline = new Date(round.endsAt).getTime() + GRACE_MS;
            if (Date.now() > deadline) {
                return res.status(403).json({
                    success: false,
                    code: "ROUND_TIME_UP",
                    message: "Round time is up. Submissions are locked.",
                });
            }
        }

        next();
    } catch (err) {
        logger.error("enforceRoundTimer error:", err);
        return sendError(res, err);
    }
};
