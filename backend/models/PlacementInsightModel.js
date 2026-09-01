const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlacementInsightSchema = new Schema({
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    insightType: {
        type: String,
        enum: [
            'placement-readiness-summary',
            'skill-gap-analysis',
            'batch-performance-comparison',
            'university-benchmark',
            'industry-alignment',
            'placement-trend',
            'aptitude-deficit-analysis'
        ],
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    summary: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    data: {
        type: Schema.Types.Mixed,
        default: {}
    },
    metrics: {
        totalStudents: { type: Number, default: 0 },
        placementReadyCount: { type: Number, default: 0 },
        atRiskCount: { type: Number, default: 0 },
        averageReadinessScore: { type: Number, default: 0 },
        averageInterviewScore: { type: Number, default: 0 },
        averageRiskScore: { type: Number, default: 0 }
    },
    recommendations: [{
        recommendationType: { type: String, enum: ['workshop', 'bootcamp', 'training-program', 'certification'] },
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
    }],
    batchComparisonData: [{
        batchId: { type: Schema.Types.ObjectId, ref: 'PlacementBatch' },
        batchName: { type: String, trim: true },
        graduationYear: { type: Number },
        averageScore: { type: Number, default: 0 },
        averageReadiness: { type: Number, default: 0 },
        averageRisk: { type: Number, default: 0 },
        studentCount: { type: Number, default: 0 },
        topPerformer: {
            name: { type: String, trim: true },
            score: { type: Number, default: 0 }
        },
        lowPerformer: {
            name: { type: String, trim: true },
            score: { type: Number, default: 0 }
        }
    }],
    publishedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

PlacementInsightSchema.index({ organization: 1, insightType: 1, createdAt: -1 });
PlacementInsightSchema.index({ organization: 1, createdAt: -1 });

PlacementInsightSchema.virtual('isPublished').get(function() {
    return this.publishedAt !== null && this.publishedAt <= new Date();
});

PlacementInsightSchema.methods.publish = function() {
    this.publishedAt = new Date();
    return this.save();
};

const PlacementInsight = mongoose.model('PlacementInsight', PlacementInsightSchema);

module.exports = PlacementInsight;