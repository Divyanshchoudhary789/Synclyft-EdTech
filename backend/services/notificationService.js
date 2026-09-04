const Notification = require('../models/NotificationModel');
const NotificationPreference = require('../models/NotificationPreferenceModel');
const User = require('../models/userModel');
const { getIO } = require('../config/socket');
const { sendNotificationEmail } = require('./emailService');
const { NOTIFICATION_TYPES } = require('../utils/constants');
const logger = require('./loggerService');

class NotificationService {
  static async getOrCreatePreference(userId) {
    let pref = await NotificationPreference.findOne({ user: userId });
    if (!pref) {
      try {
        pref = await NotificationPreference.create({ user: userId });
      } catch (err) {
        if (err.code === 11000) {
          pref = await NotificationPreference.findOne({ user: userId });
        } else {
          throw err;
        }
      }
    }
    return pref;
  }

  static async dispatch(notificationData) {
    const {
      recipient,
      recipientRole,
      type,
      title,
      message,
      description,
      actionUrl,
      actionText,
      priority = 'normal',
      relatedEntity,
      channels,
      metadata,
      extraContext
    } = notificationData;

    if (!recipient || !type || !title || !message) {
      throw new Error('Missing required notification fields: recipient, type, title, message');
    }

    const pref = await this.getOrCreatePreference(recipient);
    const eventPref = pref.eventPreferences[type] || { inApp: true, email: false };
    const sendInApp = (channels?.inApp ?? eventPref.inApp ?? pref.globalChannels.inApp);
    const sendEmail = (channels?.email ?? eventPref.email ?? pref.globalChannels.email);

    let notificationRecord = null;
    let inAppSent = false;
    let emailSent = false;
    let emailFailed = false;
    let emailFailureReason = null;

    if (sendInApp) {
      try {
        notificationRecord = await Notification.createNotification({
          recipient,
          recipientRole,
          type,
          title,
          message,
          description,
          actionUrl,
          actionText,
          priority,
          relatedEntity,
          channels: { inApp: true, email: false },
          metadata
        });

        const io = getIO();
        io.to(recipient.toString()).emit('NEW_NOTIFICATION', {
          success: true,
          notification: {
            _id: notificationRecord._id,
            title: notificationRecord.title,
            message: notificationRecord.message,
            notificationType: notificationRecord.type,
            actionUrl: notificationRecord.actionUrl,
            actionText: notificationRecord.actionText,
            isRead: notificationRecord.status === 'read',
            createdAt: notificationRecord.createdAt
          }
        });
        inAppSent = true;
      } catch (inAppErr) {
        logger.error('In-app notification dispatch failed:', inAppErr);
      }
    }

    if (sendEmail) {
      try {
        const user = extraContext?.user || await User.findById(recipient).select('name email organization');
        if (user && user.email) {
          if (type === NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'subscription_expiring',
              message,
              description,
              actionUrl: actionUrl || '/subscription',
              actionText: actionText || 'View Subscription',
              priority
            });
          } else if (type === NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'subscription_expired',
              message,
              description,
              actionUrl: actionUrl || '/subscription',
              actionText: actionText || 'Renew Subscription',
              priority: 'urgent'
            });
          } else if (type === NOTIFICATION_TYPES.PAYMENT_DUE || type === NOTIFICATION_TYPES.PAYMENT_REMINDER) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'payment_reminder',
              message,
              description,
              actionUrl: actionUrl || '/billing',
              actionText: actionText || 'Pay Now',
              priority: type === NOTIFICATION_TYPES.PAYMENT_DUE ? 'high' : 'urgent'
            });
          } else if (type === NOTIFICATION_TYPES.SEAT_ALLOCATED || type === NOTIFICATION_TYPES.SEAT_RELEASED) {
            await sendNotificationEmail(user.email, user.name, {
              type,
              message,
              description,
              actionUrl: actionUrl || '/dashboard',
              actionText: actionText || 'View Dashboard',
              priority
            });
          } else if (type === NOTIFICATION_TYPES.INTERVIEW_COMPLETED) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'interview_completed',
              message,
              description,
              actionUrl: actionUrl || '/interview/report',
              actionText: actionText || 'View Result',
              priority
            });
          } else if (type === NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'achievement_unlocked',
              message,
              description,
              actionUrl: actionUrl || '/progress',
              actionText: actionText || 'View Achievement',
              priority
            });
          } else if (type === NOTIFICATION_TYPES.INTERVIEW_SCHEDULED) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'interview_scheduled',
              message,
              description,
              actionUrl: actionUrl || '/dashboard',
              actionText: actionText || 'View Interview',
              priority
            });
          } else if (type === NOTIFICATION_TYPES.RESULT_AVAILABLE) {
            await sendNotificationEmail(user.email, user.name, {
              type: 'result_available',
              message,
              description,
              actionUrl: actionUrl || '/progress',
              actionText: actionText || 'View Result',
              priority
            });
          } else {
            await sendNotificationEmail(user.email, user.name, {
              type,
              message,
              description,
              actionUrl,
              actionText: actionText || 'Open in Dashboard',
              priority
            });
          }
          emailSent = true;
        }
      } catch (emailErr) {
        emailFailed = true;
        emailFailureReason = emailErr.message;
        logger.error('Email notification dispatch failed:', emailErr);
      }
    }

    if (notificationRecord) {
      await Notification.findByIdAndUpdate(notificationRecord._id, {
        $set: {
          'sendStatus.inApp.sent': inAppSent,
          'sendStatus.inApp.sentAt': inAppSent ? new Date() : undefined,
          'sendStatus.email.sent': emailSent,
          'sendStatus.email.sentAt': emailSent ? new Date() : undefined,
          ...(emailFailed ? { 'sendStatus.email.failed': true } : {}),
          ...(emailFailureReason ? { 'sendStatus.email.failureReason': emailFailureReason } : {})
        }
      });
    }

    return { success: true, inAppSent, emailSent, notificationRecord };
  }

  static async getUserNotifications(userId, filter = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query = { recipient: userId, status: { $ne: 'deleted' } };

    if (filter.status && filter.status !== 'all') query.status = filter.status;
    if (filter.type) query.type = filter.type;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Notification.countDocuments(query);

    return {
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getUnreadCount(userId) {
    return Notification.countDocuments({
      recipient: userId,
      status: 'unread'
    });
  }

  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { status: 'read', readAt: new Date() },
      { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
  }

  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, status: 'unread' },
      { status: 'read', readAt: new Date() }
    );
    return result;
  }

  static async archiveNotification(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { status: 'archived', readAt: new Date() },
      { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
  }

  static async restoreNotification(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId, status: 'archived' },
      { status: 'unread', readAt: null },
      { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
  }

  static async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { status: 'deleted' },
      { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
  }
}

module.exports = NotificationService;
