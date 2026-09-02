// Shared ownership check for socket namespaces that operate on an interview
// session (proctoring, HR voice, technical voice). The socket is already
// authenticated by config/socket.js (socket.user is set); this confirms the
// session the client claims actually belongs to that user.

const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSessionModel");

/**
 * @returns {Promise<{ ok: boolean, session?: object, reason?: string }>}
 */
async function verifySocketSession(socket, sessionId) {
    const userId = socket?.user?._id;
    if (!userId) return { ok: false, reason: "unauthenticated" };
    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
        return { ok: false, reason: "invalid_session_id" };
    }
    const session = await InterviewSession.findOne({ _id: sessionId, student: userId })
        .select("_id student status targetRole jobDescription")
        .lean();
    if (!session) return { ok: false, reason: "forbidden" };
    return { ok: true, session };
}

module.exports = { verifySocketSession };
