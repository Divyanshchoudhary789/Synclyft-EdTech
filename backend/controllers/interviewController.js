const mongoose = require("mongoose");
const axios = require("axios");
const pdfParse = require("pdf-parse");
const sendError = require("../utils/sendError.js");
const InterviewSession = require("../models/InterviewSessionModel.js");
const InterviewAnalytics = require("../models/InterviewAnalyticsModel.js");
const StudentProfile = require("../models/StudentProfileModel.js");
const RoundDetail = require("../models/RoundDetailModel.js");
const PerformanceInsight = require("../models/PerformanceInsightModel.js");
const User = require("../models/userModel.js");

const deleteFromR2 = require("../utils/deleteFromR2.js");
const uploadToR2 = require("../utils/r2Upload.js");

const executeCodeOnJudge0 = require("../services/evaluationService.js");
const { analyzeAptitudeResponse, analyzeCodingResponse, analyzeTechnicalResponse, analyzeHrResponse, compileFinalReportCard } = require("../services/geminiService.js");

const NotificationService = require("../services/notificationService");

const logger = require("../services/loggerService");

const {
    startRoundTimer,
    clearRoundTimers,
} = require("../services/timerService.js");
const { computeRoundDurationSeconds, ROUND_DURATION_POLICY } = require("../utils/interviewTimerConfig.js");
const { createSimliSessionToken } = require("../services/simliService.js");

const { consumeEntitlement } = require("../middlewares/seatAccessMiddleware.js");


const { codingDbName, aptitudeDbName } = require("../config/env.js");

const getMongoTestCasesCollection = () => {
    const codingDb = mongoose.connection.useDb(codingDbName, { useCache: true });
    return codingDb.collection("question_test_cases");
}

const getMongoIdealSolutionsCollection = () => {
    const codingDb = mongoose.connection.useDb(codingDbName, { useCache: true });
    return codingDb.collection("ideal_solutions");
}

const getMongoAptitudeAnswersCollection = () => {
    const aptitudeDb = mongoose.connection.useDb(aptitudeDbName, { useCache: true });
    return aptitudeDb.collection("answers");
}


// ─────────────────────────────────────────────────────────────────────────────
// Coding-question shaping
//
// The upstream question service returns a loosely-typed blob. The client needs a
// stable, LeetCode-style shape: a title, a body, difficulty, tags, constraints,
// worked examples and a set of *visible* sample test cases it can run against.
// ─────────────────────────────────────────────────────────────────────────────

const toStr = (v) => (v == null ? "" : String(v)).trim();

const fetchPublicTestCases = async (questionId) => {
    try {
        const col = await getMongoTestCasesCollection();
        const doc = await col.findOne({ questionId });
        if (!doc) return [];
        const pub = Array.isArray(doc.public) ? doc.public : [];
        return pub.slice(0, 6).map((tc, i) => ({
            id: `sample-${i + 1}`,
            input: typeof tc?.input === "string" ? tc.input : JSON.stringify(tc?.input ?? ""),
            expectedOutput: typeof tc?.expectedOutput === "string" ? tc.expectedOutput : JSON.stringify(tc?.expectedOutput ?? ""),
            explanation: toStr(tc?.explanation),
        }));
    } catch (e) {
        logger.error("public test-case lookup failed", { questionId, error: e.message });
        return [];
    }
};

const firstArray = (...cands) => cands.find((c) => Array.isArray(c) && c.length) || [];

const normalizeCodingQuestion = (raw = {}, publicTestCases = []) => {
    // `raw` may be the provider's `selectedQuestion`, or a wrapper around it.
    const q = raw?.selectedQuestion || raw?.question || raw || {};

    const statement = toStr(q.problemStatement || q.statement || q.description || q.body || q.question);
    // Derive a title: an explicit field, else the first sentence / line of the body.
    let title = toStr(q.title || q.name || q.questionTitle);
    if (!title && statement) {
        const firstLine = statement.split(/\r?\n/).find((l) => l.trim());
        title = (firstLine || "").replace(/[.:].*$/, "").slice(0, 90).trim();
    }

    const rawExamples = firstArray(q.examples, q.sampleCases, q.sampleTestCases, q.testCases);
    const examples = rawExamples
        .filter((e) => e && (e.input != null || e.output != null || e.expectedOutput != null))
        .slice(0, 6)
        .map((e, i) => ({
            id: `ex-${i + 1}`,
            input: toStr(typeof e.input === "string" ? e.input : JSON.stringify(e.input ?? "")),
            output: toStr(
                typeof (e.output ?? e.expectedOutput) === "string"
                    ? (e.output ?? e.expectedOutput)
                    : JSON.stringify(e.output ?? e.expectedOutput ?? "")
            ),
            explanation: toStr(e.explanation || e.note),
        }));

    const constraints = firstArray(q.constraints, q.constraintList)
        .map((c) => toStr(c)).filter(Boolean);

    const topicTags = firstArray(q.topicTags, q.tags, q.topics, q.categories)
        .map((t) => toStr(typeof t === "string" ? t : t?.name)).filter(Boolean).slice(0, 8);

    // Per-language starter code, if the provider ships it.
    const starterCode = {};
    const rawStarters = q.starterCode || q.boilerplate || q.codeStubs || q.templates;
    if (rawStarters && typeof rawStarters === "object") {
        for (const [k, v] of Object.entries(rawStarters)) {
            const code = typeof v === "string" ? v : toStr(v?.code || v?.template);
            if (code) starterCode[k.toLowerCase()] = code;
        }
    }

    return {
        questionId: toStr(q.questionId || q.id || q._id),
        title: title || "Coding Problem",
        problemStatement: statement,
        difficulty: toStr(q.difficulty || q.level || q.difficultyTag) || "Medium",
        topicTags,
        constraints,
        examples,
        sampleTestCases: publicTestCases,
        starterCode,
        timeLimitMs: Number(q.timeLimitMs || q.timeLimit || 0) || null,
        memoryLimitKb: Number(q.memoryLimitKb || q.memoryLimit || 0) || null,
    };
};

