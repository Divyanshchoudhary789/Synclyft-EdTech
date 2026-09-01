const InsightsService = require('../services/insightsService.js');
const AIStudyPlan = require('../models/AIStudyPlanModel.js');
const { asyncHandler } = require('../utils/errorHandler.js');
const { consumeEntitlement } = require('../middlewares/seatAccessMiddleware.js');


const getDashboardAnalytics = asyncHandler(async (req, res) => {
    const analytics = await InsightsService.getDashboardAnalytics(req.user.id);

    return res.status(200).json({
        success: true,
        message: 'Dashboard analytics fetched successfully.',
        data: analytics
    });
});


const getHistoricalReports = asyncHandler(async (req, res) => {
    const reports = await InsightsService.getHistoricalReports(req.user.id, req.query);

    return res.status(200).json({
        success: true,
        message: 'Historical interview reports fetched successfully.',
        ...reports
    });
});


const generateStudyPlan = asyncHandler(async (req, res) => {
    const { sourceSessionId, targetRole, jobDescription } = req.body;

    if (sourceSessionId && !sourceSessionId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid sourceSessionId format.' });
    }

    const plan = await InsightsService.generateStudyPlanForStudent(
        req.user.id,
        sourceSessionId || null,
        targetRole || null,
        jobDescription || ''
    );

    if (req.entitlementSource) {
        await consumeEntitlement(req, 'aiEvaluation');
    }

    return res.status(201).json({
        success: true,
        message: 'AI study plan generated successfully.',
        data: plan
    });
});


const listStudyPlans = asyncHandler(async (req, res) => {
    const groupedPlans = await InsightsService.listStudyPlansForStudent(req.user.id);

    const flatList = Object.entries(groupedPlans).map(([role, plans]) => ({
        targetRole: role,
        plans: plans.map(p => ({
            id: p._id,
            planTitle: p.planTitle,
            status: p.status,
            priority: p.priority,
            estimatedTotalHours: p.estimatedTotalHours,
            overallCompetencyBefore: p.overallCompetencyBefore,
            topicCount: p.topics?.length || 0,
            milestoneCount: p.milestones?.length || 0,
            generatedAt: p.createdAt,
            completedAt: p.completedAt
        }))
    }));

    const totalPlans = flatList.reduce((sum, g) => sum + g.plans.length, 0);

    return res.status(200).json({
        success: true,
        message: 'Study plans fetched successfully.',
        data: {
            groupedByRole: flatList,
            summary: {
                totalPlans,
                roleCount: flatList.length,
                activePlans: flatList.reduce((sum, g) => sum + g.plans.filter(p => p.status === 'active').length, 0),
                completedPlans: flatList.reduce((sum, g) => sum + g.plans.filter(p => p.status === 'completed').length, 0)
            }
        }
    });
});


const getStudyPlanDetail = asyncHandler(async (req, res) => {
    const { planId } = req.params;

    if (!planId || !planId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid plan ID format.' });
    }

    const plan = await InsightsService.getStudyPlanById(planId, req.user.id);

    if (!plan) {
        return res.status(404).json({ success: false, message: 'Study plan not found.' });
    }

    return res.status(200).json({
        success: true,
        message: 'Study plan details fetched successfully.',
        data: plan
    });
});


const updateStudyPlanStatus = asyncHandler(async (req, res) => {
    const { planId } = req.params;
    const { status } = req.body;

    if (!planId || !planId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid plan ID format.' });
    }

    const validStatuses = ['active', 'paused', 'completed', 'archived'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const plan = await AIStudyPlan.findOne({ _id: planId, student: req.user.id });
    if (!plan) {
        return res.status(404).json({ success: false, message: 'Study plan not found.' });
    }

    plan.status = status;
    if (status === 'completed') {
        plan.completedAt = new Date();
    }
    await plan.save();

    return res.status(200).json({
        success: true,
        message: `Study plan marked as ${status} successfully.`,
        data: {
            id: plan._id,
            status: plan.status,
            completedAt: plan.completedAt
        }
    });
});


module.exports = {
    getDashboardAnalytics,
    getHistoricalReports,
    generateStudyPlan,
    listStudyPlans,
    getStudyPlanDetail,
    updateStudyPlanStatus
};
