const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ViolationSummarySchema = new Schema({
    violationType: {
        type: String,
        enum: [
            'face_absence', 'multiple_faces', 'gaze_deviation',
            'tab_switch', 'window_minimize', 'paste_attempt',
            'scripted_input', 'multiple_voices', 'mobile_detected'
        ],
        required: true
    },
    count: {
        type: Number,
        default: 0,
        min: 0
    },
    totalWeight: {
        type: Number,
        default: 0
    },
    firstOccurrence: {
        type: Date,
        default: Date.now
    },
    lastOccurrence: {
        type: Date,
        default: Date.now
    },
    snapshots: [{
        url: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
    }]
}, { _id: false });

const RoundViolationSchema = new Schema({
    roundType: {
        type: String,
        enum: ['aptitude', 'coding', 'technical', 'hr'],
        required: true
    },
    violations: [ViolationSummarySchema],
    roundRiskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, { _id: false });

const ProctorRiskReportSchema = new Schema({
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
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    candidateId: {
        type: String,
        required: true
    },
    cumulativeRiskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
    isDisqualified: {
        type: Boolean,
        default: false
    },
    disqualificationReason: {
        type: String,
        default: ''
    },
    roundViolations: [RoundViolationSchema],
    violationTimeline: [{
        timestamp: { type: Date, default: Date.now },
        violationType: { type: String },
        roundType: { type: String },
        severityWeight: { type: Number },
        snapshotUrl: { type: String, default: '' }
    }],
    detectionSummary: {
        totalViolations: { type: Number, default: 0 },
        uniqueViolationTypes: { type: Number, default: 0 },
        highestRiskRound: { type: String, default: '' },
        averageViolationsPerMinute: { type: Number, default: 0 }
    },
    riskAssessment: {
        patternDetected: {
            type: String,
            enum: ['normal', 'suspicious', 'highly_suspicious', 'disqualifying'],
            default: 'normal'
        },
        consistencyScore: { type: Number, default: 100, min: 0, max: 100 },
        attentionScore: { type: Number, default: 100, min: 0, max: 100 },
        integrityScore: { type: Number, default: 100, min: 0, max: 100 }
    },
    evaluatedAt: {
        type: Date,
        default: Date.now
    },
    evaluatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

ProctorRiskReportSchema.index({ student: 1, createdAt: -1 });
ProctorRiskReportSchema.index({ organization: 1, createdAt: -1 });
ProctorRiskReportSchema.index({ cumulativeRiskScore: 1, riskLevel: 1 });
ProctorRiskReportSchema.index({ isDisqualified: 1 });

ProctorRiskReportSchema.pre('save', function(next) {
    if (this.cumulativeRiskScore >= 80) {
        this.riskLevel = 'critical';
    } else if (this.cumulativeRiskScore >= 50) {
        this.riskLevel = 'high';
    } else if (this.cumulativeRiskScore >= 25) {
        this.riskLevel = 'medium';
    } else {
        this.riskLevel = 'low';
    }
    
    if (this.cumulativeRiskScore >= 100) {
        this.isDisqualified = true;
        this.disqualificationReason = 'Risk score exceeded maximum threshold';
    }
    
    next();
});

ProctorRiskReportSchema.statics.getRiskDistributionByOrg = async function(organizationId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: '$riskLevel',
                count: { $sum: 1 },
                averageRiskScore: { $avg: '$cumulativeRiskScore' },
                disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } }
            }
        },
        { $sort: { count: -1 } }
    ];
    
    return await this.aggregate(pipeline);
};

ProctorRiskReportSchema.statics.getStudentRiskReport = async function(studentId, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { student: new mongoose.Types.ObjectId(studentId), createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                averageRiskScore: { $avg: '$cumulativeRiskScore' },
                disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                riskLevelDistribution: {
                    $push: { k: '$riskLevel', v: 1 }
                }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {};
};

ProctorRiskReportSchema.statics.getCollegeRiskDashboard = async function(organizationId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), createdAt: { $gte: startDate } } },
        {
            $facet: {
                summary: [
                    {
                        $group: {
                            _id: null,
                            totalSessions: { $sum: 1 },
                            averageRiskScore: { $avg: '$cumulativeRiskScore' },
                            disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                            highRiskCount: { $sum: { $cond: [{ $gte: ['$cumulativeRiskScore', 70] }, 1, 0] } },
                            lowRiskCount: { $sum: { $cond: [{ $lte: ['$cumulativeRiskScore', 20] }, 1, 0] } }
                        }
                    }
                ],
                violationTypes: [
                    { $unwind: '$roundViolations' },
                    { $unwind: '$roundViolations.violations' },
                    {
                        $group: {
                            _id: '$roundViolations.violations.violationType',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 5 }
                ],
                dailyTrend: [
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            averageRisk: { $avg: '$cumulativeRiskScore' },
                            sessionCount: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {};
};

const ProctorRiskReport = mongoose.model('ProctorRiskReport', ProctorRiskReportSchema);

module.exports = ProctorRiskReport;