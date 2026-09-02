const express = require("express");
const resumeRouter = express.Router();

const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");
const uploadResume = require("../middlewares/uploadResume.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { resumeSchemas } = require("../utils/validationSchemas.js");

const {
    saveResume,
    getUserResumesHistory,
    getResumeById,
    updateResume,
    deleteResume,
    optimizeResumeAI,
    analyzeResumeFile,
    getResumeAnalyses,
    getResumeAnalysisById,
    deleteResumeAnalysis
} = require("../controllers/resumeController.js");


resumeRouter.use(isAuthenticated, authorizeRoles("student"));


resumeRouter.post("/save", validate(resumeSchemas.saveResume, 'body'), saveResume);
resumeRouter.post("/analyze", uploadResume.single("resume"), validate(resumeSchemas.analyzeResume, 'body'), analyzeResumeFile); // Resume Analyzer
resumeRouter.post("/optimize-ai", validate(resumeSchemas.optimizeResume, 'body'), optimizeResumeAI); // Resume Optimizer
resumeRouter.get("/history", getUserResumesHistory);
resumeRouter.get("/analyses", getResumeAnalyses); // AI analysis history
resumeRouter.get("/analyses/:id", validate(resumeSchemas.resumeIdParam, 'params'), getResumeAnalysisById);
resumeRouter.delete("/analyses/:id", validate(resumeSchemas.resumeIdParam, 'params'), deleteResumeAnalysis);
resumeRouter.post("/:id", validate(resumeSchemas.resumeIdParam, 'params'), validate(resumeSchemas.saveResume, 'body'), updateResume);
resumeRouter.get("/:id", validate(resumeSchemas.resumeIdParam, 'params'), getResumeById);
resumeRouter.delete("/:id", validate(resumeSchemas.resumeIdParam, 'params'), deleteResume);

module.exports = resumeRouter;
