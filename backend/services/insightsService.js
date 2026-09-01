const mongoose = require('mongoose');
const logger = require('./loggerService.js');
const User = require('../models/userModel.js');
const StudentProfile = require('../models/StudentProfileModel.js');
const InterviewSession = require('../models/InterviewSessionModel.js');
const InterviewAnalytics = require('../models/InterviewAnalyticsModel.js');
const RoundDetail = require('../models/RoundDetailModel.js');
const PerformanceInsight = require('../models/PerformanceInsightModel.js');
const Campaign = require('../models/CampaignModel.js');
const AIStudyPlan = require('../models/AIStudyPlanModel.js');
const OrganizationModel = require('../models/OrganizationModel.js');
const PlacementBatchModel = require('../models/PlacementBatchModel.js');
const { GoogleGenAI } = require('@google/genai');


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


const computeReadinessScore = async (studentId) => {
    const profile = await StudentProfile.findOne({ user: studentId });
    if (!profile) return 0;

    const scores = [
        profile.placementReadinessScore || 0,
        profile.techScore || 0,
        profile.aptitudeScore || 0,
        profile.codingScore || 0,
        profile.communicationScore || 0,
        profile.atsScore || 0
    ];

    const profileScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);


    const sessions = await InterviewSession.find({ student: studentId, status: 'completed' });
    const sessionCount = sessions.length;
    const avgScore = sessionCount > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.finalCompositeScore || 0), 0) / sessionCount)
        : 0;


    const composite = Math.round((profileScore * 0.55) + (avgScore * 0.45));
    return Math.max(0, Math.min(100, composite));
};


const getNextScheduledMock = async (studentId) => {
    const upcoming = await InterviewSession.findOne({
        student: studentId,
        status: 'initialized'
    })
    .sort({ createdAt: -1 })
    .populate('campaign', 'title deadline companyTemplateDetails.role')
    .lean();

    if (!upcoming) {
        const student = await User.findById(studentId).select('organization').lean();
        const studentProfile = await StudentProfile.findOne({ user: studentId }).select('branch graduationYear targetRole').lean();

        let campaignQuery = {
            isActive: true,
            deadline: { $gte: new Date() }
        };

        if (student?.organization) {
            const organization = await OrganizationModel.findOne({ organizationName: student.organization }).select('_id').lean();

            if (organization) {
                const studentBatches = await PlacementBatchModel.find({
                    organization: organization._id
                }).select('_id').lean();
                const batchIds = studentBatches.map(b => b._id);

                if (batchIds.length > 0) {
                    campaignQuery['assignedBatches.batch'] = { $in: batchIds };
                    campaignQuery['assignedBatches.status'] = 'active';
                }
            }
        }

        if (studentProfile?.targetRole) {
            campaignQuery.$or = [
                { 'companyTemplateDetails.role': { $regex: studentProfile.targetRole, $options: 'i' } },
                { 'assessmentTypes.type': { $in: ['aptitude', 'coding', 'technical'] } }
            ];
        }

        const latestCampaign = await Campaign.findOne(campaignQuery)
            .sort({ deadline: 1 })
            .select('title deadline companyTemplateDetails')
            .lean();

        if (latestCampaign) {
            return {
                date: latestCampaign.deadline,
                targetRole: latestCampaign.companyTemplateDetails?.role || latestCampaign.title,
                title: latestCampaign.title,
                isEstimated: true
            };
        }
        return null;
    }

    return {
        date: upcoming.startedAt || upcoming.createdAt,
        targetRole: upcoming.targetRole,
        jobDescription: upcoming.jobDescription,
        isEstimated: false
    }
};


const roundTypeDisplayMap = {
    aptitude: 'Aptitude',
    coding: 'Coding',
    technical: 'Technical',
    hr: 'HR',
};


const buildRadarData = (session) => {
    const roundScores = {};

    if (session.roundAnalytics && session.roundAnalytics.length > 0) {
        session.roundAnalytics.forEach(ra => {
            roundScores[ra.roundType] = Math.round((ra.totalScore / ra.maxPossibleScore) * 100);
        });
    }

    if (session.skillScores) {
        Object.entries(session.skillScores).forEach(([key, val]) => {
            if (!roundScores[key] && val !== undefined) {
                roundScores[key] = val;
            }
        });
    }

    const labels = Object.keys(roundScores).map(k => roundTypeDisplayMap[k] || k.charAt(0).toUpperCase() + k.slice(1));
    const data = Object.values(roundScores);

    return { labels, data };
};


