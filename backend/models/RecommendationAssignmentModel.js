const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecommendationAssignmentSchema = new Schema({
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recommendation: {
        type: Schema.Types.ObjectId,
        ref: 'WorkshopRecommendation',
        required: true
    },
    targetType: {
        type: String,
        enum: ['batch', 'student'],
        required: true
    },
    targetBatch: {
        type: Schema.Types.ObjectId,
        ref: 'PlacementBatch',
        default: null
    },
    targetStudent: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    deadline: {
        type: Date,
        default: null
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    notificationSentAt: {
        type: Date,
        default: null
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true });

RecommendationAssignmentSchema.index({ organization: 1, createdAt: -1 });
RecommendationAssignmentSchema.index({ recommendation: 1 });
RecommendationAssignmentSchema.index({ targetBatch: 1 });
RecommendationAssignmentSchema.index({ targetStudent: 1 });

module.exports = mongoose.model('RecommendationAssignment', RecommendationAssignmentSchema);
