const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoundAnalyticsSchema = new Schema({
    roundType: {
        type: String,
        enum: ['aptitude', 'coding', 'technical', 'hr'],
        required: true
    },
    timeSpentSeconds: {
        type: Number,
        default: 0
    },
    questionsAttempted: {
        type: Number,
        default: 0
    },
    questionsPassed: {
        type: Number,
        default: 0
    },
    totalScore: {
        type: Number,
        default: 0
    },
    maxPossibleScore: {
        type: Number,
        default: 100
    },
    averageResponseTimeMs: {
        type: Number,
        default: 0
    },
    hintUsed: {
        type: Boolean,
        default: false
    },
    hintCount: {
        type: Number,
        default: 0
    },
    languageStats: {
        type: Map,
        of: Number,
        default: {}
    },
    violationCount: {
        type: Number,
        default: 0
    },
    riskScoreContribution: {
        type: Number,
        default: 0
    }
}, { _id: false });

const InterviewAnalyticsSchema = new Schema({
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
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    startedAt: {
        type: Date,
        required: true
    },
    completedAt: {
        type: Date,
        default: null
    },
    totalDurationSeconds: {
        type: Number,
        default: 0
    },
    roundAnalytics: [RoundAnalyticsSchema],
    overallScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    finalGrade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'Pending'],
        default: 'Pending'
    },
    proctoringRiskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isDisqualified: {
        type: Boolean,
        default: false
    },
    skillScores: {
        communication: { type: Number, default: 0, min: 0, max: 100 },
        problemSolving: { type: Number, default: 0, min: 0, max: 100 },
        technical: { type: Number, default: 0, min: 0, max: 100 },
        coding: { type: Number, default: 0, min: 0, max: 100 }
    },
    competencyMetrics: {
        timeManagement: { type: Number, default: 0, min: 0, max: 100 },
        consistency: { type: Number, default: 0, min: 0, max: 100 },
        improvementRate: { type: Number, default: 0, min: -100, max: 100 }
    },
    performanceTrend: [{
        timestamp: { type: Date, default: Date.now },
        score: { type: Number, default: 0 },
        roundType: { type: String }
    }],
    deviceInfo: {
        browser: { type: String, default: '' },
        os: { type: String, default: '' },
        deviceType: { type: String, default: 'desktop' },
        ipAddress: { type: String, default: '' }
    },
    metadata: {
        targetRole: { type: String, default: '' },
        preferredCodingLanguage: { type: String, default: '' },
        jobDescription: { type: String, default: '' }
    }
}, { timestamps: true });

InterviewAnalyticsSchema.index({ student: 1, createdAt: -1 });
InterviewAnalyticsSchema.index({ campaign: 1 });
InterviewAnalyticsSchema.index({ organization: 1 });
InterviewAnalyticsSchema.index({ proctoringRiskScore: 1, isDisqualified: 1 });
InterviewAnalyticsSchema.index({ overallScore: 1 });
InterviewAnalyticsSchema.index({ completedAt: 1 });

// Mongoose 9 dropped the `next` callback in hooks — a sync hook just returns.
InterviewAnalyticsSchema.pre('save', function() {
    if (this.completedAt && this.startedAt) {
        this.totalDurationSeconds = Math.floor((this.completedAt - this.startedAt) / 1000);
    }
});

InterviewAnalyticsSchema.virtual('formattedDuration').get(function() {
    const minutes = Math.floor(this.totalDurationSeconds / 60);
    const seconds = this.totalDurationSeconds % 60;
    return `${minutes}m ${seconds}s`;
});

InterviewAnalyticsSchema.statics.getStudentSessionHistory = async function(studentId, limit = 20, page = 1) {
    const skip = (page - 1) * limit;
    return await this.find({ student: studentId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('campaign', 'title')
        .lean();
};

InterviewAnalyticsSchema.statics.getStudentAnalyticsSummary = async function(studentId, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { student: new mongoose.Types.ObjectId(studentId), completedAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                averageScore: { $avg: '$overallScore' },
                averageRiskScore: { $avg: '$proctoringRiskScore' },
                totalDisqualified: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                averageDuration: { $avg: '$totalDurationSeconds' },
                gradeDistribution: {
                    $push: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$finalGrade', 'A'] }, then: 'A' },
                                { case: { $eq: ['$finalGrade', 'B'] }, then: 'B' },
                                { case: { $eq: ['$finalGrade', 'C'] }, then: 'C' },
                                { case: { $eq: ['$finalGrade', 'D'] }, then: 'D' }
                            ],
                            default: 'Pending'
                        }
                    }
                }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || { totalSessions: 0, averageScore: 0, averageRiskScore: 0, totalDisqualified: 0 };
};

InterviewAnalyticsSchema.statics.getCollegeAnalytics = async function(organizationId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), completedAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                averageScore: { $avg: '$overallScore' },
                averageRiskScore: { $avg: '$proctoringRiskScore' },
                highRiskSessions: {
                    $sum: { $cond: [{ $gte: ['$proctoringRiskScore', 70] }, 1, 0] }
                },
                disqualifiedSessions: { $sum: { $cond: ['$isDisqualified', 1, 0] } },
                gradeDistribution: {
                    $push: '$finalGrade'
                }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {};
};

InterviewAnalyticsSchema.statics.getInterviewPerformanceHeatmap = async function(days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { startedAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
                    hour: { $hour: '$startedAt' }
                },
                sessionCount: { $sum: 1 },
                averageScore: { $avg: '$overallScore' },
                completionRate: { 
                    $avg: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } 
                }
            }
        },
        { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ];
    
    return await this.aggregate(pipeline);
};

InterviewAnalyticsSchema.statics.getPlatformOverview = async function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const pipeline = [
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                completedSessions: { $sum: { $cond: [{ $ne: ['$completedAt', null] }, 1, 0] } },
                averageScore: { $avg: '$overallScore' },
                averageRiskScore: { $avg: '$proctoringRiskScore' },
                disqualifiedCount: { $sum: { $cond: ['$isDisqualified', 1, 0] } }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {};
};

InterviewAnalyticsSchema.statics.getSessionRanking = async function(limit = 100) {
    const pipeline = [
        { $match: { overallScore: { $gt: 0 } } },
        { $sort: { overallScore: -1, completedAt: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'student',
                foreignField: '_id',
                as: 'studentInfo'
            }
        },
        {
            $project: {
                _id: 0,
                sessionId: '$session',
                studentId: '$student',
                studentName: { $arrayElemAt: ['$studentInfo.name', 0] },
                studentEmail: { $arrayElemAt: ['$studentInfo.email', 0] },
                organization: { $arrayElemAt: ['$studentInfo.organization', 0] },
                overallScore: 1,
                finalGrade: 1,
                proctoringRiskScore: 1,
                completedAt: 1
            }
        }
    ];
    
    return await this.aggregate(pipeline);
};

const InterviewAnalytics = mongoose.model('InterviewAnalytics', InterviewAnalyticsSchema);

module.exports = InterviewAnalytics;