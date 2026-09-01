const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ActionableItemSchema = new Schema({
    topic: { type: String, required: true },
    focusArea: { type: String, required: true },
    recommendedAction: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },

}, { _id: false });


const PerformanceInsightSchema = new Schema({
    session: {
        type: Schema.Types.ObjectId,
        ref: 'InterviewSession',
        required: true,
        unique: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    narrativeSummary: { type: String, required: true },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    skillGapsVsJd: [{ type: String }],
    actionableStudyPlan: [ActionableItemSchema],
    pdfReportUrl: { type: String, default: '' } // Compiled system PDF path saved inside R2
}, { timestamps: true });

PerformanceInsightSchema.index({ student: 1 });

const PerformanceInsight = mongoose.model("PerformanceInsight", PerformanceInsightSchema);


module.exports = PerformanceInsight;