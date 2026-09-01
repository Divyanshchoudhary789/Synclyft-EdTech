const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const InterviewSessionSchema = new Schema({
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    jobDescription: {
        title: { type: String, required: true },
        description: { type: String, required: true },
        requiredSkills: [{ type: String }],
        techStack: [{ type: String }]
    },
    targetRole: { type: String, required: true },
    preferredCodingLanguage: { type: String, required: true },
    status: {
        type: String,
        enum: ['initialized', 'ongoing', 'completed', 'failed'],
        default: 'initialized'
    },
    durationMinutes: { type: Number, default: 30 },
    irtTheta: {
        type: Number,
        default: 0.0
    },
    finalCompositeScore: { type: Number, default: 0, min: 0, max: 100 },
    finalGrade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'Pending'],
        default: 'Pending'
    },
    proctoringRiskScore: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

InterviewSessionSchema.index({ student: 1, status: 1 });
InterviewSessionSchema.index({ campaign: 1 });
InterviewSessionSchema.index({ organization: 1 });


const InterviewSession = mongoose.model("InterviewSession", InterviewSessionSchema);


module.exports = InterviewSession;