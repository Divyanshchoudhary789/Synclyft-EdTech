const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViolationItemSchema = new Schema({
    timestamp: { type: Date, default: Date.now },
    roundType: { type: String, enum: ['aptitude', 'coding', 'technical', 'hr'], required: true },
    violationType: {
        type: String,
        enum: [
            'face_absence', 'multiple_faces', 'gaze_deviation',
            'tab_switch', 'window_minimize', 'paste_attempt',
            'scripted_input', 'multiple_voices', 'mobile_detected'
        ],
        required: true
    },
    severityWeight: { type: Number, required: true },
    snapshotUrl: { type: String, default: '' },
    rawEventData: { type: Schema.Types.Mixed }
});

const ProctorSessionReportSchema = new Schema({
    session: {
        type: Schema.Types.ObjectId,
        ref: 'InterviewSession',
        required: true,
        unique: true
    },
    candidateId: { type: String, required: true },
    cumulativeRiskScore: { type: Number, default: 0, min: 0, max: 100 },
    isDisqualified: { type: Boolean, default: false },
    violationsLog: [ViolationItemSchema]
}, { timestamps: true });

ProctorSessionReportSchema.index({ candidateId: 1 });

const ProctorSessionReport = mongoose.model("ProctorSessionReport", ProctorSessionReportSchema);


module.exports = ProctorSessionReport;