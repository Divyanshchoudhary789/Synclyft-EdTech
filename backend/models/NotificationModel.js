const mongoose = require('mongoose');
const logger = require('../services/loggerService.js');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  recipientRole: {
    type: String,
    enum: ['student', 'college-admin', 'super-admin'],
    required: true
  },

  type: {
    type: String,
    enum: [
      'interview_scheduled', 'interview_completed', 'result_available',
      'subscription_expiring', 'subscription_expired', 'payment_due',
      'payment_reminder', 'seat_allocated', 'seat_released',
      'profile_update', 'system_alert', 'achievement_unlocked',
      'campaign_opened', 'offer_available', 'deadline_approaching',
      'account_approved', 'account_rejected',
      'assessment_assigned', 'deadline_reminder', 'performance_alert',
      'placement_drive_announcement', 'follow_up_pending',
      'recommendation_assigned', 'batch_readiness_alert',
      'declining_student_alert', 'recommendation_created'
    ],
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  message: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  actionUrl: {
    type: String,
    trim: true
  },

  actionText: {
    type: String,
    trim: true
  },

  relatedEntity: {
    type: {
      enum: ['interview', 'subscription', 'billing', 'campaign', 'achievement']
    },
    entityId: mongoose.Schema.Types.ObjectId
  },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  status: {
    type: String,
    enum: ['unread', 'read', 'archived', 'deleted'],
    default: 'unread'
  },

  readAt: Date,

  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },

  sendStatus: {
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: Date
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: Boolean,
      failureReason: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: Boolean,
      failureReason: String
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      failed: Boolean,
      failureReason: String
    }
  },

  metadata: mongoose.Schema.Types.Mixed,

  expiresAt: {
    type: Date,
    default: function () {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    },
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { indexes: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expireAfterSeconds: 0 });

notificationSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

notificationSchema.methods.markAsRead = function () {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsArchived = function () {
  this.status = 'archived';
  return this.save();
};

notificationSchema.statics.createNotification = async function (notificationData) {
  try {
    const notification = new this({
      recipient: notificationData.recipient,
      recipientRole: notificationData.recipientRole,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      description: notificationData.description,
      actionUrl: notificationData.actionUrl,
      actionText: notificationData.actionText,
      relatedEntity: notificationData.relatedEntity,
      priority: notificationData.priority || 'normal',
      channels: notificationData.channels || { inApp: true },
      metadata: notificationData.metadata
    });

    return await notification.save();
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({
    recipient: userId,
    status: 'unread'
  });
};

notificationSchema.statics.getUserNotifications = async function (userId, limit = 20, skip = 0) {
  return await this.find({
    recipient: userId,
    status: { $ne: 'deleted' }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

notificationSchema.statics.sendBulkNotification = async function (userIds, notificationData) {
  try {
    const notifications = userIds.map(userId => ({
      recipient: userId,
      recipientRole: notificationData.recipientRole,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      description: notificationData.description,
      actionUrl: notificationData.actionUrl,
      actionText: notificationData.actionText,
      relatedEntity: notificationData.relatedEntity,
      priority: notificationData.priority || 'normal',
      channels: notificationData.channels || { inApp: true },
      metadata: notificationData.metadata
    }));

    return await this.insertMany(notifications);
  } catch (error) {
    logger.error('Error sending bulk notification:', error);
    throw error;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
