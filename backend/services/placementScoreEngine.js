const mongoose = require('mongoose');
const StudentProfile = require('../models/StudentProfileModel');
const InterviewAnalytics = require('../models/InterviewAnalyticsModel');
const PlacementScoreHistory = require('../models/PlacementScoreHistoryModel');
const Campaign = require('../models/CampaignModel');
const InterviewSession = require('../models/InterviewSessionModel');
const PerformanceInsight = require('../models/PerformanceInsightModel');
const User = require('../models/userModel');
const PlacementBatch = require('../models/PlacementBatchModel');

const WEIGHTS = {
    academicPerformance: 0.20,
    codingPerformance: 0.25,
    aptitudePerformance: 0.20,
    communicationSkills: 0.15,
    mockInterviewPerformance: 0.10,
    professionalActivities: 0.05,
    projectsPortfolio: 0.05
};

const calculateBreakdown = async (studentId, organizationId) => {
    const profile = await StudentProfile.findOne({ user: studentId });
    if (!profile) return null;

    // Readiness is about the student — score across ALL their interviews, not
    // just one org's. (organizationId is kept for the history record only.)
    const analytics = await InterviewAnalytics.find({ student: studentId });

    const academicPerformance = Math.min(100, Math.round((profile.cgpa || 0) / 10 * 100 + (profile.attendance || 0) * 0.5));

    // Per-dimension score from real interview rounds. Uses the round's own
    // normalised score (0-100) — never a stale profile field. A round is only
    // counted if enough questions were actually attempted to be meaningful
    // (an abandoned 1-question round isn't a real assessment).
    const MIN_ATTEMPTS = { aptitude: 5, coding: 2, technical: 1, hr: 1 };
    const roundAvg = (roundType) => {
        const min = MIN_ATTEMPTS[roundType] ?? 1;
        const perRound = [];
        for (const a of analytics) {
            const r = (a.roundAnalytics || []).find((x) => x.roundType === roundType);
            if (r && (r.questionsAttempted || 0) >= min) {
                const max = r.maxPossibleScore || 100;
                perRound.push(Math.max(0, Math.min(100, Math.round((r.totalScore / max) * 100))));
            }
        }
        return perRound.length ? Math.round(perRound.reduce((s, v) => s + v, 0) / perRound.length) : null;
    };

    const lc = profile.externalMetrics?.leetcode || {};
    const solved = lc.totalSolved || (lc.easySolved || 0) + (lc.mediumSolved || 0) + (lc.hardSolved || 0);
    const externalCoding = lc.isVerified && solved
        ? Math.min(100, Math.round(solved / 5 + (lc.contestRating || 0) * 0.02))
        : 0;
    const codingScore = roundAvg('coding') ?? externalCoding;

    const aptitudeScore = roundAvg('aptitude') ?? 0;

    let communicationScore = 0;
    const commSamples = analytics
        .map((a) => a.skillScores?.communication)
        .filter((v) => typeof v === 'number' && v > 0);
    if (commSamples.length) {
        communicationScore = Math.round(commSamples.reduce((s, v) => s + v, 0) / commSamples.length);
    }

    const mockRounds = analytics.filter(a => (a.roundAnalytics || []).some(r => r.roundType === 'technical' || r.roundType === 'hr'));
    const mockInterviewPerformance = mockRounds.length > 0
        ? Math.round(mockRounds.reduce((sum, a) => sum + (a.overallScore || 0), 0) / mockRounds.length)
        : 0;

    const professionalActivities = Math.min(100, Math.round(
        ((profile.externalMetrics?.linkedin?.stats?.endorsements || 0) * 2) +
        ((profile.externalMetrics?.github?.publicRepos || 0) * 3) +
        (profile.externalMetrics?.codeforces?.rating || 0) * 0.1
    ));

    const projectsPortfolio = Math.min(100, Math.round(
        (profile.projects?.length || 0) * 10 +
        ((profile.externalMetrics?.github?.starsEarned || 0) > 0 ? 20 : 0) +
        ((profile.externalMetrics?.kaggle?.stats?.competitions || 0) > 0 ? 20 : 0)
    ));

    const breakdown = {
        academicPerformance: Math.min(100, academicPerformance),
        codingPerformance: Math.min(100, codingScore),
        aptitudePerformance: Math.min(100, aptitudeScore),
        communicationSkills: Math.min(100, communicationScore),
        mockInterviewPerformance: Math.min(100, mockInterviewPerformance),
        professionalActivities: Math.min(100, professionalActivities),
        projectsPortfolio: Math.min(100, projectsPortfolio)
    };

    const overallScore = Math.round(
        breakdown.academicPerformance * WEIGHTS.academicPerformance +
        breakdown.codingPerformance * WEIGHTS.codingPerformance +
        breakdown.aptitudePerformance * WEIGHTS.aptitudePerformance +
        breakdown.communicationSkills * WEIGHTS.communicationSkills +
        breakdown.mockInterviewPerformance * WEIGHTS.mockInterviewPerformance +
        breakdown.professionalActivities * WEIGHTS.professionalActivities +
        breakdown.projectsPortfolio * WEIGHTS.projectsPortfolio
    );

    return { overallScore, breakdown };
};

