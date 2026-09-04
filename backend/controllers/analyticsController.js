const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSessionModel.js');
const InterviewAnalytics = require('../models/InterviewAnalyticsModel.js');
const ProctorRiskReport = require('../models/ProctorRiskReportModel.js');
const ProctorSessionReport = require('../models/ProctorSessionReportModel.js');
const RoundDetail = require('../models/RoundDetailModel.js');
const PerformanceInsight = require('../models/PerformanceInsightModel.js');
const StudentProfile = require('../models/StudentProfileModel.js');
const User = require('../models/userModel.js');
const AuditLog = require('../models/AuditLogModel.js');
const sendError = require('../utils/sendError.js');
const logger = require('../services/loggerService.js');

const buildPagination = (query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

const getStudentInterviewAnalytics = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const studentId = req.user.id;

        const analytics = await InterviewAnalytics.find({ student: studentId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('campaign', 'title description')
            .lean();

        const total = await InterviewAnalytics.countDocuments({ student: studentId });

        const summary = await InterviewAnalytics.getStudentAnalyticsSummary(studentId, 90);

        return res.status(200).json({
            success: true,
            message: 'Interview session analytics fetched successfully.',
            data: {
                analytics: analytics.map(a => ({
                    id: a._id,
                    sessionId: a.session,
                    targetRole: a.metadata?.targetRole || '',
                    status: 'completed',
                    startedAt: a.startedAt,
                    completedAt: a.completedAt,
                    totalDuration: a.totalDurationSeconds,
                    formattedDuration: `${Math.floor((a.totalDurationSeconds || 0) / 60)}m ${(a.totalDurationSeconds || 0) % 60}s`,
                    overallScore: a.overallScore,
                    finalGrade: a.finalGrade,
                    proctoringRiskScore: a.proctoringRiskScore,
                    isDisqualified: a.isDisqualified,
                    skillScores: a.skillScores,
                    competencyMetrics: a.competencyMetrics,
                    roundAnalytics: a.roundAnalytics,
                    campaign: a.campaign
                })),
                summary: {
                    totalSessions: summary.totalSessions || 0,
                    averageScore: Math.round(summary.averageScore || 0),
                    averageRiskScore: Math.round(summary.averageRiskScore || 0),
                    totalDisqualified: summary.totalDisqualified || 0,
                    averageDuration: Math.round(summary.averageDuration || 0),
                    gradeDistribution: summary.gradeDistribution || {}
                }
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getStudentInterviewInsights = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { sessionId } = req.params;

        if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
            return res.status(400).json({ success: false, message: 'Valid session ID required.' });
        }

        const analytics = await InterviewAnalytics.findOne({ session: sessionId, student: studentId })
            .populate('campaign', 'title description')
            .populate('session', 'jobDescription targetRole preferredCodingLanguage')
            .lean();

        if (!analytics) {
            return res.status(404).json({ success: false, message: 'Interview session analytics not found.' });
        }

        const [sessionDetails, roundDetails, insight] = await Promise.all([
            InterviewSession.findById(sessionId).lean(),
            RoundDetail.find({ session: sessionId }).lean(),
            PerformanceInsight.findOne({ session: sessionId, student: studentId }).lean(),
        ]);

        return res.status(200).json({
            success: true,
            message: 'Interview session insights fetched successfully.',
            data: {
                session: {
                    id: analytics.session,
                    jobDescription: sessionDetails?.jobDescription || '',
                    targetRole: sessionDetails?.targetRole || '',
                    preferredCodingLanguage: sessionDetails?.preferredCodingLanguage || '',
                    status: sessionDetails?.status || '',
                    completedAt: sessionDetails?.completedAt || null,
                },
                analytics: {
                    overallScore: analytics.overallScore,
                    finalGrade: analytics.finalGrade,
                    proctoringRiskScore: analytics.proctoringRiskScore,
                    isDisqualified: analytics.isDisqualified,
                    skillScores: analytics.skillScores,
                    competencyMetrics: analytics.competencyMetrics,
                    roundAnalytics: analytics.roundAnalytics,
                    performanceTrend: analytics.performanceTrend,
                    deviceInfo: analytics.deviceInfo,
                },
                // The written report (narrative / strengths / gaps / study plan) so a
                // past report opened from the dashboard shows the same as a fresh one.
                report: insight ? {
                    narrativeSummary: insight.narrativeSummary || '',
                    strengths: insight.strengths || [],
                    weaknesses: insight.weaknesses || [],
                    skillGapsVsJd: insight.skillGapsVsJd || [],
                    actionableStudyPlan: insight.actionableStudyPlan || [],
                    overallGrade: analytics.finalGrade,
                } : null,
                roundDetails: roundDetails.map(r => ({
                    roundType: r.roundType,
                    status: r.status,
                    roundScore: r.roundScore,
                    questionsCount: r.questionsEvaluations?.length || 0,
                })),
            },
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getCollegeProctorRiskDashboard = async (req, res) => {
    try {
        const organizationId = req.user.id;
        const { days = 30 } = req.query;

        const [riskDistribution, highRiskSessions, disqualifiedCount, recentViolations] = await Promise.all([
            ProctorRiskReport.getRiskDistributionByOrg(organizationId, parseInt(days)),
            ProctorRiskReport.find({ 
                organization: organizationId, 
                cumulativeRiskScore: { $gte: 70 },
                createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
            }).populate('student', 'name email').sort({ createdAt: -1 }).limit(20),
            ProctorRiskReport.countDocuments({ 
                organization: organizationId, 
                isDisqualified: true,
                createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
            }),
            ProctorRiskReport.aggregate([
                { $match: { 
                    organization: new mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
                }},
                { $unwind: '$violationTimeline' },
                { $sort: { 'violationTimeline.timestamp': -1 } },
                { $limit: 50 },
                { $project: {
                    _id: 0,
                    timestamp: '$violationTimeline.timestamp',
                    violationType: '$violationTimeline.violationType',
                    roundType: '$violationTimeline.roundType',
                    severityWeight: '$violationTimeline.severityWeight',
                    snapshotUrl: '$violationTimeline.snapshotUrl'
                }}
            ])
        ]);

        const dashboard = await ProctorRiskReport.getCollegeRiskDashboard(organizationId, parseInt(days));

        return res.status(200).json({
            success: true,
            message: 'Proctoring risk dashboard fetched successfully.',
            data: {
                summary: {
                    totalSessions: dashboard.summary?.[0]?.totalSessions || 0,
                    averageRiskScore: Math.round(dashboard.summary?.[0]?.averageRiskScore || 0),
                    disqualifiedCount: dashboard.summary?.[0]?.disqualifiedCount || 0,
                    highRiskCount: dashboard.summary?.[0]?.highRiskCount || 0,
                    lowRiskCount: dashboard.summary?.[0]?.lowRiskCount || 0
                },
                riskDistribution,
                dailyTrend: dashboard.dailyTrend || [],
                topViolationTypes: dashboard.violationTypes || [],
                highRiskSessions: highRiskSessions.map(s => ({
                    id: s._id,
                    student: s.student,
                    cumulativeRiskScore: s.cumulativeRiskScore,
                    riskLevel: s.riskLevel,
                    isDisqualified: s.isDisqualified,
                    violationCount: s.roundViolations?.reduce((acc, r) => acc + r.violations?.length || 0, 0) || 0
                })),
                recentViolations
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getStudentProctorRiskReport = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { page, limit, skip } = buildPagination(req.query);

        const riskReports = await ProctorRiskReport.find({ student: studentId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('session', 'targetRole jobDescription')
            .lean();

        const total = await ProctorRiskReport.countDocuments({ student: studentId });

        const summary = await ProctorRiskReport.aggregate([
            { $match: { student: new mongoose.Types.ObjectId(studentId) } },
            { $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                averageRiskScore: { $avg: '$cumulativeRiskScore' },
                disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                riskLevelDistribution: {
                    $push: {
                        k: '$riskLevel',
                        v: 1
                    }
                }
            }}
        ]);

        return res.status(200).json({
            success: true,
            message: 'Student proctor risk report fetched successfully.',
            data: {
                reports: riskReports.map(r => ({
                    id: r._id,
                    sessionId: r.session,
                    cumulativeRiskScore: r.cumulativeRiskScore,
                    riskLevel: r.riskLevel,
                    isDisqualified: r.isDisqualified,
                    disqualificationReason: r.disqualificationReason,
                    roundViolations: r.roundViolations,
                    detectionSummary: r.detectionSummary,
                    evaluatedAt: r.evaluatedAt
                })),
                summary: summary[0] ? {
                    totalSessions: summary[0].totalSessions,
                    averageRiskScore: Math.round(summary[0].averageRiskScore || 0),
                    disqualifiedCount: summary[0].disqualifiedCount || 0
                } : { totalSessions: 0, averageRiskScore: 0, disqualifiedCount: 0 }
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getSuperAdminAnalyticsOverview = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const [interviewStats, proctorStats, violationStats] = await Promise.all([
            InterviewAnalytics.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    completedSessions: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
                    averageScore: { $avg: '$overallScore' },
                    averageRiskScore: { $avg: '$proctoringRiskScore' },
                    disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                    gradeDistribution: {
                        $push: { k: '$finalGrade', v: 1 }
                    }
                }}
            ]),
            ProctorRiskReport.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $group: {
                    _id: null,
                    totalReports: { $sum: 1 },
                    criticalRiskCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] } },
                    highRiskCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } },
                    disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                    averageRiskScore: { $avg: '$cumulativeRiskScore' }
                }}
            ]),
            ProctorRiskReport.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $unwind: '$roundViolations' },
                { $unwind: '$roundViolations.violations' },
                { $group: {
                    _id: '$roundViolations.violations.violationType',
                    count: { $sum: 1 }
                }},
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const trendData = await InterviewAnalytics.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                sessions: { $sum: 1 },
                averageScore: { $avg: '$overallScore' },
                averageRisk: { $avg: '$proctoringRiskScore' }
            }},
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Super admin analytics overview fetched successfully.',
            data: {
                interviewStats: interviewStats[0] ? {
                    totalSessions: interviewStats[0].totalSessions,
                    completedSessions: interviewStats[0].completedSessions,
                    averageScore: Math.round(interviewStats[0].averageScore || 0),
                    averageRiskScore: Math.round(interviewStats[0].averageRiskScore || 0),
                    disqualifiedCount: interviewStats[0].disqualifiedCount || 0
                } : { totalSessions: 0, completedSessions: 0, averageScore: 0, averageRiskScore: 0, disqualifiedCount: 0 },
                proctorStats: proctorStats[0] ? {
                    totalReports: proctorStats[0].totalReports,
                    criticalRiskCount: proctorStats[0].criticalRiskCount || 0,
                    highRiskCount: proctorStats[0].highRiskCount || 0,
                    disqualifiedCount: proctorStats[0].disqualifiedCount || 0,
                    averageRiskScore: Math.round(proctorStats[0].averageRiskScore || 0)
                } : { totalReports: 0, criticalRiskCount: 0, highRiskCount: 0, disqualifiedCount: 0, averageRiskScore: 0 },
                topViolationTypes: violationStats,
                trendData: trendData.map(d => ({
                    date: d._id,
                    sessions: d.sessions,
                    averageScore: Math.round(d.averageScore || 0),
                    averageRisk: Math.round(d.averageRisk || 0)
                }))
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getStudentActivityTimeline = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { page, limit, skip } = buildPagination(req.query);
        const { action, resourceType, from, to } = req.query;

        const auditQuery = { user: studentId, userRole: 'student' };
        if (action) auditQuery.action = action;
        if (resourceType) auditQuery.resourceType = resourceType;
        if (from || to) {
            auditQuery.timestamp = {};
            if (from) auditQuery.timestamp.$gte = new Date(from);
            if (to) auditQuery.timestamp.$lte = new Date(to);
        }

        const logs = await AuditLog.find(auditQuery)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email')
            .lean();

        const total = await AuditLog.countDocuments(auditQuery);

        return res.status(200).json({
            success: true,
            message: 'Student activity timeline fetched successfully.',
            data: {
                timeline: logs.map(log => ({
                    id: log._id,
                    action: log.action,
                    resourceType: log.resourceType,
                    timestamp: log.timestamp,
                    endpoint: log.endpoint,
                    method: log.method,
                    statusCode: log.statusCode,
                    status: log.status,
                    ipAddress: log.ipAddress,
                    details: log.details,
                    errorMessage: log.errorMessage
                }))
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getCollegeAdminActivityTimeline = async (req, res) => {
    try {
        const organizationName = req.user.organization;
        const { page, limit, skip } = buildPagination(req.query);
        const { action, resourceType, studentId, from, to } = req.query;

        const students = await User.find({ 
            role: 'student', 
            organization: organizationName 
        }).select('_id');
        const studentIds = students.map(s => s._id);

        const auditQuery = {
            $or: [
                { user: req.user.id },
                { user: { $in: studentIds } }
            ]
        };

        if (action) auditQuery.action = action;
        if (resourceType) auditQuery.resourceType = resourceType;
        if (studentId) auditQuery.user = studentId;
        if (from || to) {
            auditQuery.timestamp = {};
            if (from) auditQuery.timestamp.$gte = new Date(from);
            if (to) auditQuery.timestamp.$lte = new Date(to);
        }

        const logs = await AuditLog.find(auditQuery)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email role organization')
            .lean();

        const total = await AuditLog.countDocuments(auditQuery);

        const actionCounts = await AuditLog.aggregate([
            { $match: { $or: [
                { user: req.user.id },
                { user: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) } }
            ] }},
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'College admin activity timeline fetched successfully.',
            data: {
                timeline: logs.map(log => ({
                    id: log._id,
                    action: log.action,
                    userRole: log.userRole,
                    user: log.user,
                    resourceType: log.resourceType,
                    timestamp: log.timestamp,
                    endpoint: log.endpoint,
                    method: log.method,
                    statusCode: log.statusCode,
                    status: log.status,
                    ipAddress: log.ipAddress,
                    details: log.details,
                    errorMessage: log.errorMessage
                })),
                actionDistribution: actionCounts
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getSuperAdminActivityTimeline = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const { action, resourceType, userRole, userId, organizationId, from, to } = req.query;

        const auditQuery = {};
        if (action) auditQuery.action = action;
        if (resourceType) auditQuery.resourceType = resourceType;
        if (userRole) auditQuery.userRole = userRole;
        if (userId) auditQuery.user = userId;
        if (organizationId) auditQuery['user.organization'] = organizationId;
        if (from || to) {
            auditQuery.timestamp = {};
            if (from) auditQuery.timestamp.$gte = new Date(from);
            if (to) auditQuery.timestamp.$lte = new Date(to);
        }

        const logs = await AuditLog.find(auditQuery)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email role organization status')
            .lean();

        const total = await AuditLog.countDocuments(auditQuery);

        const [actionCounts, roleDistribution, hourlyActivity] = await Promise.all([
            AuditLog.aggregate([
                { $match: auditQuery },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.aggregate([
                { $match: auditQuery },
                { $group: { _id: '$userRole', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog.aggregate([
                { $match: { ...auditQuery, timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
                { $group: { 
                    _id: { $hour: '$timestamp' }, 
                    count: { $sum: 1 },
                    failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } }
                }},
                { $sort: { _id: 1 } }
            ])
        ]);

        return res.status(200).json({
            success: true,
            message: 'Super admin activity timeline fetched successfully.',
            data: {
                timeline: logs.map(log => ({
                    id: log._id,
                    action: log.action,
                    userRole: log.userRole,
                    userEmail: log.userEmail,
                    user: log.user,
                    resourceType: log.resourceType,
                    timestamp: log.timestamp,
                    endpoint: log.endpoint,
                    method: log.method,
                    statusCode: log.statusCode,
                    status: log.status,
                    ipAddress: log.ipAddress,
                    userAgent: log.userAgent,
                    details: log.details,
                    errorMessage: log.errorMessage,
                    hasSensitiveData: log.hasSensitiveData
                })),
                actionDistribution: actionCounts,
                roleDistribution,
                hourlyActivity: hourlyActivity.map(h => ({
                    hour: h._id,
                    total: h.count,
                    failures: h.failures
                }))
            },
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getRiskTrendByCollege = async (req, res) => {
    try {
        const { page, limit, skip } = buildPagination(req.query);
        const { days = 30, riskLevel } = req.query;

        const matchQuery = {
            createdAt: { $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000) }
        };
        if (riskLevel) matchQuery.riskLevel = riskLevel;

        const [colleges, total] = await Promise.all([
            ProctorRiskReport.aggregate([
                { $match: matchQuery },
                { $group: {
                    _id: '$organization',
                    totalSessions: { $sum: 1 },
                    averageRiskScore: { $avg: '$cumulativeRiskScore' },
                    disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                    criticalCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] } },
                    highCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } }
                }},
                { $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'collegeAdmin'
                }},
                { $project: {
                    _id: 0,
                    organizationId: '$_id',
                    organizationName: { $arrayElemAt: ['$collegeAdmin.organization', 0] },
                    totalSessions: 1,
                    averageRiskScore: { $round: ['$averageRiskScore'] },
                    disqualifiedCount: 1,
                    criticalCount: 1,
                    highCount: 1
                }},
                { $sort: { averageRiskScore: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]),
            ProctorRiskReport.countDocuments(matchQuery)
        ]);

        return res.status(200).json({
            success: true,
            message: 'Risk trend by college fetched successfully.',
            data: colleges.map(c => ({
                organizationId: c.organizationId,
                organizationName: c.organizationName || 'Unknown',
                totalSessions: c.totalSessions,
                averageRiskScore: c.averageRiskScore || 0,
                disqualifiedCount: c.disqualifiedCount || 0,
                criticalCount: c.criticalCount || 0,
                highCount: c.highCount || 0
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getViolationAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const [violationPatterns, roundDistribution, timeDistribution] = await Promise.all([
            ProctorRiskReport.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $unwind: '$roundViolations' },
                { $unwind: '$roundViolations.violations' },
                { $group: {
                    _id: '$roundViolations.violations.violationType',
                    count: { $sum: 1 },
                    totalWeight: { $sum: '$roundViolations.violations.totalWeight' },
                    avgWeight: { $avg: '$roundViolations.violations.totalWeight' }
                }},
                { $sort: { count: -1 } }
            ]),
            ProctorRiskReport.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $unwind: '$roundViolations' },
                { $group: {
                    _id: '$roundViolations.roundType',
                    violationCount: { $sum: { $size: '$roundViolations.violations' } }
                }}
            ]),
            ProctorRiskReport.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $unwind: '$violationTimeline' },
                { $group: {
                    _id: { $hour: '$violationTimeline.timestamp' },
                    violationCount: { $sum: 1 }
                }},
                { $sort: { _id: 1 } }
            ])
        ]);

        return res.status(200).json({
            success: true,
            message: 'Violation analytics fetched successfully.',
            data: {
                violationPatterns: violationPatterns.map(v => ({
                    violationType: v._id,
                    count: v.count,
                    totalWeight: v.totalWeight,
                    averageWeight: Math.round(v.avgWeight || 0)
                })),
                roundDistribution: roundDistribution.map(r => ({
                    roundType: r._id,
                    violationCount: r.violationCount
                })),
                timeDistribution: timeDistribution.map(t => ({
                    hour: t._id,
                    violationCount: t.violationCount
                }))
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

const getInterviewPerformanceHeatmap = async (req, res) => {
    try {
        const { days = 90 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const heatmapData = await InterviewSession.aggregate([
            { $match: { startedAt: { $gte: startDate } } },
            { $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
                    hour: { $hour: '$startedAt' }
                },
                sessionCount: { $sum: 1 },
                averageScore: { $avg: '$finalCompositeScore' },
                completionRate: { 
                    $avg: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } 
                }
            }},
            { $sort: { '_id.date': 1, '_id.hour': 1 } }
        ]);

        const dayOfWeekData = await InterviewSession.aggregate([
            { $match: { startedAt: { $gte: startDate } } },
            { $group: {
                _id: { $dayOfWeek: '$startedAt' },
                sessionCount: { $sum: 1 },
                averageScore: { $avg: '$finalCompositeScore' },
                completionRate: { 
                    $avg: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } 
                }
            }},
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Interview performance heatmap fetched successfully.',
            data: {
                heatmap: heatmapData.map(h => ({
                    date: h._id.date,
                    hour: h._id.hour,
                    sessionCount: h.sessionCount,
                    averageScore: Math.round(h.averageScore || 0),
                    completionRate: Math.round(h.completionRate * 100 || 0)
                })),
                dayOfWeekHeatmap: dayOfWeekData.map(d => ({
                    dayOfWeek: d._id,
                    dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d._id - 1],
                    sessionCount: d.sessionCount,
                    averageScore: Math.round(d.averageScore || 0),
                    completionRate: Math.round(d.completionRate * 100 || 0)
                }))
            }
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

module.exports = {
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
};