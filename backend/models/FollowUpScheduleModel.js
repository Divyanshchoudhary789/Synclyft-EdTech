const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowUpScheduleSchema = new Schema({
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetType: {
        type: String,
        enum: ['campaign', 'student', 'batch'],
        required: true
    },
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'PlacementBatch',
        default: null
    },
    followUpType: {
        type: String,
        enum: ['assessment_assigned', 'deadline_reminder', 'performance_alert', 'placement_drive', 'follow_up_pending', 'recommendation_assigned'],
        required: true
    },
    scheduleDate: {
        type: Date,
        required: true
    },
    triggerAfterDays: {
        type: Number,
        default: 1,
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'skipped', 'cancelled'],
        default: 'pending',
        index: true
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
        trim: true,
        default: ''
    },
    actionUrl: {
        type: String,
        trim: true,
        default: ''
    },
    actionText: {
        type: String,
        trim: true,
        default: 'View'
    },
    channels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
    },
    recipientRole: {
        type: String,
        enum: ['student', 'college-admin', 'super-admin'],
        default: 'student'
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    sentAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

FollowUpScheduleSchema.index({ organization: 1, status: 1, scheduleDate: 1 });
FollowUpScheduleSchema.index({ student: 1, status: 1 });
FollowUpScheduleSchema.index({ batch: 1, status: 1 });

module.exports = mongoose.model('FollowUpSchedule', FollowUpScheduleSchema);
