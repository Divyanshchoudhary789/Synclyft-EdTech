const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const CampaignSchema = new Schema({
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    targetDepartment: [{ type: String }],
    targetBatch: [{ type: Number }], // array integers e.g. [2026, 2027]
    assignedBatches: [{
        batch: {
            type: Schema.Types.ObjectId,
            ref: 'PlacementBatch'
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedAt: {
            type: Date,
            default: Date.now
        },
        notifyStudents: {
            type: Boolean,
            default: true
        },
        studentCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'revoked'],
            default: 'active'
        }
    }],
    assignmentMode: {
        type: String,
        enum: ['targeting', 'batch_assignment', 'manual', 'bulk_student'],
        default: 'targeting'
    },
    config: {
        hasAptitude: { type: Boolean, default: true },
        hasCoding: { type: Boolean, default: true },
        hasTechnical: { type: Boolean, default: true },
        hasHr: { type: Boolean, default: true },
        hasBehavioral: { type: Boolean, default: false },
        companyTemplate: { type: String, default: 'General' }
    },
    assessmentTypes: [{
        type: {
            type: String,
            enum: ['aptitude', 'coding', 'technical', 'hr', 'behavioral', 'company_specific'],
            required: true
        },
        roundName: { type: String, trim: true },
        durationMinutes: { type: Number, default: 30 },
        totalQuestions: { type: Number, default: 0 },
        passingScore: { type: Number, default: 0, min: 0, max: 100 },
        instructions: { type: String, trim: true, default: '' },
        sections: [{
            sectionName: { type: String, trim: true },
            questionCount: { type: Number, default: 0 },
            maxScore: { type: Number, default: 0 }
        }]
    }],
    companyTemplateDetails: {
        companyName: { type: String, trim: true, default: '' },
        role: { type: String, trim: true, default: '' },
        eligibility: { type: String, trim: true, default: '' },
        instructions: { type: String, trim: true, default: '' },
        evaluationCriteria: { type: String, trim: true, default: '' },
        testDuration: { type: Number, default: 60 }
    },
    bulkStudentIds: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    maxStudents: {
        type: Number,
        default: 1000,
        max: 10000
    },
    deadline: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

CampaignSchema.index({ isActive: 1, deadline: 1 });
CampaignSchema.index({ creator: 1 });
CampaignSchema.index({ 'assignedBatches.batch': 1 });

const Campaign = mongoose.model("Campaign", CampaignSchema);


module.exports = Campaign;