// Run (not submit): execute the candidate's code against only the visible sample
// cases. No AI grading, no persistence — this is the "Run" button, mirroring
// LeetCode. Degrades gracefully when the sandbox is offline.
const runCodeAgainstSamples = async ({ questionId, code, language }) => {
    const samples = await fetchPublicTestCases(questionId);
    if (samples.length === 0) {
        return { sandboxAvailable: false, ran: false, message: "This problem has no visible sample cases to run. Use Submit to have your solution evaluated.", cases: [] };
    }

    const tcForJudge = samples.map((s) => ({ input: s.input, expectedOutput: s.expectedOutput }));

    try {
        const outputs = await executeCodeOnJudge0(code, language, tcForJudge);
        const dec = (b) => (b ? Buffer.from(b, "base64").toString("utf-8") : "");
        const cases = samples.map((s, i) => {
            const o = outputs[i] || {};
            return {
                id: s.id,
                input: s.input,
                expectedOutput: s.expectedOutput,
                stdout: dec(o.stdout).trimEnd(),
                stderr: dec(o.stderr).trimEnd(),
                compileOutput: dec(o.compile_output).trimEnd(),
                status: o.status?.description || "Executed",
                passed: o.status_id === 3,
                runtimeMs: o.time ? Math.round(parseFloat(o.time) * 1000) : null,
                memoryKb: o.memory || null,
            };
        });
        return {
            sandboxAvailable: true,
            ran: true,
            passed: cases.filter((c) => c.passed).length,
            total: cases.length,
            cases,
        };
    } catch (err) {
        if (err.isSandboxUnavailable) {
            return {
                sandboxAvailable: false,
                ran: false,
                message: "The code sandbox is temporarily unavailable. You can still Submit — your solution will be evaluated on code inspection.",
                cases: samples.map((s) => ({ id: s.id, input: s.input, expectedOutput: s.expectedOutput, passed: null, status: "Not run" })),
            };
        }
        throw err;
    }
};


// Shared evaluation for the coding + technical rounds. Runs the candidate's code
// against the hidden test cases on Judge0 and grades it with Gemini. When the
// sandbox is unavailable it degrades to code-inspection grading so the round
// still completes and the submission is never lost.
const evaluateCodeSubmission = async ({ roundDoc, questionId, code, language, grader = analyzeCodingResponse }) => {
    const targetQuestion = roundDoc.questionsEvaluations.find((q) => q.questionId === questionId);
    if (!targetQuestion) {
        return { error: { status: 404, message: "That question is not part of this round." } };
    }

    let testCases = [];
    try {
        const testCasesCollection = await getMongoTestCasesCollection();
        const testCasesDoc = await testCasesCollection.findOne({ questionId });
        if (testCasesDoc) {
            testCases = [...(testCasesDoc.public || []), ...(testCasesDoc.hidden || [])];
        }
    } catch (e) {
        logger.error("test-case lookup failed", { questionId, error: e.message });
    }

    let successfulCasesCount = 0;
    let totalTestCases = testCases.length;
    let sampleNodeMeta = {};
    let sandboxAvailable = true;
    let compilerOutputContext;

    if (testCases.length > 0) {
        try {
            const executionOutputs = await executeCodeOnJudge0(code, language, testCases);
            successfulCasesCount = executionOutputs.filter((o) => o.status_id === 3).length;
            sampleNodeMeta = executionOutputs[0] || {};
            const dec = (b) => (b ? Buffer.from(b, "base64").toString("utf-8") : "");
            compilerOutputContext = `Status: ${sampleNodeMeta?.status?.description || "Executed"} | Passed: ${successfulCasesCount}/${totalTestCases} | stdout: ${dec(sampleNodeMeta?.stdout)} | compile_err: ${dec(sampleNodeMeta?.compile_output)} | runtime_ex: ${dec(sampleNodeMeta?.stderr)}`;
        } catch (err) {
            if (err.isSandboxUnavailable) {
                sandboxAvailable = false;
                compilerOutputContext = "Code execution sandbox was unavailable. Grade strictly on code inspection: correctness of the algorithm, data structures, complexity and edge-case handling versus the ideal reference.";
                logger.warn("Judge0 unavailable — grading on inspection", { questionId });
            } else {
                throw err;
            }
        }
    } else {
        sandboxAvailable = false;
        compilerOutputContext = "No executable test cases available for this problem. Grade on code inspection versus the ideal reference.";
    }

    const aiGrading = await grader({
        questionText: targetQuestion.questionText,
        studentCode: code,
        language,
        compilerOutputContext,
        idealAnswer: targetQuestion.idealAnswer,
    });

    targetQuestion.studentAnswer = code;
    targetQuestion.language = language;
    targetQuestion.isAttempted = true;
    targetQuestion.score = Math.max(0, Math.min(10, Number(aiGrading.score) || 0));
    targetQuestion.codingMetadata = {
        language,
        testCasesPassed: successfulCasesCount,
        totalTestCases,
        runtimeMs: sampleNodeMeta.time ? parseFloat(sampleNodeMeta.time) * 1000 : 0,
        memoryKb: sampleNodeMeta.memory || 0,
        timeComplexity: aiGrading.timeComplexity || "",
        spaceComplexity: aiGrading.spaceComplexity || "",
        statusDescription: sandboxAvailable
            ? (sampleNodeMeta.status?.description || "Executed")
            : "Evaluated on code inspection (sandbox unavailable)",
    };
    targetQuestion.evaluationLayers = {
        l1KeywordCoverage: aiGrading.keywordCoverage || 0,
        l2SemanticSimilarity: aiGrading.semanticSimilarity || 0,
        l3LlmRubricCorrectness: aiGrading.rubricCorrectness || 0,
        l3LlmExplanation: aiGrading.explanation || "",
    };

    roundDoc.roundScore = roundDoc.questionsEvaluations.reduce((acc, q) => acc + (q.score || 0), 0);
    await roundDoc.save();

    return {
        result: {
            success: true,
            message: sandboxAvailable
                ? "Submission evaluated successfully."
                : "Submission received. Evaluated on code inspection — the sandbox was unavailable.",
            sandboxAvailable,
            metadata: targetQuestion.codingMetadata,
            scoreEarned: targetQuestion.score,
            feedback: aiGrading.explanation || "",
        },
    };
};









// Per-round raw scores use different scales (aptitude/coding sum 0-10 per
// question; hr is already 0-100). Normalise every round to a 0-100 percentage.
//
// The denominator is the number of questions the round was *meant* to have, not
// just the number served — otherwise a candidate who answers 1 of 45 aptitude
// questions and gets it right scores 100%.
const EXPECTED_QUESTIONS = { coding: 10, technical: 1 };
const normalizeRoundScore = (round) => {
    const qs = round.questionsEvaluations || [];
    const raw = round.roundScore || 0;

    if (round.roundType === 'hr') {
        return Math.max(0, Math.min(100, Math.round(raw)));
    }
    // aptitude / coding / technical: raw is the sum of per-question scores (0-10).
    const answered = qs.filter((q) => q.isAttempted).length;
    const served = qs.length;
    const expected = round.roundType === 'aptitude'
        ? (round.aptitudeTotalQuestions || Math.max(served, answered, 15))
        : (EXPECTED_QUESTIONS[round.roundType] || Math.max(served, answered, 1));
    const denom = Math.max(expected, served, answered, 1) * 10;
    return Math.max(0, Math.min(100, Math.round((raw / denom) * 100)));
};

const ROUND_WEIGHTS = { aptitude: 0.20, coding: 0.30, technical: 0.30, hr: 0.20 };