const updateStudentReadinessScore = async (studentId, organizationId = null, recordedBy = 'system', notes = '') => {
    const result = await calculateBreakdown(studentId, organizationId);
    if (!result) return null;

    const { overallScore, breakdown } = result;

    const profile = await StudentProfile.findOne({ user: studentId });
    if (!profile) return null;

    const previousScores = await PlacementScoreHistory.find({ student: studentId })
        .sort({ recordedAt: -1 })
        .limit(2);

    let trend = 'stable';
    if (previousScores.length > 0) {
        const diff = overallScore - previousScores[0].overallScore;
        if (diff > 2) trend = 'improving';
        else if (diff < -2) trend = 'declining';
    }

    profile.placementReadinessScore = overallScore;
    profile.scoreBreakdown = breakdown;
    profile.techScore = breakdown.codingPerformance;
    profile.aptitudeScore = breakdown.aptitudePerformance;
    profile.codingScore = breakdown.codingPerformance;
    profile.communicationScore = breakdown.communicationSkills;
    profile.skillGaps = deriveSkillGaps(breakdown);
    profile.mockHistoryCount = await InterviewSession.countDocuments({ student: studentId, status: 'completed' });
    await profile.save();

    // Resolve an org for the history row (it needs one). Fall back to the
    // student's college; skip the history write entirely if there's still none.
    let orgId = organizationId;
    if (!orgId) {
        const student = await User.findById(studentId).select('organization').lean();
        if (student?.organization) {
            const org = await require('../models/OrganizationModel').findOne({ organizationName: student.organization }).select('_id').lean();
            orgId = org?._id || null;
        }
    }
    if (orgId) {
        await PlacementScoreHistory.create({
            student: studentId,
            organization: orgId,
            overallScore,
            scoreBreakdown: breakdown,
            trend,
            recordedBy,
            notes,
        });
    }

    return { profile, trend };
};

const deriveSkillGaps = (breakdown) => {
    const gaps = [];
    if (breakdown.academicPerformance < 50) gaps.push('Academic Performance');
    if (breakdown.codingPerformance < 40) gaps.push('Coding Skills');
    if (breakdown.aptitudePerformance < 40) gaps.push('Aptitude');
    if (breakdown.communicationSkills < 40) gaps.push('Communication');
    if (breakdown.mockInterviewPerformance < 40) gaps.push('Interview Preparation');
    if (breakdown.professionalActivities < 30) gaps.push('Professional Engagement');
    if (breakdown.projectsPortfolio < 30) gaps.push('Project Portfolio');
    return gaps;
};