const buildLineData = async (studentId) => {
    const sessions = await InterviewAnalytics.aggregate([
        { $match: { student: new mongoose.Types.ObjectId(studentId), completedAt: { $ne: null } } },
        { $sort: { completedAt: 1 } },
        { $project: { _id: 0, timestamp: '$completedAt', score: '$overallScore', sessionId: '$_id' } }
    ]);

    return sessions.map(s => ({
        date: new Date(s.timestamp).toISOString().split('T')[0],
        score: s.score
    }));
};


const buildBarData = async (studentId) => {
    const latestSession = await InterviewSession.findOne({ student: studentId })
        .sort({ createdAt: -1 })
        .lean();

    const profile = await StudentProfile.findOne({ user: studentId }).lean();

    const competencyScores = {
        'Technical': profile?.techScore || 0,
        'Aptitude': profile?.aptitudeScore || 0,
        'Coding': profile?.codingScore || 0,
        'Communication': profile?.communicationScore || 0,
        'ATS Score': profile?.atsScore || 0,
        'Readiness': profile?.placementReadinessScore || 0
    };

    return {
        labels: Object.keys(competencyScores),
        data: Object.values(competencyScores)
    };
};


const getDashboardAnalytics = async (studentId) => {
    const [readinessScore, lastSession, totalInterviews, profile, nextMock] = await Promise.all([
        computeReadinessScore(studentId),
        InterviewSession.findOne({ student: studentId, status: 'completed' }).sort({ completedAt: -1 }).lean(),
        InterviewSession.countDocuments({ student: studentId, status: 'completed' }),
        StudentProfile.findOne({ user: studentId }).lean(),
        getNextScheduledMock(studentId)
    ]);

    const lastInterviewScore = lastSession?.finalCompositeScore ?? null;

    let activeStreak = 0;
    if (profile) {
        activeStreak = profile.streakDays || 0;
    }

    const profileSession = lastSession
        ? await InterviewAnalytics.findOne({ session: lastSession._id }).lean()
        : null;

    const radarData = profileSession ? buildRadarData(profileSession) : { labels: [], data: [] };
    const [lineData, barData] = await Promise.all([
        buildLineData(studentId),
        buildBarData(studentId)
    ]);

    const nextScheduledMock = nextMock ? {
        date: nextMock.date,
        targetRole: nextMock.targetRole,
        title: nextMock.title,
        isEstimated: nextMock.isEstimated
    } : null;

    return {
        readinessScore,
        lastInterviewScore,
        totalInterviews,
        activeStreak,
        nextScheduledMock,
        chartData: {
            radarData,
            lineData,
            barData
        }
    };
};


