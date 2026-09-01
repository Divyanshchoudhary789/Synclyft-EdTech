const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const notificationPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  globalChannels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false }
  },
  eventPreferences: {
    [NOTIFICATION_TYPES.INTERVIEW_SCHEDULED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.INTERVIEW_COMPLETED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.RESULT_AVAILABLE]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.PAYMENT_DUE]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.PAYMENT_REMINDER]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.SEAT_ALLOCATED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.SEAT_RELEASED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.PROFILE_UPDATE]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.SYSTEM_ALERT]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.CAMPAIGN_OPENED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.OFFER_AVAILABLE]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.DEADLINE_APPROACHING]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.ASSESSMENT_ASSIGNED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.DEADLINE_REMINDER]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.PERFORMANCE_ALERT]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.PLACEMENT_DRIVE_ANNOUNCEMENT]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.FOLLOW_UP_PENDING]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.RECOMMENDATION_ASSIGNED]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.BATCH_READINESS_ALERT]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
    [NOTIFICATION_TYPES.DECLINING_STUDENT_ALERT]: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    [NOTIFICATION_TYPES.RECOMMENDATION_CREATED]: { inApp: { type: Boolean, default: false }, email: { type: Boolean, default: false } }
  }
}, { timestamps: true });

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
