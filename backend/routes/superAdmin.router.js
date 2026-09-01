const express = require("express");
const superAdminRouter = express.Router();

const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { superAdminSchemas, reportSchemas } = require("../utils/validationSchemas.js");

const { getPendingCollegeAdmins, approveCollegeAdmin, rejectCollegeAdmin, getPlatformOverview, getOrganizations, updateOrganizationStatus, getAuditLogs, getAuditLogById, getAuditLogSummary, exportAuditLogs } = require("../controllers/superAdminController.js");
const { getSuperAdminAnalyticsOverview, getRiskTrendByCollege, getViolationAnalytics, getInterviewPerformanceHeatmap } = require("../controllers/analyticsController.js");


superAdminRouter.use(isAuthenticated, authorizeRoles("super-admin"));


superAdminRouter.get("/overview", getPlatformOverview);
superAdminRouter.get("/analytics/overview", getSuperAdminAnalyticsOverview);
superAdminRouter.get("/analytics/risk-trend", getRiskTrendByCollege);
superAdminRouter.get("/analytics/violations", getViolationAnalytics);
superAdminRouter.get("/analytics/interview-heatmap", getInterviewPerformanceHeatmap);
superAdminRouter.get("/audit-logs", validate(reportSchemas.paginationSchema, 'query'), getAuditLogs);
superAdminRouter.get("/audit-logs/summary", getAuditLogSummary);
superAdminRouter.get("/audit-logs/export", exportAuditLogs);
superAdminRouter.get("/audit-logs/:auditLogId", validate(superAdminSchemas.auditLogIdParam, 'params'), getAuditLogById);
superAdminRouter.get("/pending-approvals", getPendingCollegeAdmins);
superAdminRouter.patch("/approve-college-admin/:id", validate(superAdminSchemas.approveCollegeAdmin, 'params'), approveCollegeAdmin);
superAdminRouter.patch("/reject-college-admin/:id", validate(superAdminSchemas.rejectCollegeAdmin, 'params'), rejectCollegeAdmin);
superAdminRouter.get("/organizations", validate(superAdminSchemas.organizationQuery, 'query'), getOrganizations);
superAdminRouter.patch("/organizations/:organizationId/status", validate(superAdminSchemas.organizationIdParam, 'params'), validate(superAdminSchemas.updateOrganizationStatus, 'body'), updateOrganizationStatus);

module.exports = superAdminRouter;