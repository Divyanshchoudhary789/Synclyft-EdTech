const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TargetAudienceSchema = new Schema({
    departments: [{ type: String, trim: true }],
    graduationYears: [{ type: Number }],
    minReadinessScore: { type: Number, min: 0, max: 100 },
    maxRiskScore: { type: Number, min: 0, max: 100 }
}, { _id: false });

const RecommendationSchema = new Schema({
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    recommendationType: {
        type: String,
        enum: ['workshop', 'bootcamp', 'training-program', 'certification'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    targetAudience: {
        type: TargetAudienceSchema,
        default: () => ({ departments: [], graduationYears: [], minReadinessScore: 0, maxRiskScore: 100 })
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    estimatedImpact: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    skillGaps: [{
        skill: { type: String, trim: true },
        studentCount: { type: Number, default: 0 }
    }],
    affectedStudentCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    expiresAt: {
        type: Date,
        default: null
    },
    metadata: {
        generatedBy: { type: String, default: 'ai', enum: ['ai', 'admin', 'system'] },
        modelVersion: { type: String, default: '1.0' },
        confidenceScore: { type: Number, min: 0, max: 100, default: 0 }
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    externalUrl: {
        type: String,
        trim: true,
        default: ''
    },
    externalPlatform: {
        type: String,
        enum: ['internal', 'udemy', 'coursera', 'linkedin_learning', 'youtube', 'custom', 'other'],
        default: 'internal'
    },
    tags: [{
        type: String,
        trim: true
    }],
    isAdminCreated: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

RecommendationSchema.index({ organization: 1, createdAt: -1 });
RecommendationSchema.index({ recommendationType: 1, priority: 1 });

const WorkshopRecommendation = mongoose.model('WorkshopRecommendation', RecommendationSchema);

module.exports = WorkshopRecommendation;