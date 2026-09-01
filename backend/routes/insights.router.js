const express = require("express");
const insightsRouter = express.Router();

const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");
const { asyncHandler } = require("../utils/errorHandler.js");
const { validate } = require("../middlewares/validationMiddleware.js");
const { insightsSchemas } = require("../utils/validationSchemas.js");

const {
    getDashboardAnalytics,
    getHistoricalReports,
    generateStudyPlan,
    listStudyPlans,
    getStudyPlanDetail,
    updateStudyPlanStatus
} = require("../controllers/insightsController.js");

const { resolveSeatContext, requireActiveSeat } = require("../middlewares/seatAccessMiddleware");


insightsRouter.use(isAuthenticated);


insightsRouter.get(
    '/dashboard',
    authorizeRoles('student'),
    asyncHandler(getDashboardAnalytics)
);

insightsRouter.get(
    '/reports',
    authorizeRoles('student'),
    validate(insightsSchemas.historicalReportQuery, 'query'),
    asyncHandler(getHistoricalReports)
);

insightsRouter.post(
    '/study-plan/generate',
    authorizeRoles('student'),
    resolveSeatContext,
    requireActiveSeat({ feature: 'aiEvaluation', usage: 'aiEvaluation' }),
    validate(insightsSchemas.generatePlan, 'body'),
    asyncHandler(generateStudyPlan)
);

insightsRouter.get(
    '/study-plan',
    authorizeRoles('student'),
    asyncHandler(listStudyPlans)
);

insightsRouter.get(
    '/study-plan/:planId',
    authorizeRoles('student'),
    validate(insightsSchemas.planIdParam, 'params'),
    asyncHandler(getStudyPlanDetail)
);

insightsRouter.put(
    '/study-plan/:planId/status',
    authorizeRoles('student'),
    validate(insightsSchemas.planIdParam, 'params'),
    validate(insightsSchemas.updatePlanStatus, 'body'),
    asyncHandler(updateStudyPlanStatus)
);

module.exports = insightsRouter;