const GRADE_FROM_SCORE = (s) => (s >= 80 ? 'A' : s >= 65 ? 'B' : s >= 45 ? 'C' : 'D');

// Roll the live ProctorSessionReport up into the permanent ProctorRiskReport and
// return the summary the interview finaliser needs.
const compileProctorRiskReport = async (sessionDoc) => {
    const ProctorSessionReport = require('../models/ProctorSessionReportModel.js');
    const ProctorRiskReport = require('../models/ProctorRiskReportModel.js');

    const live = await ProctorSessionReport.findOne({ session: sessionDoc._id }).lean();
    if (!live) {
        return { cumulativeRiskScore: 0, isDisqualified: false, byRound: {} };
    }

    const logs = live.violationsLog || [];
    const roundMap = {};
    const byRound = {};
    for (const v of logs) {
        const rt = v.roundType || 'aptitude';
        if (!roundMap[rt]) roundMap[rt] = {};
        if (!roundMap[rt][v.violationType]) {
            roundMap[rt][v.violationType] = { violationType: v.violationType, count: 0, totalWeight: 0, firstOccurrence: v.timestamp, lastOccurrence: v.timestamp, snapshots: [] };
        }
        const e = roundMap[rt][v.violationType];
        e.count += 1;
        e.totalWeight += v.severityWeight || 0;
        e.lastOccurrence = v.timestamp;
        if (v.snapshotUrl) e.snapshots.push({ url: v.snapshotUrl, timestamp: v.timestamp });
        byRound[rt] = (byRound[rt] || 0) + (v.severityWeight || 0);
    }

    const roundViolations = Object.entries(roundMap).map(([roundType, vmap]) => ({
        roundType,
        violations: Object.values(vmap),
        roundRiskScore: Math.min(100, byRound[roundType] || 0),
    }));

    const uniqueTypes = new Set(logs.map((v) => v.violationType)).size;
    const highestRiskRound = Object.entries(byRound).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const cumulative = Math.max(0, Math.min(100, live.cumulativeRiskScore || 0));
    const pattern = cumulative >= 100 ? 'disqualifying'
        : cumulative >= 60 ? 'highly_suspicious'
            : cumulative >= 25 ? 'suspicious' : 'normal';
    // The `riskLevel` pre-save hook doesn't run on an upsert, so derive it here.
    const riskLevel = cumulative >= 80 ? 'critical' : cumulative >= 50 ? 'high' : cumulative >= 25 ? 'medium' : 'low';

    try {
        await ProctorRiskReport.findOneAndUpdate(
            { session: sessionDoc._id },
            {
                $set: {
                    session: sessionDoc._id,
                    student: sessionDoc.student,
                    organization: sessionDoc.organization || null,
                    candidateId: String(live.candidateId || sessionDoc.student),
                    cumulativeRiskScore: cumulative,
                    riskLevel,
                    isDisqualified: Boolean(live.isDisqualified) || cumulative >= 100,
                    disqualificationReason: (live.isDisqualified || cumulative >= 100)
                        ? 'Proctoring risk threshold exceeded' : '',
                    roundViolations,
                    violationTimeline: logs.map((v) => ({
                        timestamp: v.timestamp,
                        violationType: v.violationType,
                        roundType: v.roundType,
                        severityWeight: v.severityWeight,
                        snapshotUrl: v.snapshotUrl || '',
                    })),
                    detectionSummary: {
                        totalViolations: logs.length,
                        uniqueViolationTypes: uniqueTypes,
                        highestRiskRound,
                        averageViolationsPerMinute: 0,
                    },
                    riskAssessment: {
                        patternDetected: pattern,
                        consistencyScore: Math.max(0, 100 - cumulative),
                        attentionScore: Math.max(0, 100 - (byRound['aptitude'] || 0) - (byRound['coding'] || 0)),
                        integrityScore: Math.max(0, 100 - cumulative),
                    },
                    evaluatedAt: new Date(),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (e) {
        logger.error('compileProctorRiskReport upsert failed', { error: e.message });
    }

    return { cumulativeRiskScore: cumulative, isDisqualified: Boolean(live.isDisqualified) || cumulative >= 100, byRound, violationCounts: roundMap };
};

const finalizeInterviewSessionLogic = async (sessionId) => {
    const sessionDoc = await InterviewSession.findById(sessionId);
    if (!sessionDoc || sessionDoc.status === 'completed') return null;

    // Close out any round still marked active/pending so timing + completion
    // stats are consistent.
    await RoundDetail.updateMany(
        { session: sessionId, status: { $ne: 'completed' } },
        { $set: { status: 'completed', endedAt: new Date() } }
    );

    const completeRounds = await RoundDetail.find({ session: sessionId }).lean();
    const reportCard = await compileFinalReportCard(sessionDoc, completeRounds);

    // Idempotent: finalize can be reached from the client "end", the /terminate
    // route and the timeout cron — a plain insert would E11000 on the unique
    // `session` index the second time.
    await PerformanceInsight.findOneAndUpdate(
        { session: sessionId },
        {
            $set: {
                student: sessionDoc.student,
                narrativeSummary: reportCard.narrativeSummary,
                strengths: reportCard.strengths,
                weaknesses: reportCard.weaknesses,
                skillGapsVsJd: reportCard.skillGapsVsJd,
                actionableStudyPlan: reportCard.actionableStudyPlan,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ── Normalised, weighted composite score ──────────────────────────────
    const perRound = {};
    for (const r of completeRounds) perRound[r.roundType] = normalizeRoundScore(r);

    const presentRounds = Object.keys(perRound);
    const weightSum = presentRounds.reduce((acc, rt) => acc + (ROUND_WEIGHTS[rt] || 0), 0) || 1;
    let composite = presentRounds.reduce(
        (acc, rt) => acc + perRound[rt] * ((ROUND_WEIGHTS[rt] || 0) / weightSum), 0
    );

    // ── Proctoring: compile the permanent risk report + apply a penalty ───
    const proctor = await compileProctorRiskReport(sessionDoc);
    if (proctor.isDisqualified) {
        composite = Math.round(composite * 0.4); // heavy penalty, not a hard zero
    } else if (proctor.cumulativeRiskScore >= 40) {
        composite = Math.round(composite * (1 - Math.min(0.3, proctor.cumulativeRiskScore / 200)));
    }
    composite = Math.max(0, Math.min(100, Math.round(composite)));

    const finalGrade = proctor.isDisqualified ? 'D' : GRADE_FROM_SCORE(composite);

    sessionDoc.status = 'completed';
    sessionDoc.finalCompositeScore = composite;
    sessionDoc.finalGrade = finalGrade;
    sessionDoc.proctoringRiskScore = proctor.cumulativeRiskScore;
    sessionDoc.completedAt = new Date();
    await sessionDoc.save();

    const roundAnalytics = completeRounds.map(round => {
        const startedAt = round.startedAt ? new Date(round.startedAt).getTime() : null;
        const endedAt = round.endedAt ? new Date(round.endedAt).getTime()
            : (round.status === "completed" ? new Date(round.updatedAt).getTime() : null);
        const timeSpentSeconds = (startedAt && endedAt)
            ? Math.max(0, Math.floor((endedAt - startedAt) / 1000))
            : 0;

        const vmap = proctor.violationCounts?.[round.roundType] || {};
        const violationCount = Object.values(vmap).reduce((acc, e) => acc + (e.count || 0), 0);

        return {
            roundType: round.roundType,
            timeSpentSeconds,
            questionsAttempted: round.questionsEvaluations?.filter(q => q.isAttempted).length || 0,
            questionsPassed: round.questionsEvaluations?.filter(q => q.isAttempted && (q.score || 0) >= 5).length || 0,
            totalScore: perRound[round.roundType] ?? 0,
            maxPossibleScore: 100,
            violationCount,
            riskScoreContribution: Math.min(100, proctor.byRound?.[round.roundType] || 0)
        };
    });

    const skillScores = {
        communication: perRound.hr ?? 0,
        problemSolving: perRound.aptitude ?? 0,
        technical: perRound.technical ?? 0,
        coding: perRound.coding ?? 0,
    };

    await InterviewAnalytics.findOneAndUpdate(
        { session: sessionId },
        {
            $set: {
                student: sessionDoc.student,
                campaign: sessionDoc.campaign,
                organization: sessionDoc.organization,
                startedAt: sessionDoc.startedAt,
                completedAt: new Date(),
                roundAnalytics: roundAnalytics,
                overallScore: composite,
                finalGrade: finalGrade,
                proctoringRiskScore: proctor.cumulativeRiskScore,
                isDisqualified: proctor.isDisqualified,
                skillScores,
                performanceTrend: roundAnalytics.map(r => ({ score: r.totalScore, roundType: r.roundType })),
                metadata: {
                    targetRole: sessionDoc.targetRole,
                    preferredCodingLanguage: sessionDoc.preferredCodingLanguage,
                    jobDescription: sessionDoc.jobDescription?.title || sessionDoc.targetRole || ''
                }
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Recompute the student's placement-readiness score + competency breakdown
    // from real interview data. This is the only place it runs on the student
    // flow — without it the dashboard shows stale/zero competency numbers.
    try {
        const PlacementScoreEngine = require('../services/placementScoreEngine.js');
        await PlacementScoreEngine.updateStudentReadinessScore(
            String(sessionDoc.student), sessionDoc.organization || null, 'system', 'Auto-updated after interview completion'
        );
    } catch (scoreErr) {
        logger.error('readiness recompute failed', { session: String(sessionDoc._id), error: scoreErr.message });
    }

    try {
        await NotificationService.dispatch({
            recipient: sessionDoc.student,
            recipientRole: 'student',
            type: 'result_available',
            title: 'Interview Report Ready',
            message: `Your interview report is now available. Your score: ${sessionDoc.finalCompositeScore}/100`,
            actionUrl: '/progress',
            actionText: 'View Report',
            priority: 'high',
            metadata: { sessionId: sessionDoc._id, score: sessionDoc.finalCompositeScore }
        });
    } catch (notifErr) {
        logger.error({ message: notifErr.message, stack: notifErr.stack });
    }

    return reportCard;
};












// Resolve the ObjectId of the college-admin User that owns this student's
// organization, so interview analytics roll up to that college. Students and
// college-admins share the same `organization` name string.
const resolveOwningOrganization = async (student) => {
    if (!student?.organization) return null;
    const owner = await User.findOne({
        role: 'college-admin',
        organization: student.organization,
        status: 'Approved'
    }).select('_id').sort({ createdAt: 1 }).lean();
    return owner?._id || null;
};

const startInterviewSession = async (req, res) => {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {

        const { jobDescription, targetRole, selectedRounds, preferredCodingLanguage, campaignId, } = req.body;
        const studentId = req.user.id;
        const newResume = req.file;

        if (!jobDescription || !targetRole || !selectedRounds || !preferredCodingLanguage) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        // Ensure the student has a profile (created lazily on first sign-in but
        // guard anyway — every downstream round reads from it).
        let profile = await StudentProfile.findOne({ user: studentId });
        if (!profile) {
            profile = await StudentProfile.create({ user: studentId });
        }

        if (newResume) {
            if (profile.resumeKey) {
                await deleteFromR2(profile.resumeKey).catch(() => {});
            }

            const result = await uploadToR2(newResume, "resumes");
            profile.resumeUrl = result.url;
            profile.resumeKey = result.key;

            await profile.save();
        }

        // The coding & technical rounds generate questions from the candidate's
        // resume — fail fast here with a clear message rather than 500-ing deep
        // inside round 2 when there is no resume to fetch.
        const needsResume = selectedRounds.some((r) => r === 'coding' || r === 'technical');
        if (needsResume && !profile.resumeUrl) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            return res.status(400).json({
                success: false,
                code: 'RESUME_REQUIRED',
                message: 'Upload a resume (on this screen or in Settings) before starting a coding or technical round.'
            });
        }

        const student = await User.findById(studentId).select('organization');
        const owningOrganization = await resolveOwningOrganization(student);

        // Core Master Record Initialization
        const masterSession = new InterviewSession({
            student: studentId,
            campaign: campaignId || null,
            organization: owningOrganization,
            jobDescription,
            targetRole,
            preferredCodingLanguage,
            selectedRounds,
            status: "ongoing",
            startedAt: new Date()
        });

        await masterSession.save({ session: dbSession });


        // Staging individual rounds tracking structures sequentially
        const stagingPromises = selectedRounds.map(round => {
            return new RoundDetail({
                session: masterSession._id,
                roundType: round,
                status: "pending"
            }).save({ session: dbSession });
        });

        await Promise.all(stagingPromises);
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Consume one mock-interview unit (subscription quota or trial credit)
        // only after the session is durably created.
        if (req.entitlementSource) {
            await consumeEntitlement(req, "mockInterviews");
        }

        return res.status(201).json({
            success: true,
            sessionId: masterSession._id,
            selectedRounds,
        });

    } catch (err) {
        try { await dbSession.abortTransaction(); } catch { /* already ended */ }
        dbSession.endSession();
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}


// Session state — powers resume-on-refresh on the client. Returns per-round
// status + the server-authoritative deadline for the active round.
const getInterviewState = async (req, res) => {
    try {
        const session = req.interviewSession;
        const rounds = await RoundDetail.find({ session: session._id })
            .select('roundType status startedAt endsAt durationSeconds forceEnded questionsEvaluations providerSessionId aptitudeTopics')
            .lean();

        const order = (session.selectedRounds && session.selectedRounds.length)
            ? session.selectedRounds
            : ['aptitude', 'coding', 'technical', 'hr'];

        const byType = {};
        for (const r of rounds) byType[r.roundType] = r;

        const roundState = order.map((rt) => {
            const r = byType[rt];
            const now = Date.now();
            const endsAtMs = r?.endsAt ? new Date(r.endsAt).getTime() : null;
            return {
                roundType: rt,
                status: r?.status || 'pending',
                startedAt: r?.startedAt || null,
                endsAt: r?.endsAt || null,
                durationSeconds: r?.durationSeconds || null,
                remainingSeconds: endsAtMs ? Math.max(0, Math.round((endsAtMs - now) / 1000)) : null,
                forceEnded: Boolean(r?.forceEnded),
                answeredCount: (r?.questionsEvaluations || []).filter((q) => q.isAttempted).length,
                servedCount: (r?.questionsEvaluations || []).length,
                providerSessionId: r?.providerSessionId || null,
                aptitudeTopics: r?.aptitudeTopics || [],
            };
        });

        const activeRound = roundState.find((r) => r.status === 'active')
            || roundState.find((r) => r.status === 'pending')
            || null;

        return res.status(200).json({
            success: true,
            data: {
                sessionId: session._id,
                status: session.status,
                targetRole: session.targetRole,
                preferredCodingLanguage: session.preferredCodingLanguage,
                selectedRounds: order,
                rounds: roundState,
                activeRound: activeRound ? activeRound.roundType : null,
            },
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};



const endInterviewSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const reportCard = await finalizeInterviewSessionLogic(sessionId);

        // Clean up any lingering timer state for this session.
        await clearRoundTimers(sessionId).catch(() => {});

        return res.status(200).json({ success: true, summary: reportCard });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};



const extractProviderSessionId = (data = {}) =>
    String(
        data.sessionId ?? data.session_id ?? data.batchSessionId ?? data.batch_id ?? data.id ??
        data?.data?.sessionId ?? data?.data?.session_id ?? ""
    );

// Initializing Aptitude Session for API to get its session Id
// The aptitude micro-service only accepts these exact topic names. The client
// sends short slugs — map them here so a UI label change never breaks the round.
const APTITUDE_TOPIC_MAP = {
    quantitative: "Quantitative Ability",
    "quantitative-aptitude": "Quantitative Ability",
    quant: "Quantitative Ability",
    logical: "Logical Reasoning",
    "logical-reasoning": "Logical Reasoning",
    reasoning: "Logical Reasoning",
    verbal: "English",
    "verbal-ability": "English",
    english: "English",
    "data-interpretation": "Data Interpretation",
    di: "Data Interpretation",
    "cs-fundamentals": "Computer Knowledge",
    "computer-knowledge": "Computer Knowledge",
    "computer-science": "Computer Knowledge",
};
const APTITUDE_VALID_TOPICS = new Set(Object.values(APTITUDE_TOPIC_MAP));

const resolveAptitudeTopics = (raw) => {
    const list = Array.isArray(raw) ? raw : [raw].filter(Boolean);
    const mapped = list
        .map((t) => {
            const key = String(t || "").trim().toLowerCase();
            return APTITUDE_TOPIC_MAP[key] || (APTITUDE_VALID_TOPICS.has(String(t).trim()) ? String(t).trim() : null);
        })
        .filter(Boolean);
    // de-dupe, keep order
    return [...new Set(mapped)];
};

// The service wants a JobDescription *object*, not a raw string.
const buildAptitudeJd = (sessionDoc, profile) => {
    const skills = Array.isArray(profile?.skills)
        ? profile.skills.map((s) => String(s)).filter(Boolean).slice(0, 30)
        : [];
    return {
        title: String(sessionDoc?.targetRole || "").slice(0, 200),
        description: String(sessionDoc?.jobDescription || "").slice(0, 8000),
        requiredSkills: skills,
        techStack: skills,
    };
};

const initializeAptitudeBatchSession = async (req, res) => {
    try {
        const { topics } = req.body;
        const userId = req.user.id;
        const { sessionId } = req.params;
        const sessionDoc = req.interviewSession;

        // Resume path: the round is already running (e.g. the candidate
        // refreshed). Return the stored provider session + the live deadline
        // instead of spinning up a brand-new external batch.
        const existing = await RoundDetail.findOne({ session: sessionId, roundType: "aptitude" }).lean();
        if (existing && existing.startedAt && existing.providerSessionId && existing.status !== "completed") {
            return res.status(200).json({
                success: true,
                resumed: true,
                message: "Resumed the aptitude round.",
                endsAt: existing.endsAt ? new Date(existing.endsAt).getTime() : null,
                durationSeconds: existing.durationSeconds,
                data: { sessionId: existing.providerSessionId },
            });
        }

        const canonicalTopics = resolveAptitudeTopics(topics);
        if (canonicalTopics.length === 0) {
            return res.status(400).json({
                success: false,
                code: "INVALID_APTITUDE_TOPICS",
                message: "Pick at least one valid aptitude topic to begin.",
            });
        }

        const profile = await StudentProfile.findOne({ user: userId }).select("skills").lean();

        const url = process.env.INITIALIZE_APTITUDE_ROUND_URL;
        const bodyData = {
            candidateId: String(userId),
            topics: canonicalTopics,
            jobDescription: buildAptitudeJd(sessionDoc, profile),
            questions_per_topic: 15,
        };
        const config = {
            headers: { aptitude_api_key: `${process.env.APTITUDE_API_KEY}` },
            timeout: 120000, // the service is a cold-start-prone Render deploy
        };

        let response;
        try {
            response = await axios.post(url, bodyData, config);
        } catch (apiErr) {
            const status = apiErr.response?.status;
            const detail = apiErr.response?.data?.detail;
            logger.error("aptitude start-session failed", {
                status,
                detail: typeof detail === "string" ? detail : JSON.stringify(detail),
                code: apiErr.code,
            });
            if (status === 400 && typeof detail === "string" && /unknown topic/i.test(detail)) {
                return res.status(422).json({ success: false, code: "INVALID_APTITUDE_TOPICS", message: "One of the selected topics isn't available right now. Try a different combination." });
            }
            if (apiErr.code === "ECONNABORTED" || /timeout/i.test(apiErr.message || "")) {
                return res.status(504).json({ success: false, code: "APTITUDE_TIMEOUT", message: "The aptitude service is waking up. Please try again in a moment." });
            }
            return res.status(502).json({ success: false, code: "APTITUDE_UNAVAILABLE", message: "Couldn't reach the aptitude service. Please try again shortly." });
        }

        const providerSessionId = extractProviderSessionId(response?.data || {});
        if (!providerSessionId) {
            logger.error("aptitude start-session returned no sessionId", { data: JSON.stringify(response?.data).slice(0, 500) });
            return res.status(502).json({ success: false, code: "APTITUDE_NO_SESSION", message: "The aptitude service did not return a session. Please try again." });
        }

        const durationSeconds = computeRoundDurationSeconds("aptitude", { topicsCount: canonicalTopics.length });
        const endsAt = await startRoundTimer(sessionId, "aptitude", durationSeconds);

        // Persist the provider session id + selected topics on our RoundDetail
        // so a refresh can resume without a new external batch.
        await RoundDetail.updateOne(
            { session: sessionId, roundType: "aptitude" },
            { $set: { providerSessionId, aptitudeTopics: canonicalTopics, status: "active" } },
            { upsert: true }
        );

        const round = await RoundDetail.findOne({ session: sessionId, roundType: "aptitude" }, "endsAt durationSeconds").lean();

        return res.status(200).json({
            success: true,
            message: "Aptitude round initialized successfully",
            endsAt: endsAt || (round?.endsAt ? new Date(round.endsAt).getTime() : null),
            durationSeconds: round?.durationSeconds || durationSeconds,
            topics: canonicalTopics,
            data: response?.data,
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



const getAptitudeRoundQuestion = async (req, res) => {
    try {
        const candidateId = req.user.id;
        const { sessionId } = req.params;

        const { batchSessionId } = req.body;
        const page = parseInt(req.query.page) || 1;
        const pageSize = 1;

        if (!sessionId) {
            return res.status(400).json({ message: "Session Id is required!" });
        }

        if (!batchSessionId) {
            return res.status(400).json({ message: "Aptitude batch Session Id is required!" });
        }

        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "aptitude" });

        // Aptitude Question API Call
        const url = process.env.APTITUDE_QUESTIONS_URL;

        const bodyData = {
            candidateId,
            sessionId: batchSessionId,
            page,
            page_size: pageSize,
        }

        const config = {
            headers: {
                'aptitude_api_key': `${process.env.APTITUDE_API_KEY}`
            },
            timeout: 120000,
        }

        let response;
        try {
            response = await axios.post(url, bodyData, config);
        } catch (apiErr) {
            logger.error("aptitude fetch-questions failed", {
                status: apiErr.response?.status,
                detail: JSON.stringify(apiErr.response?.data).slice(0, 400),
                code: apiErr.code,
            });
            if (apiErr.code === "ECONNABORTED" || /timeout/i.test(apiErr.message || "")) {
                return res.status(504).json({ success: false, code: "APTITUDE_TIMEOUT", message: "The aptitude service is taking longer than usual. Please try again." });
            }
            return res.status(502).json({ success: false, code: "APTITUDE_UNAVAILABLE", message: "Couldn't fetch the next question. Please try again shortly." });
        }

        const results = Array.isArray(response?.data?.results) ? response.data.results : [];
        const questionObj = results[0];
        const pagination = response?.data?.pagination || {};

        // The candidate has finished every generated question for this batch.
        if (!questionObj || !questionObj.question_id) {
            return res.status(200).json({
                success: true,
                message: "No further aptitude questions.",
                exhausted: true,
                question: null,
                totalItems: pagination.total_items ?? null,
            });
        }

        const qid = String(questionObj.question_id);

        const answersCollection = await getMongoAptitudeAnswersCollection();
        const answerDoc = await answersCollection.findOne({
            question_id: { $in: [questionObj.question_id, qid, Number(qid)] },
        });

        const normalizeLevel = (lvl) => {
            const s = String(lvl || "").trim().toLowerCase();
            if (s === "easy") return "Easy";
            if (s === "hard") return "Hard";
            return "Medium";
        };

        const totalItems = Number(pagination.total_items) || 0;

        const questionDetail = {
            questionId: qid,
            questionText: String(questionObj.question || "Question unavailable"),
            difficultyTag: normalizeLevel(questionObj.level),
            idealAnswer: answerDoc?.correct_answer ?? "",
            explanation: answerDoc?.explanation ?? "",
            studentAnswer: "",
            topic: questionObj.topic || "",
            sub_topic: questionObj.sub_topic || "",
            options: Array.isArray(questionObj.options) ? questionObj.options : [],
            aptitudePage: page,
        };

        if (!roundDoc) {
            await RoundDetail.create({
                session: sessionId,
                roundType: "aptitude",
                status: "active",
                aptitudeTotalQuestions: totalItems,
                questionsEvaluations: [questionDetail],
            });
        } else {
            const existing = roundDoc.questionsEvaluations.find((q) => String(q.questionId) === qid);
            if (!existing) {
                roundDoc.questionsEvaluations.push(questionDetail);
            } else if (!existing.aptitudePage) {
                existing.aptitudePage = page;
            }
            roundDoc.status = "active";
            if (totalItems && !roundDoc.aptitudeTotalQuestions) roundDoc.aptitudeTotalQuestions = totalItems;
            await roundDoc.save();
        }

        return res.status(200).json({
            success: true,
            message: "Aptitude Round Question Fetched Successfully.",
            question: questionObj,
            page: pagination.page ?? page,
            totalItems: totalItems || (pagination.total_items ?? null),
            totalPages: pagination.total_pages ?? null,
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



// Palette-restore for the aptitude question navigator — which pages are already
// answered, what was picked, and the batch size. Used on refresh / resume.
const getAptitudeProgress = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const roundDoc = await RoundDetail.findOne(
            { session: sessionId, roundType: "aptitude" },
            "questionsEvaluations aptitudeTotalQuestions aptitudeTopics status endsAt durationSeconds"
        ).lean();

        if (!roundDoc) {
            return res.status(200).json({ success: true, total: 0, status: "pending", answered: [] });
        }

        const answered = (roundDoc.questionsEvaluations || []).map((q) => ({
            questionId: String(q.questionId),
            page: q.aptitudePage || null,
            studentAnswer: q.studentAnswer || "",
            isAttempted: Boolean(q.isAttempted),
            topic: q.topic || "",
        }));

        return res.status(200).json({
            success: true,
            total: roundDoc.aptitudeTotalQuestions || 0,
            topics: roundDoc.aptitudeTopics || [],
            status: roundDoc.status,
            endsAt: roundDoc.endsAt ? new Date(roundDoc.endsAt).getTime() : null,
            durationSeconds: roundDoc.durationSeconds || null,
            answered,
        });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
};


const submitAptitudeRound = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionId, studentAnswer } = req.body;

        if (!sessionId || !questionId || studentAnswer === undefined) {
            return res.status(400).json({ message: "Session ID, Question ID, and Student Answer are required." });
        }

        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "aptitude" });
        if (!roundDoc) {
            return res.status(404).json({ message: "Active interview round context trace unavailable." })
        }

        const targetQuestion = roundDoc.questionsEvaluations.find(q => (
            String(q.questionId) === String(questionId)
        ));
        if (!targetQuestion) {
            return res.status(404).json({ message: "That question is not part of this round." })
        }

        const aiGrading = await analyzeAptitudeResponse({
            questionText: targetQuestion.questionText, options: targetQuestion.options, studentAnswer, idealAnswer: targetQuestion.idealAnswer,
            idealExplanation: targetQuestion.explanation, category: targetQuestion.topic
        });

        targetQuestion.studentAnswer = studentAnswer;
        targetQuestion.isAttempted = true;
        targetQuestion.score = aiGrading.score;

        targetQuestion.evaluationLayers = {
            l1KeywordCoverage: aiGrading.keywordCoverage,
            l2SemanticSimilarity: aiGrading.semanticSimilarity,
            l3LlmRubricCorrectness: aiGrading.rubricCorrectness,
            l3LlmExplanation: aiGrading.explanation
        };

        roundDoc.roundScore = roundDoc.questionsEvaluations.reduce((acc, q) => acc + (q.score || 0), 0);
        await roundDoc.save();

        return res.status(200).json({
            success: true,
            message: "Aptitude Response Registered and Evaluated Successfully.",
            isCorrect: aiGrading.isCorrect,
            scoreEarned: aiGrading.score,
            explanation: aiGrading.explanation
        });


    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



// Round - 2  : Coding Round Questions - pagination implemented
const getCodingRoundQuestions = async (req, res) => {
    try {

        const candidateId = req.user.id;
        const { sessionId } = req.params;

        const page = parseInt(req.query.page) || 1;
        const pageSize = 1;


        const profile = await StudentProfile.findOne({ user: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "User Profile not found." });
        }

        if (!sessionId) {
            return res.status(404).json({ message: "Session Id is required." });
        }

        if (!profile.resumeUrl) {
            return res.status(400).json({
                success: false,
                code: 'RESUME_REQUIRED',
                message: "Add a resume in Settings before attempting the coding round."
            });
        }

        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "coding" });


        const sessionDoc = await InterviewSession.findById(sessionId);


        // Resume Fetching 
        const result = await axios.get(profile.resumeUrl, {
            responseType: "arraybuffer"
        });

        const dataBuffer = Buffer.from(result.data);

        // PDF Parsing
        const data = await pdfParse(dataBuffer);
        const resumeText = data.text;


        // Coding Question API Call
        const url = `${process.env.CODING_QUESTIONS_BATCH_URL}?page=${page}&pageSize=${pageSize}`;

        const bodyData = {
            candidateId,
            skills: profile.skills,
            projects: profile.projects,
            resumeText,
            jobDescription: sessionDoc.jobDescription,
            targetRole: sessionDoc.targetRole,
            preferredLanguage: sessionDoc.preferredCodingLanguage,
        }

        const config = {
            headers: {
                'x-api-key': `${process.env.CODING_QUESTIONS_BATCH_TOKEN}`
            }
        }

        const response = await axios.post(url, bodyData, config);

        const questionObj = response.data?.questions?.[0];
        const question = questionObj?.selectedQuestion;

        if (!question || !question.questionId) {
            // The model has no more questions to serve for this candidate.
            return res.status(200).json({
                success: true,
                message: "No further coding questions.",
                exhausted: true,
                question: null,
            });
        }

        const idealSolutionsCollection = await getMongoIdealSolutionsCollection();
        const idealSolutionDoc = await idealSolutionsCollection.findOne({ questionId: question.questionId }) || {};

        const idealAnswerObj = {
            idealLogic: idealSolutionDoc.idealLogic || '',
            timeComplexity: idealSolutionDoc.timeComplexity || '',
            spaceComplexity: idealSolutionDoc.spaceComplexity || '',
            edgeCases: idealSolutionDoc.edgeCases || [],
            evaluationNotes: idealSolutionDoc.evaluationNotes || '',
            referenceAnswer: idealSolutionDoc.referenceAnswer || '',
            rubric: idealSolutionDoc.rubric || ''
        };

        const questionDetail = {
            questionId: question.questionId,
            questionText: question.problemStatement,
            difficultyTag: question.difficulty,
            studentAnswer: "",
            idealAnswer: idealAnswerObj,
            codingMetadata: { totalTestCases: 0 }
        }

        if (!roundDoc) {
            await RoundDetail.create({
                session: sessionId,
                roundType: "coding",
                status: "active",
                questionsEvaluations: [questionDetail]
            });
        } else {
            // Idempotent: a retried / refreshed fetch must not duplicate the node.
            const exists = roundDoc.questionsEvaluations.some(q => q.questionId === question.questionId);
            if (!exists) {
                roundDoc.questionsEvaluations.push(questionDetail);
            }
            roundDoc.status = "active";
            await roundDoc.save();
        }

        // Start the coding timer on first question fetch (idempotent).
        const durationSeconds = computeRoundDurationSeconds("coding");
        const endsAt = await startRoundTimer(sessionId, "coding", durationSeconds);
        const activeRound = await RoundDetail.findOne({ session: sessionId, roundType: "coding" }, "endsAt durationSeconds").lean();

        const sampleTestCases = await fetchPublicTestCases(question.questionId);
        const normalized = normalizeCodingQuestion(question, sampleTestCases);

        return res.status(200).json({
            success: true,
            message: "Coding Round Question Fetched Successfully.",
            endsAt: endsAt || (activeRound?.endsAt ? new Date(activeRound.endsAt).getTime() : null),
            durationSeconds: activeRound?.durationSeconds || durationSeconds,
            page,
            totalProblems: 10,
            question: normalized,
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}




const submitCodingRound = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionId, code, language } = req.body;

        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "coding" });
        if (!roundDoc) {
            return res.status(404).json({ success: false, message: "The coding round has not been started for this session." });
        }

        const { result, error } = await evaluateCodeSubmission({ roundDoc, questionId, code, language });
        if (error) return res.status(error.status).json({ success: false, message: error.message });

        return res.status(200).json(result);
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}


// "Run" — execute against visible sample cases only. Works for both the coding
// and technical rounds. Never persists, never AI-grades.
const runCodingRound = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionId, code, language } = req.body;

        // The questionId must belong to a round of this (already ownership-checked) session.
        const round = await RoundDetail.findOne({
            session: sessionId,
            roundType: { $in: ["coding", "technical"] },
            "questionsEvaluations.questionId": questionId,
        }).select("_id").lean();
        if (!round) {
            return res.status(404).json({ success: false, message: "That question is not part of this interview." });
        }

        const out = await runCodeAgainstSamples({ questionId, code, language });
        return res.status(200).json({ success: true, ...out });
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}




// Shared: (re)start a voice round (technical persona / hr) and mint a fresh
// Simli avatar session token. Simli tokens are single-use per stream so we mint
// one on every entry — but the round timer and RoundDetail are idempotent.
const startVoiceRound = async ({ sessionId, roundType, faceId, maxSessionLength }) => {
    await RoundDetail.updateOne(
        { session: sessionId, roundType },
        { $setOnInsert: { session: sessionId, roundType, questionsEvaluations: [] }, $set: { status: "active" } },
        { upsert: true }
    );
    const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType });

    const durationSeconds = computeRoundDurationSeconds(roundType);
    const startedEndsAt = await startRoundTimer(sessionId, roundType, durationSeconds);
    const fresh = await RoundDetail.findOne({ session: sessionId, roundType }, "endsAt durationSeconds").lean();

    const sessionToken = await createSimliSessionToken({ faceId, maxSessionLength });

    return {
        sessionToken,
        roundId: String(roundDoc._id),
        endsAt: startedEndsAt || (fresh?.endsAt ? new Date(fresh.endsAt).getTime() : null),
        durationSeconds: fresh?.durationSeconds || durationSeconds,
    };
};

const startTechnicalRoundSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const out = await startVoiceRound({
            sessionId,
            roundType: "technical",
            faceId: process.env.SIMLI_TECHNICAL_FACE_ID || process.env.SIMLI_FACE_ID,
            maxSessionLength: ROUND_DURATION_POLICY.technical.personaSeconds + 120,
        });
        return res.status(200).json({ success: true, message: "Technical interviewer ready.", ...out });
    } catch (err) {
        logger.error("startTechnicalRoundSession failure:", err.message);
        if (err.code === "SIMLI_SESSION_FAILED" || err.code === "SIMLI_NOT_CONFIGURED") {
            return res.status(503).json({ success: false, code: err.code, message: err.message });
        }
        return sendError(res, err);
    }
};





const getTechnicalRoundQuestion = async (req, res) => {
    try {

        const candidateId = req.user.id;
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(404).json({ message: "Session Id is required." });
        }

        const profile = await StudentProfile.findOne({ user: candidateId });
        if (!profile) {
            return res.status(404).json({ message: "User Profile not found." });
        }

        if (!profile.resumeUrl) {
            return res.status(400).json({
                success: false,
                code: 'RESUME_REQUIRED',
                message: "Add a resume in Settings before attempting the technical round."
            });
        }


        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "technical" });

        const sessionDoc = await InterviewSession.findById(sessionId);


        // Resume Fetching 
        const result = await axios.get(profile.resumeUrl, {
            responseType: "arraybuffer"
        });

        const dataBuffer = Buffer.from(result.data);

        // PDF Parsing
        const data = await pdfParse(dataBuffer);
        const resumeText = data.text;


        // Coding Question API Call
        const url = process.env.TECHNICAL_QUESTION_URL;

        const bodyData = {
            candidateId,
            skills: profile.skills,
            projects: profile.projects,
            resumeText,
            jobDescription: sessionDoc.jobDescription,
            targetRole: sessionDoc.targetRole,
            preferredLanguage: sessionDoc.preferredCodingLanguage,
            preferredDifficulty: "Hard",
        }

        const config = {
            headers: {
                'x-api-key': `${process.env.TECHNICAL_QUESTION_TOKEN}`
            }
        }

        const response = await axios.post(url, bodyData, config);

        const question = response.data?.selectedQuestion || response.data?.questions?.[0]?.selectedQuestion;
        if (!question || !question.questionId) {
            return res.status(502).json({ success: false, message: "The technical question service returned no question." });
        }

        const idealSolutionsCollection = await getMongoIdealSolutionsCollection();
        const idealSolutionDoc = await idealSolutionsCollection.findOne({ questionId: question.questionId }) || {};

        const idealAnswerObj = {
            idealLogic: idealSolutionDoc.idealLogic || '',
            timeComplexity: idealSolutionDoc.timeComplexity || '',
            spaceComplexity: idealSolutionDoc.spaceComplexity || '',
            edgeCases: idealSolutionDoc.edgeCases || [],
            evaluationNotes: idealSolutionDoc.evaluationNotes || '',
            referenceAnswer: idealSolutionDoc.referenceAnswer || '',
            rubric: idealSolutionDoc.rubric || ''
        };

        const questionDetail = {
            questionId: question.questionId,
            questionText: question.problemStatement,
            difficultyTag: question.difficulty,
            studentAnswer: "",
            idealAnswer: idealAnswerObj,
            codingMetadata: { totalTestCases: 0 }
        }

        if (!roundDoc) {
            await RoundDetail.create({
                session: sessionId,
                roundType: "technical",
                status: "active",
                questionsEvaluations: [questionDetail]
            });
        } else {
            const alreadyExists = roundDoc.questionsEvaluations.some(q => q.questionId === question.questionId);
            if (!alreadyExists) {
                roundDoc.questionsEvaluations.push(questionDetail);
            }
            roundDoc.status = "active";
            await roundDoc.save();
        }

        const sampleTestCases = await fetchPublicTestCases(question.questionId);
        const normalized = normalizeCodingQuestion(question, sampleTestCases);

        return res.status(200).json({ success: true, message: "Technical Round Question Fetched Successfully.", question: normalized });


    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



const submitTechnicalRound = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionId, code, language } = req.body;

        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "technical" });
        if (!roundDoc) {
            return res.status(404).json({ success: false, message: "The technical round has not been started for this session." });
        }

        const { result, error } = await evaluateCodeSubmission({
            roundDoc, questionId, code, language, grader: analyzeTechnicalResponse,
        });
        if (error) return res.status(error.status).json({ success: false, message: error.message });

        // Technical round is single-question; mark it complete on submit.
        roundDoc.status = 'completed';
        roundDoc.endedAt = new Date();
        await roundDoc.save();

        return res.status(200).json(result);
    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}




const startHrRoundSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const out = await startVoiceRound({
            sessionId,
            roundType: "hr",
            faceId: process.env.SIMLI_FACE_ID,
            maxSessionLength: ROUND_DURATION_POLICY.hr.totalSeconds + 120,
        });
        return res.status(200).json({ success: true, message: "HR interviewer ready.", ...out });
    } catch (err) {
        logger.error("startHrRoundSession failure:", err.message);
        if (err.code === "SIMLI_SESSION_FAILED" || err.code === "SIMLI_NOT_CONFIGURED") {
            return res.status(503).json({ success: false, code: err.code, message: err.message });
        }
        return sendError(res, err);
    }
};




module.exports = { startInterviewSession, endInterviewSession, getInterviewState, finalizeInterviewSessionLogic, initializeAptitudeBatchSession, getAptitudeRoundQuestion, getAptitudeProgress, submitAptitudeRound, getCodingRoundQuestions, submitCodingRound, runCodingRound, startTechnicalRoundSession, getTechnicalRoundQuestion, submitTechnicalRound, startHrRoundSession };