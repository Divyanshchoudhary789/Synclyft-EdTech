const mongoose = require('mongoose');

const emailQueueSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true,
        trim: true
    },
    from: {
        type: String,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    html: String,
    text: String,
    template: {
        type: String,
        trim: true
    },
    templateData: mongoose.Schema.Types.Mixed,
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    recipientName: String,
    recipientRole: {
        type: String,
        enum: ['student', 'college-admin', 'super-admin'],
        default: 'student'
    },
    type: {
        type: String,
        enum: [
            'otp',
            'welcome',
            'approval',
            'rejection',
            'interview_scheduled',
            'interview_completed',
            'result_available',
            'subscription_expiring',
            'subscription_expired',
            'payment_due',
            'payment_reminder',
            'seat_allocated',
            'seat_released',
            'profile_update',
            'system_alert',
            'achievement_unlocked',
            'campaign_opened',
            'offer_available',
            'deadline_approaching',
            'password_reset',
            'email_verification',
            'assessment_assigned',
            'deadline_reminder',
            'performance_alert',
            'placement_drive_announcement',
            'follow_up_pending',
            'recommendation_assigned',
            'batch_readiness_alert',
            'declining_student_alert'
        ],
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    lastError: {
        message: String,
        stack: String,
        code: String,
        timestamp: Date
    },
    sentAt: Date,
    processedAt: Date,
    cancelledAt: Date,
    metadata: {
        relatedEntity: {
            type: {
                type: String,
                enum: ['interview', 'subscription', 'billing', 'campaign', 'achievement', 'user']
            },
            entityId: mongoose.Schema.Types.ObjectId
        },
        notificationId: mongoose.Schema.Types.ObjectId,
        userId: mongoose.Schema.Types.ObjectId
    }
}, {
    timestamps: true
});

emailQueueSchema.index({ status: 1, priority: 1, createdAt: 1 });
emailQueueSchema.index({ type: 1 });
emailQueueSchema.index({ recipient: 1 });
emailQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

emailQueueSchema.virtual('retryDelay').get(function() {
    const delays = [1, 5, 15, 30, 60, 120];
    return delays[Math.min(this.attempts, delays.length - 1)] * 60 * 1000;
});

emailQueueSchema.methods.markAsProcessing = function() {
    this.status = 'processing';
    this.processedAt = new Date();
    return this.save();
};

emailQueueSchema.methods.markAsSent = function() {
    this.status = 'sent';
    this.sentAt = new Date();
    this.lastError = undefined;
    return this.save();
};

emailQueueSchema.methods.markAsFailed = function(error) {
    this.attempts += 1;
    this.lastError = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        timestamp: new Date()
    };
    
    if (this.attempts >= this.maxAttempts) {
        this.status = 'failed';
    }
    
    return this.save();
};

emailQueueSchema.methods.cancel = function() {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    return this.save();
};

emailQueueSchema.statics.findPendingEmails = function(options = {}) {
    const query = { status: 'pending' };
    const limit = options.limit || 50;
    const priorityOrder = options.priority || 'normal';
    
    return this.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit);
};

emailQueueSchema.statics.getQueueStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    return stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
    }, {
        pending: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        cancelled: 0
    });
};

const EmailQueue = mongoose.model('EmailQueue', emailQueueSchema);

module.exports = EmailQueue;