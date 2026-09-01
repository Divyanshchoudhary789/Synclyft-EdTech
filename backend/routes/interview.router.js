const express = require("express");
const interviewRouter = express.Router();

const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");
const uploadResume = require("../middlewares/uploadResume.js");
const uploadValidation = require("../middlewares/uploadValidation.js");
const { resolveSeatContext, requireActiveSeat } = require("../middlewares/seatAccessMiddleware.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { interviewSchemas } = require("../utils/validationSchemas.js");


const { startInterviewSession, endInterviewSession, initializeAptitudeBatchSession, getAptitudeRoundQuestion, submitAptitudeRound, getCodingRoundQuestions, submitCodingRound, startTechnicalRoundSession, getTechnicalRoundQuestion, submitTechnicalRound, startHrRoundSession } = require("../controllers/interviewController.js");

const enforceRoundTimer = require("../middlewares/enforceRoundTimer.js");



// Every interview action is a paid (subscription-backed) feature. A student can
// only use these if an institution has allocated them an active seat on an
// active subscription that includes the "mockInterviews" feature and has
// remaining monthly quota.
interviewRouter.use(
    isAuthenticated,
    authorizeRoles("student"),
    resolveSeatContext,
    requireActiveSeat({ feature: "mockInterviews", usage: "mockInterviews" })
);


interviewRouter.post("/initialize", uploadResume.single("resume"), validate(interviewSchemas.createSession, 'body'), startInterviewSession);
interviewRouter.post("/session/:sessionId/terminate", validate(interviewSchemas.sessionIdParam, 'params'), endInterviewSession);

// Aptitude Round
interviewRouter.post("/initialize/aptitude-batchSession/:sessionId", validate(interviewSchemas.sessionIdParam, 'params'), validate(interviewSchemas.initializeAptitudeBatch, 'body'), initializeAptitudeBatchSession);
interviewRouter.post("/aptitude-round-questions/:sessionId", validate(interviewSchemas.sessionIdParam, 'params'), validate(interviewSchemas.getAptitudeQuestion, 'body'), getAptitudeRoundQuestion);
interviewRouter.post("/session/:sessionId/submit-aptitude", enforceRoundTimer("aptitude"), validate(interviewSchemas.sessionIdParam, 'params'), validate(interviewSchemas.submitAptitude, 'body'), submitAptitudeRound);

// Routes to get questions - Coding Round Questions
interviewRouter.get("/coding-round-questions/:sessionId", validate(interviewSchemas.sessionIdParam, 'params'), getCodingRoundQuestions);
interviewRouter.post("/session/:sessionId/submit-coding", enforceRoundTimer("coding"), validate(interviewSchemas.sessionIdParam, 'params'), validate(interviewSchemas.submitCoding, 'body'), submitCodingRound);


interviewRouter.post("/session/:sessionId/initialize-technical-persona", validate(interviewSchemas.sessionIdParam, 'params'), startTechnicalRoundSession);
// Routes to get question - Technical Round Question
interviewRouter.get("/technical-round-questions/:sessionId", validate(interviewSchemas.sessionIdParam, 'params'), getTechnicalRoundQuestion); // 1 question
interviewRouter.post("/session/:sessionId/submit-technical", enforceRoundTimer("technical"), validate(interviewSchemas.sessionIdParam, 'params'), validate(interviewSchemas.submitTechnical, 'body'), submitTechnicalRound);

// Dynamic WebRTC Token Generator Route for Live HR Interactivity
interviewRouter.post("/session/:sessionId/initialize-hr", validate(interviewSchemas.sessionIdParam, 'params'), startHrRoundSession);

module.exports = interviewRouter;