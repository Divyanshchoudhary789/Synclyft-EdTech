const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlacementScoreHistorySchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    overallScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    scoreBreakdown: {
        academicPerformance: { type: Number, default: 0, min: 0, max: 100 },
        codingPerformance: { type: Number, default: 0, min: 0, max: 100 },
        aptitudePerformance: { type: Number, default: 0, min: 0, max: 100 },
        communicationSkills: { type: Number, default: 0, min: 0, max: 100 },
        mockInterviewPerformance: { type: Number, default: 0, min: 0, max: 100 },
        professionalActivities: { type: Number, default: 0, min: 0, max: 100 },
        projectsPortfolio: { type: Number, default: 0, min: 0, max: 100 }
    },
    trend: {
        type: String,
        enum: ['improving', 'declining', 'stable'],
        default: 'stable'
    },
    recordedBy: {
        type: String,
        enum: ['system', 'admin', 'ai'],
        default: 'system'
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    recordedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

PlacementScoreHistorySchema.index({ student: 1, recordedAt: -1 });
PlacementScoreHistorySchema.index({ organization: 1, recordedAt: -1 });
PlacementScoreHistorySchema.index({ trend: 1 });

module.exports = mongoose.model('PlacementScoreHistory', PlacementScoreHistorySchema);
