const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const TopicItemSchema = new Schema({
    topicName: { type: String, required: true, trim: true },
    subtopics: [{ type: String, trim: true }],
    estimatedHours: { type: Number, default: 0, min: 0 },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    competencyBefore: { type: Number, min: 0, max: 100, default: 0 },
    resources: [{
        type: { type: String, enum: ['video', 'article', 'practice', 'documentation', 'course'], default: 'article' },
        title: { type: String, trim: true },
        url: { type: String, trim: true },
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
    }]
}, { _id: false });


const MilestoneSchema = new Schema({
    week: { type: Number, min: 1, required: true },
    title: { type: String, trim: true },
    topics: [{ type: String, trim: true }],
    targetCompetency: { type: Number, min: 0, max: 100, default: 70 }
}, { _id: false });


const AIStudyPlanSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sourceSession: {
        type: Schema.Types.ObjectId,
        ref: 'InterviewSession',
        default: null
    },
    targetRole: {
        type: String,
        required: true,
        trim: true
    },
    jobDescriptionSummary: {
        type: String,
        trim: true,
        default: ''
    },
    planTitle: {
        type: String,
        trim: true,
        default: ''
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    overallCompetencyBefore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    topics: [TopicItemSchema],
    milestones: [MilestoneSchema],
    estimatedTotalHours: {
        type: Number,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'archived'],
        default: 'active'
    },
    narrativeSummary: {
        type: String,
        trim: true,
        default: ''
    },
    keyImprovementAreas: [{ type: String, trim: true }],
    aiModelUsed: {
        type: String,
        trim: true,
        default: 'gemini-2.5-flash'
    },
    generatedBy: {
        type: String,
        enum: ['ai', 'manual'],
        default: 'ai'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });


AIStudyPlanSchema.index({ student: 1, createdAt: -1 });
AIStudyPlanSchema.index({ student: 1, targetRole: 1, status: 1 });
AIStudyPlanSchema.index({ targetRole: 1 });
AIStudyPlanSchema.index({ status: 1 });


AIStudyPlanSchema.pre('save', async function() {
    if (this.topics.length > 0 && (!this.estimatedTotalHours || this.estimatedTotalHours === 0)) {
        this.estimatedTotalHours = this.topics.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    }
});


const AIStudyPlan = mongoose.model('AIStudyPlan', AIStudyPlanSchema);

module.exports = AIStudyPlan;
