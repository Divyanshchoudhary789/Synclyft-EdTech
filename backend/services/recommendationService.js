const mongoose = require('mongoose');
const WorkshopRecommendation = require('../models/WorkshopRecommendationModel');
const RecommendationAssignment = require('../models/RecommendationAssignmentModel');
const User = require('../models/userModel');
const PlacementBatch = require('../models/PlacementBatchModel');
const Notification = require('../models/NotificationModel');
const NotificationService = require('../services/notificationService');
const EmailQueue = require('../models/EmailQueueModel');
const AuditLog = require('../models/AuditLogModel');
const { getIO } = require('../config/socket');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const createRecommendation = async (data, creatorId) => {
    const recommendation = await WorkshopRecommendation.create({
        ...data,
        createdBy: creatorId,
        isAdminCreated: true,
        organization: data.organization,
        metadata: {
            ...data.metadata,
            generatedBy: 'admin'
        }
    });

    await AuditLog.logAction({
        user: creatorId,
        userEmail: (await User.findById(creatorId))?.email || 'system',
        userRole: 'college-admin',
        action: 'ADMIN_ACTION',
        resourceType: 'organization',
        resourceId: recommendation._id,
        statusCode: 201,
        details: { title: recommendation.title, type: recommendation.recommendationType }
    });

    return recommendation;
};

const updateRecommendation = async (recommendationId, organizationId, updates) => {
    const recommendation = await WorkshopRecommendation.findOne({ _id: recommendationId, organization: organizationId });
    if (!recommendation) return null;

    const allowedFields = [
        'title', 'description', 'recommendationType', 'targetAudience', 'priority',
        'estimatedImpact', 'reason', 'skillGaps', 'affectedStudentCount', 'isActive',
        'expiresAt', 'externalUrl', 'externalPlatform', 'tags'
    ];

    let changed = false;
    allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
            recommendation[field] = updates[field];
            changed = true;
        }
    });

    if (changed) {
        await recommendation.save();
    }

    return recommendation;
};

const deleteRecommendation = async (recommendationId, organizationId) => {
    const recommendation = await WorkshopRecommendation.findOne({ _id: recommendationId, organization: organizationId });
    if (!recommendation) return null;

    await RecommendationAssignment.deleteMany({ recommendation: recommendationId, organization: organizationId });
    await recommendation.deleteOne();

    return recommendation;
};