const getBatchReadinessStats = async (batchId, organizationId) => {
    const batch = await PlacementBatch.findOne({ _id: batchId, organization: organizationId });
    if (!batch) return null;

    const activeStudentIds = batch.students
        .filter(s => s.status === 'active')
        .map(s => s.student);

    const profiles = await StudentProfile.find({ user: { $in: activeStudentIds } });
    const totalStudents = profiles.length;

    if (totalStudents === 0) {
        return {
            batchId: batch._id,
            batchName: batch.batchName,
            graduationYear: batch.graduationYear,
            department: batch.department,
            totalStudents: 0,
            readinessDistribution: { excellent: 0, good: 0, needsFocus: 0, atRisk: 0 },
            averageReadinessScore: 0,
            averageBreakdown: null,
            readyStudents: [],
            atRiskStudents: [],
            decliningStudents: []
        };
    }

    const avgReadiness = Math.round(profiles.reduce((sum, p) => sum + (p.placementReadinessScore || 0), 0) / totalStudents);

    const avgBreakdown = {
        academicPerformance: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.academicPerformance || 0), 0) / totalStudents),
        codingPerformance: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.codingPerformance || 0), 0) / totalStudents),
        aptitudePerformance: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.aptitudePerformance || 0), 0) / totalStudents),
        communicationSkills: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.communicationSkills || 0), 0) / totalStudents),
        mockInterviewPerformance: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.mockInterviewPerformance || 0), 0) / totalStudents),
        professionalActivities: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.professionalActivities || 0), 0) / totalStudents),
        projectsPortfolio: Math.round(profiles.reduce((sum, p) => sum + (p.scoreBreakdown?.projectsPortfolio || 0), 0) / totalStudents)
    };

    const distribution = { excellent: 0, good: 0, needsFocus: 0, atRisk: 0 };
    profiles.forEach(p => {
        const score = p.placementReadinessScore || 0;
        if (score >= 80) distribution.excellent++;
        else if (score >= 65) distribution.good++;
        else if (score >= 50) distribution.needsFocus++;
        else distribution.atRisk++;
    });

    const readyStudents = profiles
        .filter(p => p.placementReadinessScore >= 65)
        .sort((a, b) => b.placementReadinessScore - a.placementReadinessScore)
        .slice(0, 50);

    const atRiskStudents = profiles
        .filter(p => p.placementReadinessScore < 50)
        .sort((a, b) => a.placementReadinessScore - b.placementReadinessScore);

    const histories = await PlacementScoreHistory.find({ student: { $in: activeStudentIds } })
        .sort({ student: 1, recordedAt: -1 });

    const latestByStudent = {};
    histories.forEach(h => {
        if (!latestByStudent[h.student.toString()]) {
            latestByStudent[h.student.toString()] = h;
        }
    });

    const decliningStudents = await StudentProfile.find({ user: { $in: activeStudentIds } })
        .populate('user', 'name email')
        .then(async (profiles) => {
            const declining = [];
            for (const profile of profiles) {
                const history = await PlacementScoreHistory.find({ student: profile.user })
                    .sort({ recordedAt: -1 })
                    .limit(3);
                if (history.length >= 2 && history[0].overallScore - history[history.length - 1].overallScore <= -5) {
                    declining.push({
                        studentId: profile.user,
                        name: profile.user?.name,
                        email: profile.user?.email,
                        currentScore: profile.placementReadinessScore,
                        previousScore: history[1]?.overallScore || history[0].overallScore,
                        trend: 'declining'
                    });
                }
            }
            return declining;
        });

    return {
        batchId: batch._id,
        batchName: batch.batchName,
        graduationYear: batch.graduationYear,
        department: batch.department,
        totalStudents,
        readinessDistribution: distribution,
        averageReadinessScore: avgReadiness,
        averageBreakdown: avgBreakdown,
        readyStudents,
        atRiskStudents,
        decliningStudents
    };
};

const getDecliningStudents = async (organizationId, batchId = null, graduationYear = null) => {
    const query = { organization: organizationId };
    if (batchId) query._id = batchId;
    if (graduationYear) query.graduationYear = graduationYear;

    const batches = await PlacementBatch.find(query);
    const batchIds = batches.map(b => b._id);

    const allStudentIds = [];
    batches.forEach(b => {
        b.students.filter(s => s.status === 'active').forEach(s => allStudentIds.push(s.student));
    });

    const histories = await PlacementScoreHistory.find({ student: { $in: allStudentIds } })
        .sort({ student: 1, recordedAt: -1 });

    const grouped = {};
    histories.forEach(h => {
        const key = h.student.toString();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(h);
    });

    const declining = [];
    for (const [studentId, studentHistories] of Object.entries(grouped)) {
        if (studentHistories.length >= 2) {
            const latest = studentHistories[0];
            const previous = studentHistories[studentHistories.length - 1];
            const diff = latest.overallScore - previous.overallScore;
            if (diff <= -5) {
                const profile = await StudentProfile.findOne({ user: studentId }).populate('user', 'name email');
                if (profile) {
                    declining.push({
                        studentId: profile.user._id,
                        name: profile.user.name,
                        email: profile.user.email,
                        branch: profile.branch,
                        graduationYear: profile.graduationYear,
                        currentScore: latest.overallScore,
                        previousScore: previous.overallScore,
                        scoreDrop: Math.abs(diff),
                        trend: 'declining',
                        skillGaps: profile.skillGaps || []
                    });
                }
            }
        }
    }

    return declining.sort((a, b) => a.scoreDrop - b.scoreDrop);
};

module.exports = {
    updateStudentReadinessScore,
    calculateBreakdown,
    getBatchReadinessStats,
    getDecliningStudents,
    deriveSkillGaps
};
