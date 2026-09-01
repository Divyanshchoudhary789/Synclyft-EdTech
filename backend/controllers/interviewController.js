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
const { computeRoundDurationSeconds } = require("../utils/interviewTimerConfig.js");

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









const finalizeInterviewSessionLogic = async (sessionId) => {
    const sessionDoc = await InterviewSession.findById(sessionId);
    if (!sessionDoc || sessionDoc.status === 'completed') return null;

    const completeRounds = await RoundDetail.find({ session: sessionId }).lean();
    const reportCard = await compileFinalReportCard(sessionDoc, completeRounds);

    const insightDoc = new PerformanceInsight({
        session: sessionId,
        student: sessionDoc.student,
        narrativeSummary: reportCard.narrativeSummary,
        strengths: reportCard.strengths,
        weaknesses: reportCard.weaknesses,
        skillGapsVsJd: reportCard.skillGapsVsJd,
        actionableStudyPlan: reportCard.actionableStudyPlan
    });
    await insightDoc.save();

    const absoluteTotalScore = completeRounds.reduce((acc, r) => acc + (r.roundScore || 0), 0);

    sessionDoc.status = 'completed';
    sessionDoc.finalCompositeScore = Math.round(Math.min(absoluteTotalScore, 100));
    sessionDoc.finalGrade = reportCard.overallGrade;
    sessionDoc.completedAt = new Date();
    await sessionDoc.save();

    const roundAnalytics = completeRounds.map(round => {
        const startedAt = round.startedAt ? new Date(round.startedAt).getTime() : null;
        const endedAt = round.endedAt ? new Date(round.endedAt).getTime()
            : (round.status === "completed" ? new Date(round.updatedAt).getTime() : null);
        const timeSpentSeconds = (startedAt && endedAt)
            ? Math.max(0, Math.floor((endedAt - startedAt) / 1000))
            : 0;

        return {
            roundType: round.roundType,
            timeSpentSeconds,
            questionsAttempted: round.questionsEvaluations?.length || 0,
            questionsPassed: round.questionsEvaluations?.filter(q => q.isAttempted).length || 0,
            totalScore: round.roundScore || 0,
            violationCount: 0,
            riskScoreContribution: 0
        };
    });

    const analytics = new InterviewAnalytics({
        session: sessionId,
        student: sessionDoc.student,
        campaign: sessionDoc.campaign,
        organization: sessionDoc.organization,
        startedAt: sessionDoc.startedAt,
        completedAt: new Date(),
        roundAnalytics: roundAnalytics,
        overallScore: sessionDoc.finalCompositeScore,
        finalGrade: sessionDoc.finalGrade,
        proctoringRiskScore: sessionDoc.proctoringRiskScore || 0,
        isDisqualified: false,
        metadata: {
            targetRole: sessionDoc.targetRole,
            preferredCodingLanguage: sessionDoc.preferredCodingLanguage,
            jobDescription: sessionDoc.jobDescription
        }
    });

    await analytics.save();

    try {
        await NotificationService.dispatch({
            recipient: sessionDoc.student,
            recipientRole: 'student',
            type: 'result_available',
            title: 'Interview Report Ready',
            message: `Your interview report is now available. Your score: ${sessionDoc.finalCompositeScore}/100`,
            actionUrl: '/student/interviews',
            actionText: 'View Report',
            priority: 'high',
            metadata: { sessionId: sessionDoc._id, score: sessionDoc.finalCompositeScore }
        });
    } catch (notifErr) {
        logger.error({ message: notifErr.message, stack: notifErr.stack });
    }

    return reportCard;
};












