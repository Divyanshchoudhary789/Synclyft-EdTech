// =============================================================================
// VERIFY INTERVIEW OWNERSHIP
// -----------------------------------------------------------------------------
// Every interview route is addressed by :sessionId. Without this guard a student
// could drive another student's interview (fetch their questions, submit answers
// into their round, terminate their session). This middleware confirms the
// session belongs to the authenticated student and attaches it as
// req.interviewSession for downstream handlers.
// =============================================================================

const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSessionModel");
const logger = require("../services/loggerService");

module.exports = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user?.id;

        if (!studentId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({ success: false, message: "A valid interview session id is required." });
        }

        const session = await InterviewSession.findOne({ _id: sessionId, student: studentId });
        if (!session) {
            return res.status(403).json({
                success: false,
                code: "SESSION_FORBIDDEN",
                message: "You are not authorized to access this interview session.",
            });
        }

        req.interviewSession = session;
        return next();
    } catch (err) {
        logger.error("verifyInterviewOwnership error:", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};
