const express = require('express');
const Joi = require('joi');
const analyticsRouter = express.Router();

const isAuthenticated = require('../middlewares/authMiddleware.js');
const authorizeRoles = require('../middlewares/authorizeRoles.js');
const { asyncHandler } = require('../utils/errorHandler.js');
const { validate } = require('../middlewares/validationMiddleware.js');
const { analyticsSchemas } = require('../utils/validationSchemas.js');

const {
    getStudentInterviewAnalytics,
    getStudentInterviewInsights,
    getCollegeProctorRiskDashboard,
    getStudentProctorRiskReport,
    getSuperAdminAnalyticsOverview,
    getStudentActivityTimeline,
    getCollegeAdminActivityTimeline,
    getSuperAdminActivityTimeline,
    getRiskTrendByCollege,
    getViolationAnalytics,
    getInterviewPerformanceHeatmap
} = require('../controllers/analyticsController.js');

analyticsRouter.use(isAuthenticated);

analyticsRouter.get('/interview/sessions', authorizeRoles('student'), validate(analyticsSchemas.sessionAnalyticsQuery, 'query'), asyncHandler(getStudentInterviewAnalytics));
analyticsRouter.get('/interview/sessions/:sessionId/insights', authorizeRoles('student'), validate(Joi.object({ sessionId: Joi.string().required() }), 'params'), asyncHandler(getStudentInterviewInsights));

analyticsRouter.get('/proctor/dashboard', authorizeRoles('college-admin'), validate(analyticsSchemas.riskDashboardQuery, 'query'), asyncHandler(getCollegeProctorRiskDashboard));
analyticsRouter.get('/proctor/student-report', authorizeRoles('student'), validate(analyticsSchemas.sessionAnalyticsQuery, 'query'), asyncHandler(getStudentProctorRiskReport));

analyticsRouter.get('/overview', authorizeRoles('super-admin'), validate(analyticsSchemas.analyticsQuery, 'query'), asyncHandler(getSuperAdminAnalyticsOverview));
analyticsRouter.get('/risk-trend', authorizeRoles('super-admin'), validate(analyticsSchemas.analyticsQuery, 'query'), asyncHandler(getRiskTrendByCollege));
analyticsRouter.get('/violations/analytics', authorizeRoles('super-admin'), validate(analyticsSchemas.analyticsQuery, 'query'), asyncHandler(getViolationAnalytics));
analyticsRouter.get('/interview/heatmap', authorizeRoles('super-admin'), validate(analyticsSchemas.analyticsQuery, 'query'), asyncHandler(getInterviewPerformanceHeatmap));

analyticsRouter.get('/activity/student', authorizeRoles('student'), validate(analyticsSchemas.activityTimelineQuery, 'query'), asyncHandler(getStudentActivityTimeline));
analyticsRouter.get('/activity/college', authorizeRoles('college-admin'), validate(analyticsSchemas.activityTimelineQuery, 'query'), asyncHandler(getCollegeAdminActivityTimeline));
analyticsRouter.get('/activity/super-admin', authorizeRoles('super-admin'), validate(analyticsSchemas.activityTimelineQuery, 'query'), asyncHandler(getSuperAdminActivityTimeline));

module.exports = analyticsRouter;