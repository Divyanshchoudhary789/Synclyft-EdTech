const express = require("express");
const Joi = require("joi");
const studentProfileRouter = express.Router();

const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");
const uploadImage = require("../middlewares/uploadImage.js");
const uploadValidation = require("../middlewares/uploadValidation.js");
const uploadResume = require("../middlewares/uploadResume.js");
const validateResumeUpload = require("../middlewares/validateResumeUpload.js");
const { handleUploadErrors } = require("../middlewares/handleUploadErrors.js");
const { asyncHandler } = require("../utils/errorHandler.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { reportSchemas, studentProfileSchemas, codingProfileSchemas } = require("../utils/validationSchemas.js");

const { updateProfilePicture, addProfileDetails, getProfileDetails, updateProfileDetails } = require("../controllers/studentProfileController.js");
const { initiateVerification, verifyProfile, syncProfile } = require("../controllers/codingProfileController.js");
const { getDashboard, getProgress, getNotifications, getStudentAnalyticsDashboard } = require("../controllers/studentDashboardController.js");
const { getMyBatch, getCampaignInbox, getCampaignById } = require("../controllers/studentCampaignController.js");
const { getStudentPerformanceReport, getStudentPerformanceDashboard, downloadMyPerformanceReport } = require("../controllers/performanceReportController.js");
const { resolveSeatContext, requireActiveSeat } = require("../middlewares/seatAccessMiddleware");

// global middlewares
studentProfileRouter.use(isAuthenticated, authorizeRoles("student"));


studentProfileRouter.get('/dashboard', asyncHandler(getDashboard));
studentProfileRouter.get('/progress', asyncHandler(getProgress));
studentProfileRouter.get('/notifications', validate(reportSchemas.paginationSchema, 'query'), asyncHandler(getNotifications));
studentProfileRouter.get('/analytics/dashboard', validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getStudentAnalyticsDashboard));
studentProfileRouter.get('/batch/me', asyncHandler(getMyBatch));
studentProfileRouter.get('/campaigns', asyncHandler(getCampaignInbox));
studentProfileRouter.get('/campaigns/:campaignId', validate(Joi.object({ campaignId: Joi.string().required() }), 'params'), asyncHandler(getCampaignById));
// Performance reports are a subscription-backed feature. Gate them behind an
// active seat + "studentReports" feature with remaining monthly quota.
const seatQuotaGate = [resolveSeatContext, requireActiveSeat({ feature: 'studentReports', usage: 'studentReports' })];

studentProfileRouter.get('/reports/dashboard', ...seatQuotaGate, validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getStudentPerformanceDashboard));
studentProfileRouter.get('/reports/summary', ...seatQuotaGate, validate(reportSchemas.downloadQuery, 'query'), asyncHandler(getStudentPerformanceReport));
studentProfileRouter.get('/reports/download', ...seatQuotaGate, validate(reportSchemas.downloadQuery, 'query'), asyncHandler(downloadMyPerformanceReport));

studentProfileRouter.get("/get-profile", getProfileDetails);
studentProfileRouter.post("/add/profile-details", uploadResume.single("resume"), handleUploadErrors, validateResumeUpload(true), addProfileDetails);
studentProfileRouter.put("/update/profile-picture", uploadImage.single("image"), handleUploadErrors, uploadValidation, updateProfilePicture);
studentProfileRouter.put("/update/profile", uploadResume.single("resume"), handleUploadErrors, validateResumeUpload(false), updateProfileDetails);


studentProfileRouter.post("/initiate", validate(codingProfileSchemas.initiateVerification, 'body'), initiateVerification);
studentProfileRouter.post("/verify", validate(codingProfileSchemas.verifyProfile, 'body'), verifyProfile);
studentProfileRouter.post("/sync", validate(codingProfileSchemas.syncProfile, 'body'), syncProfile);

module.exports = studentProfileRouter;