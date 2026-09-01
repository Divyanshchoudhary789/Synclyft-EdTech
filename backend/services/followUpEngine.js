const mongoose = require('mongoose');
const FollowUpSchedule = require('../models/FollowUpScheduleModel');
const Notification = require('../models/NotificationModel');
const NotificationService = require('../services/notificationService');
const Campaign = require('../models/CampaignModel');
const User = require('../models/userModel');
const PlacementBatch = require('../models/PlacementBatchModel');
const { getIO } = require('../config/socket');
const EmailQueue = require('../models/EmailQueueModel');
const logger = require('./loggerService');

const createFollowUp = async (followUpData) => {
    const schedule = await FollowUpSchedule.create(followUpData);
    return schedule;
};

const sendFollowUpNotification = async (schedule) => {
    if (schedule.status !== 'pending') return schedule;

    const recipientIds = [];

    if (schedule.targetType === 'student' && schedule.student) {
        recipientIds.push(schedule.student);
    } else if (schedule.targetType === 'batch' && schedule.batch) {
        const batch = await PlacementBatch.findOne({ _id: schedule.batch, organization: schedule.organization });
        if (batch) {
            batch.students.filter(s => s.status === 'active').forEach(s => recipientIds.push(s.student));
        }
    } else if (schedule.targetType === 'campaign' && schedule.campaign) {
        const campaign = await Campaign.findOne({ _id: schedule.campaign, creator: schedule.organization });
        if (campaign && campaign.assignedBatches) {
            for (const assignment of campaign.assignedBatches.filter(a => a.status === 'active')) {
                const batch = await PlacementBatch.findOne({ _id: assignment.batch, organization: schedule.organization });
                if (batch) {
                    batch.students.filter(s => s.status === 'active').forEach(s => recipientIds.push(s.student));
                }
            }
        }
    }

    if (recipientIds.length === 0) {
        await FollowUpSchedule.findByIdAndUpdate(schedule._id, { status: 'skipped' });
        return schedule;
    }

    const uniqueIds = [...new Set(recipientIds.map(id => id.toString()))];

    if (schedule.channels.inApp) {
        const notifications = uniqueIds.map(recipientId => ({
            recipient: recipientId,
            recipientRole: schedule.recipientRole || 'student',
            type: schedule.followUpType,
            title: schedule.title,
            message: schedule.message,
            description: schedule.description,
            actionUrl: schedule.actionUrl,
            actionText: schedule.actionText,
            priority: 'normal',
            channels: { inApp: true }
        }));

        try {
            await Notification.insertMany(notifications);
            const io = getIO();
            uniqueIds.forEach(recipientId => {
                io.to(recipientId).emit('NEW_NOTIFICATION', {
                    success: true,
                    notification: {
                        title: schedule.title,
                        message: schedule.message,
                        notificationType: schedule.followUpType,
                        actionUrl: schedule.actionUrl,
                        actionText: schedule.actionText,
                        createdAt: new Date()
                    }
                });
            });
        } catch (err) {
            logger.error('Follow-up in-app notification failed:', err);
        }
    }

    if (schedule.channels.email) {
        const users = await User.find({ _id: { $in: uniqueIds } }).select('name email organization');
        const emails = users.map(user => ({
            to: user.email,
            subject: schedule.title,
            html: buildEmailHtml(schedule, user),
            text: `${schedule.message}${schedule.description ? '\n\n' + schedule.description : ''}`,
            type: schedule.followUpType,
            priority: 'normal',
            recipientId: user._id,
            recipientName: user.name,
            recipientRole: 'student',
            metadata: { followUpScheduleId: schedule._id }
        }));

        try {
            await EmailQueue.insertMany(emails);
        } catch (err) {
            logger.error('Follow-up email queue failed:', err);
        }
    }

    await FollowUpSchedule.findByIdAndUpdate(schedule._id, {
        status: 'sent',
        sentAt: new Date(),
        metadata: { ...schedule.metadata, recipientCount: uniqueIds.length }
    });

    return schedule;
};

const buildEmailHtml = (schedule, user) => {
    const year = new Date().getFullYear();
    const styles = `
        font-family: Arial, sans-serif; max-width: 620px; margin: auto; padding: 24px;
        border: 1px solid #e5e7eb; border-radius: 12px; background: #fff;
    `;
    const renderButton = (url, text) => `
        <div style="margin: 28px 0; text-align: center;">
            <a href="${url}" style="background-color: #031677; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: bold;">
                ${text}
            </a>
        </div>
    `;
    const footer = `
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
        <p style="font-size: 13px; color: #666;">You received this email from Synclyft.</p>
        <p style="font-size: 12px; color: #999;">&copy; ${year} Synclyft. All rights reserved.</p>
    `;

    return `
        <div style="${styles}">
            <h2 style="color: #031677; margin-top: 0;">${schedule.title}</h2>
            <p style="font-size: 15px; color: #222; line-height: 1.6;">Hello ${user.name || 'there'},</p>
            <p style="font-size: 15px; color: #222; line-height: 1.6;">${schedule.message}</p>
            ${schedule.description ? `<p style="font-size: 14px; color: #555; line-height: 1.6;">${schedule.description}</p>` : ''}
            ${schedule.actionUrl ? renderButton(schedule.actionUrl, schedule.actionText || 'View') : ''}
            ${footer}
        </div>
    `;
};

const processPendingFollowUps = async () => {
    const now = new Date();
    const pendingSchedules = await FollowUpSchedule.find({
        status: 'pending',
        scheduleDate: { $lte: now }
    }).limit(500);

    const results = [];
    for (const schedule of pendingSchedules) {
        try {
            const result = await sendFollowUpNotification(schedule);
            results.push({ id: schedule._id, status: result.status, title: schedule.title });
        } catch (err) {
            logger.error(`Follow-up processing failed for ${schedule._id}: ${err.message}`);
            results.push({ id: schedule._id, status: 'error', error: err.message });
        }
    }

    return results;
};

const getFollowUpStats = async (organizationId) => {
    const now = new Date();
    const stats = await FollowUpSchedule.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(organizationId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const upcoming = await FollowUpSchedule.countDocuments({
        organization: organizationId,
        status: 'pending',
        scheduleDate: { $gte: now }
    });

    return {
        byStatus: stats.reduce((acc, curr) => { acc[curr._id] = curr.count; return acc; }, {}),
        upcoming
    };
};

module.exports = {
    createFollowUp,
    sendFollowUpNotification,
    processPendingFollowUps,
    getFollowUpStats
};