const getHistoricalReports = async (studentId, query) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const { roundType, from, to, status, minScore, maxScore } = query;

    const matchQuery = { student: new mongoose.Types.ObjectId(studentId) };

    if (roundType) matchQuery['roundAnalytics.roundType'] = roundType;

    if (from || to) {
        matchQuery.completedAt = {};
        if (from) matchQuery.completedAt.$gte = new Date(from);
        if (to) matchQuery.completedAt.$lte = new Date(to);
    }

    if (status) matchQuery.status = status;

    if (minScore !== undefined || maxScore !== undefined) {
        matchQuery.overallScore = {};
        if (minScore !== undefined) matchQuery.overallScore.$gte = parseInt(minScore);
        if (maxScore !== undefined) matchQuery.overallScore.$lte = parseInt(maxScore);
    }

    const [analytics, total, allSessions] = await Promise.all([
        InterviewAnalytics.find(matchQuery)
            .sort({ completedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('campaign', 'title description')
            .lean(),
        InterviewAnalytics.countDocuments(matchQuery),
        InterviewAnalytics.find(matchQuery)
            .sort({ completedAt: -1 })
            .populate('campaign', 'title description')
            .lean()
    ]);

    const reportIds = analytics.map(a => a.session);

    const [roundDetailsMap, insightsMap] = await Promise.all([
        RoundDetail.find({ session: { $in: reportIds } }).lean(),
        PerformanceInsight.find({ session: { $in: reportIds } }).lean()
    ]);

    const roundDetailsBySession = {};
    roundDetailsMap.forEach(rd => {
        const sid = String(rd.session);
        if (!roundDetailsBySession[sid]) roundDetailsBySession[sid] = [];
        roundDetailsBySession[sid].push(rd);
    });

    const insightsBySession = {};
    insightsMap.forEach(ins => {
        const sid = String(ins.session);
        if (!insightsBySession[sid]) insightsBySession[sid] = ins;
    });

    const reports = allSessions.map(a => {
        const sid = String(a._id);
        const sessionRoundDetails = roundDetailsBySession[sid] || [];
        const insight = insightsBySession[sid];

        const transcriptEntries = [];
        sessionRoundDetails.forEach(rd => {
            rd.questionsEvaluations.forEach(qe => {
                if (qe.isAttempted) {
                    transcriptEntries.push({
                        roundType: rd.roundType,
                        questionText: qe.questionText,
                        studentAnswer: qe.studentAnswer || '',
                        idealAnswer: qe.idealAnswer || '',
                        score: qe.score,
                        isCorrect: qe.score > 0,
                        language: qe.language || '',
                        codingMetadata: qe.codingMetadata || null,
                        evaluation: {
                            keywordCoverage: qe.evaluationLayers?.l1KeywordCoverage || 0,
                            semanticSimilarity: qe.evaluationLayers?.l2SemanticSimilarity || 0,
                            rubricCorrectness: qe.evaluationLayers?.l3LlmRubricCorrectness || 0,
                            explanation: qe.evaluationLayers?.l3LlmExplanation || ''
                        }
                    });
                }
            });
        });

        const evaluatorFeedback = insight ? {
            narrativeSummary: insight.narrativeSummary || '',
            strengths: insight.strengths || [],
            weaknesses: insight.weaknesses || [],
            actionableStudyPlan: insight.actionableStudyPlan || []
        } : null;

        const roundBreakdown = (a.roundAnalytics || []).map(ra => ({
            roundType: ra.roundType,
            score: ra.totalScore,
            maxScore: ra.maxPossibleScore,
            percentage: Math.round((ra.totalScore / ra.maxPossibleScore) * 100),
            questionsAttempted: ra.questionsAttempted,
            timeSpentSeconds: ra.timeSpentSeconds
        }));

        const sessionDetails = a.session;

        return {
            id: a._id,
            sessionId: a.session,
            startedAt: a.startedAt,
            completedAt: a.completedAt,
            totalDuration: a.totalDurationSeconds,
            formattedDuration: `${Math.floor(a.totalDurationSeconds / 60)}m ${a.totalDurationSeconds % 60}s`,
            overallScore: a.overallScore,
            finalGrade: a.finalGrade,
            proctoringRiskScore: a.proctoringRiskScore,
            isDisqualified: a.isDisqualified,
            skillScores: a.skillScores,
            campaign: a.campaign,
            roundBreakdown,
            transcript: transcriptEntries,
            evaluatorFeedback,
            sessionDetails: sessionDetails ? {
                targetRole: sessionDetails.targetRole || a.metadata?.targetRole || '',
                jobDescription: sessionDetails.jobDescription || a.metadata?.jobDescription || '',
                preferredCodingLanguage: sessionDetails.preferredCodingLanguage || a.metadata?.preferredCodingLanguage || '',
                status: sessionDetails.status || 'completed'
            } : {
                targetRole: a.metadata?.targetRole || '',
                jobDescription: a.metadata?.jobDescription || '',
                preferredCodingLanguage: a.metadata?.preferredCodingLanguage || '',
                status: 'completed'
            }
        };
    });

    const scoreRange = {
        min: allSessions.length > 0 ? Math.min(...allSessions.map(s => s.overallScore)) : 0,
        max: allSessions.length > 0 ? Math.max(...allSessions.map(s => s.overallScore)) : 0,
        average: allSessions.length > 0
            ? Math.round(allSessions.reduce((sum, s) => sum + s.overallScore, 0) / allSessions.length)
            : 0
    };

    return {
        reports,
        summary: {
            totalReports: total,
            scoreRange,
            gradeDistribution: allSessions.reduce((acc, s) => {
                acc[s.finalGrade || 'Pending'] = (acc[s.finalGrade || 'Pending'] || 0) + 1;
                return acc;
            }, {})
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
};


const buildStudyPlanPrompt = (studentId) => {
    return `You are an expert career coach and technical mentor for EdTech placement preparation. Generate a highly personalized, structured study plan in valid JSON format.

Required JSON structure:
{
  "planTitle": "string - descriptive title for this study plan",
  "priority": "high|medium|low",
  "narrativeSummary": "string - 2-3 sentence executive summary of the student's current standing and target",
  "keyImprovementAreas": ["array of strings - top 5 weakness areas"],
  "estimatedTotalHours": number,
  "topics": [
    {
      "topicName": "string",
      "subtopics": ["array of strings"],
      "estimatedHours": number,
      "priority": "high|medium|low",
      "competencyBefore": 0-100,
      "resources": [
        { "type": "video|article|practice|documentation|course", "title": "string", "url": "string", "priority": "high|medium|low" }
      ]
    }
  ],
  "milestones": [
    { "week": 1, "title": "string", "topics": ["strings"], "targetCompetency": 0-100 }
  ]
}

Rules:
1. topics array must have 8-12 entries
2. milestones must span 4-8 weeks
3. estimatedHours should sum realistically (typical study week is 10-15 hours)
4. competencyBefore scores must reflect current skill gaps from performance data
5. resources must be real, high-quality resources (LeetCode, GeeksforGeeks, HackerRank, freeCodeCamp, official docs)
6. keyImprovementAreas must be derived from the student's weakness areas
7. Do NOT include markdown blocks, just pure JSON`;
};


const generateAISchemaPrompt = (targetRole, jobDescription, profile, performanceData, studentId) => {
    const roleContext = {
        'backend developer': 'Focus on Node.js, databases, API design, system design, caching, message queues, and cloud infrastructure.',
        'frontend developer': 'Focus on React/Vue, CSS architecture, performance optimization, accessibility, browser APIs, and state management.',
        'full stack developer': 'Cover full stack fundamentals: frontend frameworks, backend APIs, databases, DevOps basics, and deployment.',
        'data analyst': 'Focus on SQL, Python (pandas/numpy), data visualization, statistics, A/B testing, and business intelligence.',
        'data scientist': 'Emphasize ML algorithms, statistics, Python ML libraries, data preprocessing, model evaluation, and feature engineering.',
        'devops engineer': 'Focus on CI/CD pipelines, Docker/Kubernetes, cloud platforms (AWS/GCP/Azure), monitoring, infrastructure-as-code, and Linux.',
        'software engineer': 'Focus on DSA, system design, clean code, testing, version control, and language-agnostic fundamentals.',
        'product manager': 'Focus on product strategy, user research, Agile/Scrum, data-driven decision making, and cross-functional leadership.'
    };

    const roleLower = targetRole.toLowerCase();
    let context = roleContext[roleLower] || roleContext['software engineer'];

    const jdSnippet = jobDescription ? jobDescription.substring(0, 1500) : 'General software engineering role';

    const prompt = `You are an expert AI placement coach generating an adaptive study plan for a student aspiring to become a "${targetRole}".

STUDENT PROFILE:
- CGPA: ${profile?.cgpa || 'N/A'}
- Target Role: ${targetRole}
- Branch: ${profile?.branch || 'N/A'}
- Tech Score: ${profile?.techScore || 0}/100
- Aptitude Score: ${profile?.aptitudeScore || 0}/100
- Coding Score: ${profile?.codingScore || 0}/100
- Communication Score: ${profile?.communicationScore || 0}/100
- ATS Score: ${profile?.atsScore || 0}/100
- Placement Readiness Score: ${profile?.placementReadinessScore || 0}/100
- Skill Gaps: ${profile?.skillGaps?.join(', ') || 'None listed'}

RECENT PERFORMANCE SUMMARY:
- Total Mock Interviews: ${performanceData.totalSessions || 0}
- Average Score: ${performanceData.averageScore || 0}/100
- Grade Distribution: ${JSON.stringify(performanceData.gradeDistribution || {})}
- Round-wise Average: ${JSON.stringify(performanceData.roundBreakdown || {})}

JOB DESCRIPTION EXCERPT:
${jdSnippet}

ROLE-SPECIFIC COACHING CONTEXT:
${context}

${buildStudyPlanPrompt(studentId)}

IMPORTANT: Adapt topics specifically to the "${targetRole}" role. Include role-specific competency benchmarks, realistic milestone timelines, and curated resources that align with the job description.`;

    return prompt;
};


const generateStudyPlanForStudent = async (studentId, sourceSessionId = null, targetRole = null, jobDescription = '') => {
    const student = await User.findById(studentId).select('name email role');
    if (!student) throw new Error('Student not found.');

    const profile = await StudentProfile.findOne({ user: studentId }).lean();
    if (!profile) throw new Error('Student profile not found. Complete your profile first.');

    let sessionTargetRole = targetRole || profile.targetRole;

    let sessionPerformance = {
        totalSessions: 0,
        averageScore: 0,
        gradeDistribution: {},
        roundBreakdown: {}
    };

    const relevantSessions = await InterviewSession.find({
        student: studentId,
        targetRole: { $ne: null }
    }).lean();

    if (relevantSessions.length > 0) {
        const avgScore = Math.round(relevantSessions.reduce((s, s2) => s + (s2.finalCompositeScore || 0), 0) / relevantSessions.length);
        const gradeDist = relevantSessions.reduce((acc, s) => {
            acc[s.finalGrade || 'Pending'] = (acc[s.finalGrade || 'Pending'] || 0) + 1;
            return acc;
        }, {});

        const sessionIds = relevantSessions.map(s => s._id);
        const analyticsDocs = await InterviewAnalytics.find({ session: { $in: sessionIds } }).lean();

        const roundBreakdown = {};
        analyticsDocs.forEach(a => {
            if (a.roundAnalytics) {
                a.roundAnalytics.forEach(ra => {
                    if (!roundBreakdown[ra.roundType]) roundBreakdown[ra.roundType] = { totalScore: 0, maxScore: 0, count: 0 };
                    roundBreakdown[ra.roundType].totalScore += ra.totalScore || 0;
                    roundBreakdown[ra.roundType].maxScore += ra.maxPossibleScore || 100;
                    roundBreakdown[ra.roundType].count += 1;
                });
            }
        });
        Object.keys(roundBreakdown).forEach(rt => {
            roundBreakdown[rt] = {
                avgScore: Math.round(roundBreakdown[rt].totalScore / roundBreakdown[rt].count)
            };
        });

        sessionPerformance = {
            totalSessions: relevantSessions.length,
            averageScore: avgScore,
            gradeDistribution: gradeDist,
            roundBreakdown
        };
    }

    let sessionJobDescription = jobDescription;
    let sourceAnalytics = null;

    if (sourceSessionId) {
        const session = await InterviewSession.findById(sourceSessionId).lean();
        if (session) {
            sessionTargetRole = targetRole || session.targetRole;
            sessionJobDescription = jobDescription || session.jobDescription || '';

            sourceAnalytics = await InterviewAnalytics.findOne({ session: sourceSessionId }).lean();
            if (sourceAnalytics) {
                sessionPerformance = {
                    totalSessions: 1,
                    averageScore: sourceAnalytics.overallScore || 0,
                    gradeDistribution: { [sourceAnalytics.finalGrade || 'Pending']: 1 },
                    roundBreakdown: {}
                };
                if (sourceAnalytics.roundAnalytics) {
                    sourceAnalytics.roundAnalytics.forEach(ra => {
                        sessionPerformance.roundBreakdown[ra.roundType] = {
                            avgScore: ra.totalScore
                        };
                    });
                }
            }
        }
    }

    const prompt = generateAISchemaPrompt(
        sessionTargetRole,
        sessionJobDescription || profile.targetRole || 'Software Engineer',
        profile,
        sessionPerformance,
        studentId
    );

    let planData;
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        planData = JSON.parse(res.text);
    } catch (error) {
        logger.error('Gemini plan generation error:', error);
        planData = generateFallbackStudyPlan(sessionTargetRole, profile, sessionPerformance);
    }

    const topics = (planData.topics || []).map(t => ({
        topicName: t.topicName,
        subtopics: t.subtopics || [],
        estimatedHours: t.estimatedHours || 0,
        priority: t.priority || 'medium',
        competencyBefore: t.competencyBefore || 0,
        resources: (t.resources || []).map(r => ({
            type: r.type || 'article',
            title: r.title,
            url: r.url || '',
            priority: r.priority || 'medium'
        }))
    }));

    const milestones = (planData.milestones || []).map(m => ({
        week: m.week,
        title: m.title,
        topics: m.topics || [],
        targetCompetency: m.targetCompetency || 70
    }));

    const overallCompetencyBefore = profile.placementReadinessScore ||
        Math.round([
            profile.techScore || 0,
            profile.aptitudeScore || 0,
            profile.codingScore || 0,
            profile.communicationScore || 0
        ].reduce((a, b) => a + b, 0) / 4);

    const studyPlan = await AIStudyPlan.create({
        student: studentId,
        sourceSession: sourceSessionId || null,
        targetRole: sessionTargetRole,
        jobDescriptionSummary: (sessionJobDescription || '').substring(0, 2000),
        planTitle: planData.planTitle || `Study Plan: ${sessionTargetRole}`,
        priority: planData.priority || 'medium',
        overallCompetencyBefore: Math.min(100, Math.max(0, overallCompetencyBefore)),
        topics,
        milestones,
        estimatedTotalHours: planData.estimatedTotalHours || topics.reduce((s, t) => s + t.estimatedHours, 0),
        status: 'active',
        narrativeSummary: planData.narrativeSummary || '',
        keyImprovementAreas: planData.keyImprovementAreas || [],
        aiModelUsed: 'gemini-2.5-flash',
        generatedBy: 'ai'
    });

    return studyPlan;
};


const generateFallbackStudyPlan = (targetRole, profile, performanceData) => {
    const roleLower = (targetRole || 'software engineer').toLowerCase();
    const baseTopics = {
        'backend developer': [
            { topicName: 'Node.js & Express', subtopics: ['Event Loop', 'Streams', 'Middleware', 'Error Handling'], estimatedHours: 20 },
            { topicName: 'Database Design (SQL)', subtopics: ['Normalization', 'Indexing', 'ACID', 'Joins'], estimatedHours: 15 },
            { topicName: 'MongoDB & NoSQL', subtopics: ['Aggregation Pipeline', 'Sharding', 'Replication'], estimatedHours: 12 },
            { topicName: 'System Design Fundamentals', subtopics: ['Load Balancing', 'Caching', 'API Design'], estimatedHours: 18 },
            { topicName: 'REST & GraphQL APIs', subtopics: ['Versioning', 'Rate Limiting', 'Auth'], estimatedHours: 12 },
            { topicName: 'Authentication & Authorization', subtopics: ['JWT', 'OAuth2', 'Sessions'], estimatedHours: 10 },
            { topicName: 'Message Queues & Events', subtopics: ['Redis Pub/Sub', 'RabbitMQ', 'Kafka basics'], estimatedHours: 15 },
            { topicName: 'Testing & CI/CD', subtopics: ['Jest/Mocha', 'GitHub Actions', 'Docker'], estimatedHours: 10 }
        ],
        'frontend developer': [
            { topicName: 'React Fundamentals', subtopics: ['Hooks', 'State Management', 'Virtual DOM'], estimatedHours: 20 },
            { topicName: 'CSS Architecture', subtopics: ['Flexbox', 'Grid', 'BEM', 'Tailwind'], estimatedHours: 12 },
            { topicName: 'TypeScript', subtopics: ['Types', 'Interfaces', 'Generics'], estimatedHours: 15 },
            { topicName: 'State Management', subtopics: ['Redux', 'Zustand', 'Context API'], estimatedHours: 10 },
            { topicName: 'Next.js & SSR', subtopics: ['SSR/SSG', 'App Router', 'API Routes'], estimatedHours: 15 },
            { topicName: 'Browser APIs & Performance', subtopics: ['CORS', 'Web Workers', 'Lazy Loading'], estimatedHours: 10 },
            { topicName: 'Web Accessibility', subtopics: ['ARIA', 'Screen Readers', 'Semantic HTML'], estimatedHours: 8 },
            { topicName: 'Frontend Testing', subtopics: ['Jest', 'React Testing Library', 'Cypress'], estimatedHours: 10 }
        ],
        'default': [
            { topicName: 'Data Structures & Algorithms', subtopics: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'DP'], estimatedHours: 30 },
            { topicName: 'Object-Oriented Programming', subtopics: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'], estimatedHours: 12 },
            { topicName: 'Database Fundamentals', subtopics: ['SQL', 'Normalization', 'Transactions'], estimatedHours: 12 },
            { topicName: 'Operating Systems', subtopics: ['Process Management', 'Memory', 'Deadlocks'], estimatedHours: 10 },
            { topicName: 'Computer Networks', subtopics: ['OSI Model', 'TCP/IP', 'DNS', 'HTTP'], estimatedHours: 10 },
            { topicName: 'System Design Basics', subtopics: ['Scalability', 'Load Balancing'], estimatedHours: 8 },
            { topicName: 'Communication Skills', subtopics: ['Mock Interviews', 'Group Discussions'], estimatedHours: 8 },
            { topicName: 'Soft Skills & HR Prep', subtopics: ['Resume Writing', 'Behavioral Questions'], estimatedHours: 5 }
        ]
    };

    const topicsKey = Object.keys(baseTopics).find(k => roleLower.includes(k)) || 'default';
    const topics = baseTopics[topicsKey].map(t => ({
        ...t,
        priority: t.estimatedHours > 15 ? 'high' : 'medium',
        competencyBefore: Math.max(0, Math.round((profile?.placementReadinessScore || 50) + (Math.random() * 30 - 15))),
        resources: [
            { type: 'article', title: `${t.topicName} - Official Documentation`, url: 'https://developer.mozilla.org', priority: 'high' },
            { type: 'practice', title: `${t.topicName} Practice Problems`, url: 'https://leetcode.com', priority: 'medium' }
        ]
    }));

    const totalHours = topics.reduce((sum, t) => sum + t.estimatedHours, 0);
    const weeks = Math.ceil(totalHours / 10);

    return {
        planTitle: `AI-Generated Study Plan: ${targetRole}`,
        priority: 'high',
        narrativeSummary: `A structured ${weeks}-week study plan designed to elevate your competency for the ${targetRole} role. Based on your current readiness score of ${profile?.placementReadinessScore || 'N/A'}/100, this plan focuses on gap areas with high-impact resources.`,
        keyImprovementAreas: ['Technical Depth', 'System Design Awareness', 'Practical Coding Practice', 'Communication Skills', 'Domain Knowledge'],
        estimatedTotalHours: totalHours,
        topics,
        milestones: Array.from({ length: Math.min(weeks, 8) }, (_, i) => ({
            week: i + 1,
            title: `Week ${i + 1}: Focus on Phase ${i + 1}`,
            topics: topics.slice(i * (Math.ceil(topics.length / weeks)), (i + 1) * (Math.ceil(topics.length / weeks))).map(t => t.topicName),
            targetCompetency: Math.min(100, 50 + ((i + 1) * 7))
        }))
    };
};

const listStudyPlansForStudent = async (studentId) => {
    const plans = await AIStudyPlan.find({ student: studentId })
        .sort({ createdAt: -1 })
        .lean();

    const grouped = {};
    plans.forEach(plan => {
        const role = plan.targetRole || 'unspecified';
        if (!grouped[role]) grouped[role] = [];
        grouped[role].push(plan);
    });

    return grouped;
};

const getStudyPlanById = async (planId, studentId) => {
    const plan = await AIStudyPlan.findOne({ _id: planId, student: studentId }).lean();
    if (!plan) return null;

    const nextMilestones = (plan.milestones || [])
        .filter(m => m.week > 1)
        .slice(0, 5);

    return {
        ...plan,
        upcomingMilestones: nextMilestones,
        topicCount: plan.topics?.length || 0,
        milestoneCount: plan.milestones?.length || 0,
        completedTopics: plan.topics?.filter(t => t.competencyBefore >= 80).length || 0
    };
};


module.exports = {
    getDashboardAnalytics,
    getHistoricalReports,
    generateStudyPlanForStudent,
    listStudyPlansForStudent,
    getStudyPlanById,
    generateFallbackStudyPlan
};