const listRecommendations = async (organizationId, query = {}) => {
    const { page = 1, limit = 20, isActive = 'all', type = 'all', priority = 'all' } = query;

    const filter = { organization: organizationId };
    if (isActive !== 'all') filter.isActive = isActive === 'true';
    if (type !== 'all') filter.recommendationType = type;
    if (priority !== 'all') filter.priority = priority;

    const total = await WorkshopRecommendation.countDocuments(filter);
    const recommendations = await WorkshopRecommendation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    return {
        recommendations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

const assignRecommendationToBatch = async (recommendationId, organizationId, batchId, assignedBy, options = {}) => {
    const recommendation = await WorkshopRecommendation.findOne({ _id: recommendationId, organization: organizationId });
    if (!recommendation) return { success: false, message: 'Recommendation not found' };

    const batch = await PlacementBatch.findOne({ _id: batchId, organization: organizationId });
    if (!batch) return { success: false, message: 'Batch not found' };

    const existing = await RecommendationAssignment.findOne({
        recommendation: recommendationId,
        targetBatch: batchId,
        targetType: 'batch',
        organization: organizationId
    });

    if (existing) {
        existing.isActive = true;
        existing.deadline = options.deadline || existing.deadline;
        await existing.save();
        return { success: true, data: existing, message: 'Assignment reactivated' };
    }

    const assignment = await RecommendationAssignment.create({
        organization: organizationId,
        recommendation: recommendationId,
        targetType: 'batch',
        targetBatch: batchId,
        assignedBy,
        deadline: options.deadline || null,
        isActive: true
    });

    if (options.notifyStudents !== false) {
        const activeStudents = batch.students.filter(s => s.status === 'active').map(s => s.student);
        if (activeStudents.length > 0) {
            await Notification.sendBulkNotification(activeStudents, {
                recipientRole: 'student',
                type: NOTIFICATION_TYPES.RECOMMENDATION_ASSIGNED,
                title: `New recommendation assigned: ${recommendation.title}`,
                message: `A new recommendation "${recommendation.title}" has been assigned to your batch by your placement officer.`,
                description: recommendation.description,
                actionUrl: '/student/recommendations',
                actionText: 'View recommendation',
                relatedEntity: { type: 'recommendation', entityId: recommendationId },
                priority: 'normal'
            });
        }

        assignment.notificationSent = true;
        assignment.notificationSentAt = new Date();
        await assignment.save();
    }

    return { success: true, data: assignment, message: 'Recommendation assigned to batch successfully' };
};

const assignRecommendationToStudent = async (recommendationId, organizationId, studentId, assignedBy, options = {}) => {
    const recommendation = await WorkshopRecommendation.findOne({ _id: recommendationId, organization: organizationId });
    if (!recommendation) return { success: false, message: 'Recommendation not found' };

    const orgUser = await User.findById(organizationId);
    if (!orgUser) return { success: false, message: 'Organization not found' };

    const student = await User.findOne({
        _id: studentId,
        role: 'student',
        organization: { $regex: new RegExp(`^${orgUser.organization.trim()}$`, 'i') }
    });
    if (!student) return { success: false, message: 'Student not found' };

    const existing = await RecommendationAssignment.findOne({
        recommendation: recommendationId,
        targetStudent: studentId,
        targetType: 'student',
        organization: organizationId
    });

    if (existing) {
        existing.isActive = true;
        existing.deadline = options.deadline || existing.deadline;
        await existing.save();
        return { success: true, data: existing, message: 'Assignment reactivated' };
    }

    const assignment = await RecommendationAssignment.create({
        organization: organizationId,
        recommendation: recommendationId,
        targetType: 'student',
        targetStudent: studentId,
        assignedBy,
        deadline: options.deadline || null,
        isActive: true
    });

    if (options.notifyStudent !== false) {
        await Notification.createNotification({
            recipient: studentId,
            recipientRole: 'student',
            type: NOTIFICATION_TYPES.RECOMMENDATION_ASSIGNED,
            title: `New recommendation assigned: ${recommendation.title}`,
            message: `A new recommendation "${recommendation.title}" has been assigned to you by your placement officer.`,
            description: recommendation.description,
            actionUrl: '/student/recommendations',
            actionText: 'View recommendation',
            priority: 'normal'
        });

        assignment.notificationSent = true;
        assignment.notificationSentAt = new Date();
        await assignment.save();
    }

    return { success: true, data: assignment, message: 'Recommendation assigned to student successfully' };
};

const getRecommendationAssignments = async (organizationId, query = {}) => {
    const { page = 1, limit = 20, targetType = 'all', recommendationId = null } = query;

    const filter = { organization: organizationId };
    if (targetType !== 'all') filter.targetType = targetType;
    if (recommendationId) filter.recommendation = recommendationId;

    const total = await RecommendationAssignment.countDocuments(filter);
    const assignments = await RecommendationAssignment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('recommendation', 'title description recommendationType externalUrl externalPlatform isActive')
        .populate('targetBatch', 'batchName batchCode graduationYear department status')
        .populate('targetStudent', 'name email role organization status')
        .populate('assignedBy', 'name email');

    return {
        assignments,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = {
    createRecommendation,
    updateRecommendation,
    deleteRecommendation,
    listRecommendations,
    assignRecommendationToBatch,
    assignRecommendationToStudent,
    getRecommendationAssignments
};