const startInterviewSession = async (req, res) => {
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {

        const { jobDescription, targetRole, selectedRounds, preferredCodingLanguage, campaignId, } = req.body;
        const studentId = req.user.id;
        const newResume = req.file;

        if (!jobDescription || !targetRole || !selectedRounds || !preferredCodingLanguage) {
            return res.status(400).json({ message: "All Fields are required!" });
        }

        if (newResume) {
            const profile = await StudentProfile.findOne({ user: studentId });
            if (profile && profile.resumeKey) {
                await deleteFromR2(profile.resumeKey);
            }

            const result = await uploadToR2(newResume, "resumes");
            profile.resumeUrl = result.url;
            profile.resumeKey = result.key;

            await profile.save();
        }

        const student = await User.findById(studentId).select('organization');

        // Core Master Record Initialization
        const masterSession = new InterviewSession({
            student: studentId,
            campaign: campaignId,
            jobDescription,
            targetRole,
            preferredCodingLanguage,
            status: "initialized"
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

        return res.status(201).json({ success: true, sessionId: masterSession._id });

    } catch (err) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



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



// Initializing Aptitude Session for API to get its session Id
const initializeAptitudeBatchSession = async (req, res) => {
    try {
        const { topics } = req.body;
        const userId = req.user.id;

        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({ message: "Session Id is required!" });
        }

        const sessionDoc = await InterviewSession.findById(sessionId);

        const url = process.env.INITIALIZE_APTITUDE_ROUND_URL;

        const bodyData = {
            candidateId: userId,
            topics,
            jobDescription: sessionDoc?.jobDescription,
            questions_per_topic: 15,
        }

        const config = {
            headers: {
                'aptitude_api_key': `${process.env.APTITUDE_API_KEY}`
            }
        }

        const response = await axios.post(url, bodyData, config);

        // Start the server-authoritative aptitude timer. Duration scales with
        // how many topics the candidate selected (15 questions each).
        const topicsCount = Array.isArray(topics) ? topics.length : 0;
        const durationSeconds = computeRoundDurationSeconds("aptitude", { topicsCount });
        const endsAt = await startRoundTimer(sessionId, "aptitude", durationSeconds);

        return res.status(200).json({
            success: true,
            message: "Aptitude round initialized successfully",
            endsAt,
            durationSeconds,
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
            }
        }

        const response = await axios.post(url, bodyData, config);

        const questionObj = response?.data?.results[0];

        const answersCollection = await getMongoAptitudeAnswersCollection();
        const answerDoc = await answersCollection.findOne({ question_id: questionObj?.question_id });


        const questionDetail = {
            questionId: questionObj?.question_id,
            questionText: questionObj?.question,
            difficultyTag: questionObj?.level,
            idealAnswer: answerDoc?.correct_answer,
            explanation: answerDoc?.explanation,
            studentAnswer: "",
            topic: questionObj?.topic,
            sub_topic: questionObj?.sub_topic,
            options: questionObj?.options,
        }


        if (!roundDoc) {
            const newRoundDoc = new RoundDetail({
                session: sessionId,
                roundType: "aptitude",
                status: "active",
                questionsEvaluations: [questionDetail]
            });

            await newRoundDoc.save();
        } else {
            const alreadyExists = roundDoc.questionsEvaluations.some(q => q.questionId === questionObj.question_id);
            if (!alreadyExists) {
                roundDoc.questionsEvaluations.push(questionDetail);
                roundDoc.status = "active";
                await roundDoc.save();
            }
        }


        return res.status(200).json({ success: true, message: "Aptitude Round Question Fetched Successfully.", question: questionObj });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



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
            q.questionId === questionId
        ));
        if (!targetQuestion) {
            return res.status(404).json({ message: "Target question structure node index corrupted." })
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

        const questionObj = response.data?.questions[0];

        const question = questionObj?.selectedQuestion;

        const idealSolutionsCollection = await getMongoIdealSolutionsCollection();
        const idealSolutionDoc = await idealSolutionsCollection.findOne({ questionId: question.questionId });

        const idealAnswerObj = {
            idealLogic: idealSolutionDoc.idealLogic,
            timeComplexity: idealSolutionDoc.timeComplexity,
            spaceComplexity: idealSolutionDoc.spaceComplexity,
            edgeCases: idealSolutionDoc.edgeCases,
            evaluationNotes: idealSolutionDoc.evaluationNotes,
            referenceAnswer: idealSolutionDoc.referenceAnswer,
            rubric: idealSolutionDoc.rubric
        };

        const questionDetail = {
            questionId: question.questionId,
            questionText: question.problemStatement,
            difficultyTag: question.difficulty,
            studentAnswer: "",
            idealAnswer: idealAnswerObj || {},
            codingMetadata: {
                totalTestCases: 100,
            }
        }

        if (!roundDoc) {
            const newRoundDoc = new RoundDetail({
                session: sessionId,
                roundType: "coding",
                status: "active",
                questionsEvaluations: [questionDetail]
            });

            await newRoundDoc.save();
        } else {
            roundDoc.questionsEvaluations.push(questionDetail);
            roundDoc.status = "active";

            await roundDoc.save();
        }

        // Start the coding timer on first question fetch (idempotent).
        // Duration is fixed for 3 Easy / 5 Medium / 2 Hard.
        const durationSeconds = computeRoundDurationSeconds("coding");
        const endsAt = await startRoundTimer(sessionId, "coding", durationSeconds);

        return res.status(200).json({
            success: true,
            message: "Coding Round Question Fetched Successfully.",
            endsAt,
            durationSeconds,
            question: response.data,
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

        const testCasesCollection = await getMongoTestCasesCollection();
        const testCasesDoc = await testCasesCollection.findOne({ questionId });

        const testCases = [...testCasesDoc.public, ...testCasesDoc.hidden];


        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "coding" });
        if (!roundDoc) {
            return res.status(404).json({ message: "Active interview round context trace unavailable." })
        }

        const targetQuestion = roundDoc.questionsEvaluations.find(q => (
            q.questionId === questionId
        ));

        if (!targetQuestion) {
            return res.status(404).json({ message: "Target question structure node index corrupted." })
        }

        const executionOutputs = await executeCodeOnJudge0(code, language, testCases);

        const successfulCasesCount = executionOutputs.filter(output => output.status_id === 3).length;
        const sampleNodeMeta = executionOutputs[0] || {};

        const stdoutDecoded = sampleNodeMeta?.stdout ? Buffer.from(sampleNodeMeta.stdout, 'base64').toString('utf-8') : "";
        const errLogsDecoded = sampleNodeMeta?.compile_output ? Buffer.from(sampleNodeMeta.compile_output, 'base64').toString('utf-8') : "";
        const runtimeLogsDecoded = sampleNodeMeta?.stderr ? Buffer.from(sampleNodeMeta.stderr, 'base64').toString('utf-8') : "";

        // Gemini context preperation
        const compilerOutputContext = `Status: ${sampleNodeMeta?.status?.description || 'Executed'} | Passed: ${successfulCasesCount}/${testCases.length} | stdout: ${stdoutDecoded} | compile_err: ${errLogsDecoded} | runtime_ex: ${runtimeLogsDecoded}`;

        const aiGrading = await analyzeCodingResponse({
            questionText: targetQuestion.questionText, studentCode: code, language, compilerOutputContext, idealAnswer: targetQuestion.idealAnswer,
        });


        // updating data inside record at correct position

        targetQuestion.studentAnswer = code;
        targetQuestion.language = language;
        targetQuestion.isAttempted = true;
        targetQuestion.score = aiGrading.score;
        targetQuestion.codingMetadata = {
            language, testCasesPassed: successfulCasesCount, totalTestCases: testCases.length,
            runtimeMs: sampleNodeMeta.time ? parseFloat(sampleNodeMeta.time) * 1000 : 0,
            memoryKb: sampleNodeMeta.memory || 0, timeComplexity: aiGrading.timeComplexity,
            spaceComplexity: aiGrading.spaceComplexity, statusDescription: sampleNodeMeta.status?.description || 'Executed'
        };
        targetQuestion.evaluationLayers = {
            l1KeywordCoverage: aiGrading.keywordCoverage, l2SemanticSimilarity: aiGrading.semanticSimilarity,
            l3LlmRubricCorrectness: aiGrading.rubricCorrectness, l3LlmExplanation: aiGrading.explanation
        };

        roundDoc.roundScore = roundDoc.questionsEvaluations.reduce((acc, q) => acc + (q.score || 0), 0);

        await roundDoc.save();

        return res.status(200).json({
            success: true,
            message: "Submitted Code Evaluated Successfully.",
            metadata: targetQuestion.codingMetadata,
            scoreEarned: targetQuestion.score
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}




const startTechnicalRoundSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const sessionDoc = await InterviewSession.findById(sessionId);
        if (!sessionDoc) {
            return res.status(404).json({ success: false, message: "Target interview session context dead." });
        }

        // Fetch or create the specific RoundDetail reference context node for technical tracking
        let roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "technical" });
        if (!roundDoc) {
            roundDoc = new RoundDetail({
                session: sessionId,
                roundType: "technical",
                status: "active",
                questionsEvaluations: []
            });
            await roundDoc.save();
        } else {
            roundDoc.status = "active";
            await roundDoc.save();
        }

        // Simli standard authorization handshake context generation
        const simliHandshake = await axios.post('https://api.simli.ai/v1/session/start', {
            faceId: process.env.SIMLI_TECHNICAL_FACE_ID,
            model: "standard"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SIMLI_API_KEY}`
            }
        });

        // Start the technical timer (AI persona phase + hard coding question).
        const durationSeconds = computeRoundDurationSeconds("technical");
        const endsAt = await startRoundTimer(sessionId, "technical", durationSeconds);

        return res.status(200).json({
            success: true,
            message: "Simli Live Technical Handshake Matrix generated successfully.",
            endsAt,
            durationSeconds,
            sessionToken: simliHandshake.data?.session_token,
            simliSessionId: simliHandshake.data?.session_id,
            roundId: roundDoc._id
        });

    } catch (err) {
        logger.error("Simli WebRTC Technical Security layer failure:", err.message);
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

        const question = response.data?.selectedQuestion;

        const idealSolutionsCollection = await getMongoIdealSolutionsCollection();
        const idealSolutionDoc = await idealSolutionsCollection.findOne({ questionId: question.questionId });

        const idealAnswerObj = {
            idealLogic: idealSolutionDoc.idealLogic,
            timeComplexity: idealSolutionDoc.timeComplexity,
            spaceComplexity: idealSolutionDoc.spaceComplexity,
            edgeCases: idealSolutionDoc.edgeCases,
            evaluationNotes: idealSolutionDoc.evaluationNotes,
            referenceAnswer: idealSolutionDoc.referenceAnswer,
            rubric: idealSolutionDoc.rubric
        };

        const questionDetail = {
            questionId: question.questionId,
            questionText: question.problemStatement,
            difficultyTag: question.difficulty,
            studentAnswer: "",
            idealAnswer: idealAnswerObj || {},
            codingMetadata: {
                totalTestCases: 100,
            }
        }

        if (!roundDoc) {
            const newRoundDoc = new RoundDetail({
                session: sessionId,
                roundType: "technical",
                status: "active",
                questionsEvaluations: [questionDetail]
            });

            await newRoundDoc.save();
        } else {
            const alreadyExists = roundDoc.questionsEvaluations.some(q => q.questionId === question.questionId);
            if (!alreadyExists) {
                roundDoc.questionsEvaluations.push(questionDetail);
                roundDoc.status = "active";

                await roundDoc.save();
                logger.info(`[Idempotent Fetch Guard]: New coding node appended successfully.`);
            } else {
                logger.info(`[Idempotent Fetch Guard]: Coding node already staged inside array loop. Preventing duplicate crash loop.`);
            }

        }


        return res.status(200).json({ success: true, message: "Technical Round Questions Batch Fetched Successfully.", question: response.data });


    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}



const submitTechnicalRound = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { questionId, code, language } = req.body;

        const testCasesCollection = await getMongoTestCasesCollection();
        const testCasesDoc = await testCasesCollection.findOne({ questionId });

        const testCases = [...testCasesDoc.public, ...testCasesDoc.hidden];


        const roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "technical" });
        if (!roundDoc) {
            return res.status(404).json({ message: "Active interview round context trace unavailable." })
        }

        const targetQuestion = roundDoc.questionsEvaluations.find(q => (
            q.questionId === questionId
        ));

        if (!targetQuestion) {
            return res.status(404).json({ message: "Target question structure node index corrupted." })
        }

        const executionOutputs = await executeCodeOnJudge0(code, language, testCases);

        const successfulCasesCount = executionOutputs.filter(output => output.status_id === 3).length;
        const sampleNodeMeta = executionOutputs[0] || {};

        const stdoutDecoded = sampleNodeMeta?.stdout ? Buffer.from(sampleNodeMeta.stdout, 'base64').toString('utf-8') : "";
        const errLogsDecoded = sampleNodeMeta?.compile_output ? Buffer.from(sampleNodeMeta.compile_output, 'base64').toString('utf-8') : "";
        const runtimeLogsDecoded = sampleNodeMeta?.stderr ? Buffer.from(sampleNodeMeta.stderr, 'base64').toString('utf-8') : "";

        // Gemini context preperation
        const compilerOutputContext = `Status: ${sampleNodeMeta?.status?.description || 'Executed'} | Passed: ${successfulCasesCount}/${testCases.length} | stdout: ${stdoutDecoded} | compile_err: ${errLogsDecoded} | runtime_ex: ${runtimeLogsDecoded}`;

        const aiGrading = await analyzeTechnicalResponse({
            questionText: targetQuestion.questionText, studentCode: code,
            language, compilerOutputContext, idealAnswer: targetQuestion.idealAnswer,
        });


        // updating data inside record at correct position

        targetQuestion.studentAnswer = code;
        targetQuestion.language = language;
        targetQuestion.isAttempted = true;
        targetQuestion.score = aiGrading.score;
        targetQuestion.codingMetadata = {
            language, testCasesPassed: successfulCasesCount, totalTestCases: testCases.length,
            runtimeMs: sampleNodeMeta.time ? parseFloat(sampleNodeMeta.time) * 1000 : 0,
            memoryKb: sampleNodeMeta.memory || 0, timeComplexity: aiGrading.timeComplexity,
            spaceComplexity: aiGrading.spaceComplexity, statusDescription: sampleNodeMeta.status?.description || 'Executed'
        };
        targetQuestion.evaluationLayers = {
            l1KeywordCoverage: aiGrading.keywordCoverage, l2SemanticSimilarity: aiGrading.semanticSimilarity,
            l3LlmRubricCorrectness: aiGrading.rubricCorrectness, l3LlmExplanation: aiGrading.explanation
        };

        roundDoc.roundScore = roundDoc.questionsEvaluations.reduce((acc, q) => acc + (q.score || 0), 0);

        await roundDoc.save();

        return res.status(200).json({
            success: true,
            message: "Submitted Code Evaluated Successfully.",
            metadata: targetQuestion.codingMetadata,
            scoreEarned: targetQuestion.score
        });

    } catch (err) {
        logger.error({ message: err.message, stack: err.stack });
        return sendError(res, err);
    }
}




const startHrRoundSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const studentId = req.user.id;

        // Verify active production constraints matching initial document state
        const sessionDoc = await InterviewSession.findById(sessionId);
        if (!sessionDoc) {
            return res.status(404).json({ success: false, message: "Target interview session context dead." });
        }

        // Fetch or create the specific RoundDetail reference context node
        let roundDoc = await RoundDetail.findOne({ session: sessionId, roundType: "hr" });
        if (!roundDoc) {
            roundDoc = new RoundDetail({
                session: sessionId,
                roundType: "hr",
                status: "active",
                questionsEvaluations: []
            });
            await roundDoc.save();
        } else {
            roundDoc.status = "active";
            await roundDoc.save();
        }

        // Production Key Handshake Isolation Layer to preserve cloud secrets security
        const simliHandshake = await axios.post('https://api.simli.ai/v1/session/start', {
            faceId: process.env.SIMLI_FACE_ID,
            model: "standard"
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SIMLI_API_KEY}`
            }
        });

        // Start the HR round timer.
        const durationSeconds = computeRoundDurationSeconds("hr");
        const endsAt = await startRoundTimer(sessionId, "hr", durationSeconds);

        return res.status(200).json({
            success: true,
            message: "Simli Live Authentication Matrix generated successfully.",
            endsAt,
            durationSeconds,
            sessionToken: simliHandshake.data?.session_token,
            simliSessionId: simliHandshake.data?.session_id,
            roundId: roundDoc._id
        });

    } catch (err) {
        logger.error("Simli WebRTC Security handshake failure:", err.message);
        return sendError(res, err);
    }
};




module.exports = { startInterviewSession, endInterviewSession, finalizeInterviewSessionLogic, initializeAptitudeBatchSession, getAptitudeRoundQuestion, submitAptitudeRound, getCodingRoundQuestions, submitCodingRound, startTechnicalRoundSession, getTechnicalRoundQuestion, submitTechnicalRound, startHrRoundSession };