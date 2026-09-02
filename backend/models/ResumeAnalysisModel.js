const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Persisted output of an AI resume analysis (POST /resume/analyze).
 * One document per analysis run so the student can revisit past reports
 * and track ATS-score movement over time.
 */
const ResumeAnalysisSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    fileName: { type: String, default: '' },
    targetRole: { type: String, default: '' },
    experienceLevel: { type: String, default: '' },
    hasJobDescription: { type: Boolean, default: false },

    atsScore: { type: Number, min: 0, max: 100, default: 0 },
    matchedKeywords: [{ type: String }],
    missingKeywords: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    summarySuggestion: { type: String, default: '' },
    experienceImprovements: [{ type: String }],
    projectImprovements: [{ type: String }],
    certificationImprovements: [{ type: String }],
    generalTips: [{ type: String }]
}, { timestamps: true });

ResumeAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);
