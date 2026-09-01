const mongoose = require('mongoose');
const User = require('../models/userModel.js');
const StudentProfile = require('../models/StudentProfileModel.js');
const InterviewSession = require('../models/InterviewSessionModel.js');
const InterviewAnalytics = require('../models/InterviewAnalyticsModel.js');
const PerformanceInsight = require('../models/PerformanceInsightModel.js');
const ProctorRiskReport = require('../models/ProctorRiskReportModel.js');
const Notification = require('../models/NotificationModel.js');
const NotificationService = require('../services/notificationService');
const sendError = require('../utils/sendError.js');
const logger = require('../services/loggerService.js');

const getDashboard = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const profile = await StudentProfile.findOne({ user: user._id }).populate('user', 'name email role organization status isEmailVerified');
  const [recentSessions, recentInsights, unreadCount] = await Promise.all([
    InterviewSession.find({ student: user._id }).sort({ createdAt: -1 }).limit(5),
    PerformanceInsight.find({ student: user._id }).sort({ createdAt: -1 }).limit(5),
    Notification.countDocuments({ recipient: user._id, status: 'unread' })
  ]);

  const codingProfiles = user.codingProfiles || {};
  const verifiedPlatforms = Object.entries(codingProfiles)
    .filter(([, platform]) => platform?.isVerified)
    .map(([platform]) => platform);

  return res.status(200).json({
    success: true,
    message: 'Student dashboard fetched successfully.',
    data: {
      user,
      profile,
      recentSessions,
      recentInsights,
      unreadNotifications: unreadCount,
      verifiedPlatforms,
      codingProfiles,
      trials: user.trials || null
    }
  });
};

const getProgress = async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user.id }).populate('user', 'name email role organization status isEmailVerified codingProfiles');
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Student profile not found.' });
  }

  const [sessionCount, completedCount, insightCount, unreadCount] = await Promise.all([
    InterviewSession.countDocuments({ student: req.user.id }),
    InterviewSession.countDocuments({ student: req.user.id, status: 'completed' }),
    PerformanceInsight.countDocuments({ student: req.user.id }),
    Notification.countDocuments({ recipient: req.user.id, status: 'unread' })
  ]);

  const codingProfiles = profile.user.codingProfiles || {};
  const verifiedPlatforms = Object.values(codingProfiles).filter(platform => platform?.isVerified).length;

  return res.status(200).json({
    success: true,
    message: 'Progress summary fetched successfully.',
    data: {
      placementReadinessScore: profile.placementReadinessScore,
      sessionCount,
      completedCount,
      insightCount,
      unreadNotifications: unreadCount,
      verifiedPlatforms,
      profile
    }
  });
};

const getNotifications = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const result = await NotificationService.getUserNotifications(req.user.id, { status: req.query.status || 'all', type: req.query.type }, { page, limit });

  return res.status(200).json({
    success: true,
    message: 'Notifications fetched successfully.',
    ...result
  });
};

const getStudentAnalyticsDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { days = 90 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [sessions, analytics, riskReports, insights] = await Promise.all([
      InterviewSession.find({ student: studentId }).sort({ createdAt: -1 }).limit(20),
      InterviewAnalytics.getStudentAnalyticsSummary(studentId, parseInt(days)),
      ProctorRiskReport.countDocuments({ student: studentId, createdAt: { $gte: startDate } }),
      PerformanceInsight.countDocuments({ student: studentId })
    ]);

    const completedSessions = sessions.filter(s => s.status === 'completed');
    const averageScore = completedSessions.length ? 
      Math.round(completedSessions.reduce((sum, s) => sum + (s.finalCompositeScore || 0), 0) / completedSessions.length) : 0;

    const performanceTrend = await InterviewAnalytics.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId), completedAt: { $ne: null } } },
      { $sort: { completedAt: 1 } },
      { $project: { _id: 0, score: '$overallScore', roundType: { $arrayElemAt: ['$roundAnalytics.roundType', 0] }, timestamp: '$completedAt' } }
    ]);

    return res.status(200).json({
      success: true,
      message: 'Student analytics dashboard fetched successfully.',
      data: {
        summary: {
          totalSessions: analytics.totalSessions || 0,
          completedSessions: analytics.totalSessions || 0,
          averageScore: analytics.averageScore || 0,
          averageRiskScore: analytics.averageRiskScore || 0,
          disqualifiedSessions: analytics.totalDisqualified || 0,
          insightsCount: insights
        },
        performanceTrend: performanceTrend.map(t => ({
          date: t.timestamp,
          score: t.score,
          roundType: t.roundType
        })),
        recentSessions: sessions.slice(0, 10).map(s => ({
          id: s._id,
          targetRole: s.targetRole,
          status: s.status,
          finalCompositeScore: s.finalCompositeScore,
          finalGrade: s.finalGrade,
          proctoringRiskScore: s.proctoringRiskScore,
          startedAt: s.startedAt,
          completedAt: s.completedAt
        }))
      }
    });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};

module.exports = {
  getDashboard,
  getProgress,
  getNotifications,
  getStudentAnalyticsDashboard
};