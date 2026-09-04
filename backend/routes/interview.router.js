const express = require("express");
const interviewRouter = express.Router();

const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");
const uploadResume = require("../middlewares/uploadResume.js");
const uploadValidation = require("../middlewares/uploadValidation.js");
const validateResumeUpload = require("../middlewares/validateResumeUpload.js");
const { handleUploadErrors } = require("../middlewares/handleUploadErrors.js");
const { resolveSeatContext, requireActiveSeat } = require("../middlewares/seatAccessMiddleware.js");
const verifyInterviewOwnership = require("../middlewares/verifyInterviewOwnership.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { interviewSchemas } = require("../utils/validationSchemas.js");


const { startInterviewSession, endInterviewSession, getInterviewState, initializeAptitudeBatchSession, getAptitudeRoundQuestion, getAptitudeProgress, submitAptitudeRound, getCodingRoundQuestions, submitCodingRound, runCodingRound, startTechnicalRoundSession, getTechnicalRoundQuestion, submitTechnicalRound, startHrRoundSession } = require("../controllers/interviewController.js");

const enforceRoundTimer = require("../middlewares/enforceRoundTimer.js");



// Every interview action is a paid (subscription-backed) feature. A student can
// only use these if an institution has allocated them an active seat on an
// active subscription that includes the "mockInterviews" feature and has
// remaining monthly quota, OR they have remaining free trial credits.
interviewRouter.use(
    isAuthenticated,
    authorizeRoles("student"),
    resolveSeatContext,
    requireActiveSeat({ feature: "mockInterviews", usage: "mockInterviews" })
);


interviewRouter.post("/initialize", uploadResume.single("resume"), handleUploadErrors, validateResumeUpload(false), validate(interviewSchemas.createSession, 'body'), startInterviewSession);

// Everything below is addressed by :sessionId — confirm ownership up front.
interviewRouter.use("/session/:sessionId", verifyInterviewOwnership);
interviewRouter.use("/initialize/aptitude-batchSession/:sessionId", verifyInterviewOwnership);
interviewRouter.use("/aptitude-round-questions/:sessionId", verifyInterviewOwnership);
interviewRouter.use("/aptitude-round-progress/:sessionId", verifyInterviewOwnership);
interviewRouter.use("/coding-round-questions/:sessionId", verifyInterviewOwnership);
interviewRouter.use("/technical-round-questions/:sessionId", verifyInterviewOwnership);

// Session lifecycle
interviewRouter.get("/session/:sessionId/state", getInterviewState);
interviewRouter.post("/session/:sessionId/terminate", endInterviewSession);

// Aptitude Round
interviewRouter.post("/initialize/aptitude-batchSession/:sessionId", validate(interviewSchemas.initializeAptitudeBatch, 'body'), initializeAptitudeBatchSession);
interviewRouter.post("/aptitude-round-questions/:sessionId", validate(interviewSchemas.getAptitudeQuestion, 'body'), getAptitudeRoundQuestion);
interviewRouter.get("/aptitude-round-progress/:sessionId", getAptitudeProgress);
interviewRouter.post("/session/:sessionId/submit-aptitude", enforceRoundTimer("aptitude"), validate(interviewSchemas.submitAptitude, 'body'), submitAptitudeRound);

// Coding Round
interviewRouter.get("/coding-round-questions/:sessionId", getCodingRoundQuestions);
interviewRouter.post("/session/:sessionId/run-coding", validate(interviewSchemas.submitCoding, 'body'), runCodingRound);
interviewRouter.post("/session/:sessionId/submit-coding", enforceRoundTimer("coding"), validate(interviewSchemas.submitCoding, 'body'), submitCodingRound);

// Technical Round
interviewRouter.post("/session/:sessionId/initialize-technical-persona", startTechnicalRoundSession);
interviewRouter.get("/technical-round-questions/:sessionId", getTechnicalRoundQuestion);
interviewRouter.post("/session/:sessionId/submit-technical", enforceRoundTimer("technical"), validate(interviewSchemas.submitTechnical, 'body'), submitTechnicalRound);

// HR Round — dynamic WebRTC/voice handshake
interviewRouter.post("/session/:sessionId/initialize-hr", startHrRoundSession);

module.exports = interviewRouter;
