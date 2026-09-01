const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const PlatformConfigSchema = new Schema({
    username: { type: String, default: '', trim: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: '' },
    lastSyncedAt: { type: Date, default: null },
    stats: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });


const ExternalPlatformSchema = new Schema({
    leetcode: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        easySolved: { type: Number, default: 0 },
        mediumSolved: { type: Number, default: 0 },
        hardSolved: { type: Number, default: 0 },
        contestRating: { type: Number, default: 0 },
        totalSolved: { type: Number, default: 0 },
        globalRanking: { type: Number, default: 0 },
        reputation: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        totalActiveDays: { type: Number, default: 0 },
        attendedContestsCount: { type: Number, default: 0 }
    },
    github: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        totalCommits: { type: Number, default: 0 },
        publicRepos: { type: Number, default: 0 },
        starsEarned: { type: Number, default: 0 },
        avatarUrl: { type: String, default: '' },
        followers: { type: Number, default: 0 },
        following: { type: Number, default: 0 },
        htmlUrl: { type: String, default: '' },
        portfolioUrl: { type: String, default: '' },
        bio: { type: String, default: '' }
    },
    hackerrank: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        badgesCount: { type: Number, default: 0 },
        followersCount: { type: Number, default: 0 },
        totalSubmissions: { type: Number, default: 0 },
        badges: [{ name: String, stars: Number }],
        certificates: [{ title: String }]
    },
    codechef: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        globalRank: { type: Number, default: 0 }
    },
    gfg: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        totalProblems: { type: Number, default: 0 }
    },
    codeforces: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        rating: { type: Number, default: 0 },
        rank: { type: String, default: 'unranked' },
        maxRating: { type: Number, default: 0 },
        maxRank: { type: String, default: 'unranked' },
        avatarUrl: { type: String, default: '' },
        contribution: { type: Number, default: 0 },
        friendOfCount: { type: Number, default: 0 },
        totalSolved: { type: Number, default: 0 },
        totalSubmissions: { type: Number, default: 0 }
    },
    linkedin: {
        username: { type: String, default: '', trim: true },
        profileUrl: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        stats: { type: Schema.Types.Mixed, default: {} }
    },
    kaggle: {
        username: { type: String, default: '', trim: true },
        isVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: '' },
        lastSyncedAt: { type: Date, default: null },
        stats: { type: Schema.Types.Mixed, default: {} }
    }
}, { _id: false });



const StudentProfileSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    branch: {
        type: String,
        default: ""
    },
    graduationYear: {
        type: Number,
    },
    cgpa: {
        type: Number,
        default: 0.0,
        min: 0,
        max: 10
    },
    attendance: {
        type: Number,
        default: 0.0,
        min: 0,
        max: 100
    },
    targetRole: {
        type: String,
        default: ""
    },
    expectedCTC: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 }
    },
    resumeUrl: {
        type: String,
        default: ''
    },
    resumeKey: {
        type: String,
        default: ""
    },
    skills: [{ type: String, trim: true }],
    projects: [{
        title: String,
        description: String,
        githubLink: String,
        liveLink: String
    }],
    externalMetrics: { type: ExternalPlatformSchema, default: () => ({}) },
    placementReadinessScore: {
        type: Number,
        default: 0,
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
    techScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    aptitudeScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    codingScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    communicationScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    atsScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    atsLastCheckedAt: {
        type: Date,
        default: null
    },
    skillGaps: [{
        type: String,
        trim: true
    }],
    proficiencyLevels: {
        type: Schema.Types.Mixed,
        default: {}
    },
    mockHistoryCount: {
        type: Number,
        default: 0
    },
    lastMockAt: {
        type: Date,
        default: null
    },
    streakDays: {
        type: Number,
        default: 0
    },
    profilePicture: {
        type: String,
        default: ""
    },

    profilePictureKey: {
        type: String,
        default: ""
    },
    preferredInterviewLanguage: {
        type: String,
        default: ""
    },
    codingLanguageChoices: [{ type: String, trim: true }],
    linkedinProfile: {
        type: String,
        default: '',
        trim: true
    },
    githubProfile: {
        type: String,
        default: '',
        trim: true
    },
    kaggleProfile: {
        type: String,
        default: '',
        trim: true
    },
}, { timestamps: true });


StudentProfileSchema.index({ placementReadinessScore: -1 });
StudentProfileSchema.index({ branch: 1, graduationYear: 1 });
StudentProfileSchema.index({ placementReadinessScore: 1, techScore: 1, aptitudeScore: 1 });
StudentProfileSchema.index({ atsScore: -1 });
StudentProfileSchema.index({ createdAt: 1 });


const StudentProfile = mongoose.model("StudentProfile", StudentProfileSchema);


module.exports = StudentProfile;