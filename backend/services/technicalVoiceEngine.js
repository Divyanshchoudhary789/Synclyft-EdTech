const axios = require('axios');
const pdfParse = require('pdf-parse');
const { LiveTranscriptionEvents, DeepgramClient } = require("@deepgram/sdk");

const RoundDetail = require("../models/RoundDetailModel.js");
const InterviewSession = require("../models/InterviewSessionModel.js");
const StudentProfile = require("../models/StudentProfileModel.js");
const { analyzeHrResponse } = require("./geminiService.js");
const logger = require("./loggerService.js");

// Deepgram client instantiation
const deepgramClient = new DeepgramClient(process.env.DEEPGRAM_API_KEY);


// Extracts raw text data context from the candidate document URL
async function extractCandidateResumeDataText(url) {
    try {
        if (!url) return "Standard technology profile with software engineering capabilities.";
        const result = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
        const parsedPdf = await pdfParse(Buffer.from(result.data));
        return parsedPdf.text || "";
    } catch (e) {
        logger.error("[Resume Extraction Failure]:", e.message);
        return "Experienced developer specializing in modern full stack infrastructure architectures.";
    }
}


// Pipes processed text payload context down onto the Simli WebRTC streaming buffer

async function sendDataToSimliWebRTCStream(sessionToken, plaintextReply) {
    try {
        await axios.post('https://api.simli.ai/v1/audio/inject', {
            session_token: sessionToken,
            text: plaintextReply
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SIMLI_API_KEY}`
            },
            timeout: 5000
        });
    } catch (err) {
        logger.error("[Simli Technical Packet Injection Refused]:", err.response?.data || err.message);
    }
}


// Generates technical persona responses utilizing Gemini generative processing models

async function queryGeminiTechnicalBrain(messagesPayload) {
    try {
        const { GoogleGenAI } = require("@google/genai");
        const aiEngine = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const responseFrame = await aiEngine.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: messagesPayload
        });
        return responseFrame.text?.trim() || "Could you please detail the scaling and data persistence layers of your application architecture?";
    } catch (err) {
        logger.error("[Gemini Technical Text Handshake Failure]:", err.message);
        return "Let's explore concurrency bottlenecks. How do you mitigate memory race condition leaks under intensive parallel database connections load?";
    }
}

module.exports = function initializeLiveTechnicalPipelineEngine(io) {
        io.on('connection', (socket) => {
            logger.info(`[Technical Persona Connection Established]: ${socket.id}`);
        let dgLiveInstance = null;

        const setupDeepgramLiveConnection = (simliSessionToken) => {
            try {
                dgLiveInstance = deepgramClient.listen.live({
                    model: "nova-2-ea",
                    language: "en-US",
                    smart_format: true,
                    interim_results: false,
                    encoding: "linear16",
                    sample_rate: 16000
                });

                dgLiveInstance.on(LiveTranscriptionEvents.Open, () => {
                    logger.info(`[Technical Deepgram Active]: Client ${socket.id}`);
                });

                dgLiveInstance.on(LiveTranscriptionEvents.Transcript, async (data) => {
                    const receivedText = data.channel.alternatives[0]?.transcript;
                    if (!receivedText || receivedText.trim().length === 0) return;

                    logger.info(`[Technical STT Packet]: User Said -> ${receivedText}`);
                    await executeTechnicalConversationLogic(receivedText);
                });

                dgLiveInstance.on(LiveTranscriptionEvents.Error, (err) => {
                    logger.error("[Deepgram Tech Socket Error]:", err);
                });
            } catch (error) {
                logger.error("Deepgram technical initialization failure:", error);
            }
        };

        const executeTechnicalConversationLogic = async (processedSpeechText) => {
            try {
                const { activeSessionId, activeRoundId, simliSessionToken } = socket;
                if (!activeRoundId) return;

                const round = await RoundDetail.findById(activeRoundId);
                const session = await InterviewSession.findById(activeSessionId);
                const profile = await StudentProfile.findOne({ user: session.student });
                const resumeTextContext = await extractCandidateResumeDataText(profile.resumeUrl);

                let activePointerIndex = round.questionsEvaluations.length - 1;
                if (activePointerIndex < 0) return;

                round.questionsEvaluations[activePointerIndex].studentAnswer += ` ${processedSpeechText}`;
                round.questionsEvaluations[activePointerIndex].isAttempted = true;
                await round.save();

                // SHIFT BOUNDARY MECHANICS PROTECTION: Trigger step changes after exactly 3 questions
                if (round.questionsEvaluations.length >= 3) {
                    const closingStatement = "Excellent analysis of your infrastructure components. Now, let's evaluate your algorithmic optimization capabilities. I have loaded your hard coding challenge puzzle on your screen workspace. Please proceed.";
                    await sendDataToSimliWebRTCStream(simliSessionToken, closingStatement);

                    if (dgLiveInstance) {
                        try { dgLiveInstance.finish(); } catch (e) {}
                        dgLiveInstance = null;
                    }

                    // 1. Trigger isolated evaluation matrix calculation strictly for the 3 verbal nodes
                    await triggerIsolatedTechnicalVerbalMatrix(activeRoundId);

                    // 2. Emit clean non-blocking signal to prompt layout shift in Monaco editor component workspace
                    socket.emit('technical-persona-complete', { sessionId: activeSessionId });
                    return;
                }

                let historicTraceLogContext = `System Directive Configuration:
                You are a Principal Enterprise Systems Architect conducting a hard technical system architecture evaluation.
                Target Hiring Role: ${session.targetRole}
                Target Requirements Specification: ${session.jobDescription}
                Candidate Resume Parameters Context: ${resumeTextContext}
                
                Active Conversations Progress Log:\n`;

                round.questionsEvaluations.forEach(node => {
                    historicTraceLogContext += `Architect Question Asked: ${node.questionText}\nCandidate Answer Provided: ${node.studentAnswer}\n`;
                });

                historicTraceLogContext += `\nTask: Generate the next complex technical question tracking system limits or design patterns bottlenecks based on their answer. Ask exactly ONE concise question. Do not exceed 30 words.`;

                const sequentialQuestionText = await queryGeminiTechnicalBrain(historicTraceLogContext);

                round.questionsEvaluations.push({
                    questionId: `TECH_Q_${Date.now()}`,
                    questionText: sequentialQuestionText,
                    difficultyTag: 'Hard',
                    idealAnswer: 'Deep optimization logic tracing accurate implementation boundaries conforming to enterprise design choices.'
                });
                await round.save();

                await sendDataToSimliWebRTCStream(simliSessionToken, sequentialQuestionText);

            } catch (innerLoopErr) {
                logger.error("Failure tracking technical operational states logs:", innerLoopErr);
            }
        };

        socket.on('join-technical-live-stream', async ({ sessionId, roundId, simliSessionToken }) => {
            socket.activeSessionId = sessionId;
            socket.activeRoundId = roundId;
            socket.simliSessionToken = simliSessionToken;

            try {
                const round = await RoundDetail.findById(roundId);
                const session = await InterviewSession.findById(sessionId);
                const profile = await StudentProfile.findOne({ user: session.student });
                const resumeTextContext = await extractCandidateResumeDataText(profile.resumeUrl);

                setupDeepgramLiveConnection(simliSessionToken);

                if (round && round.questionsEvaluations.length === 0) {
                    const systemInitializationPrompt = `You are a Principal Technical Interviewer assessing a candidate for ${session.targetRole}.
                    Target Job Specification Requirements: ${session.jobDescription}
                    Candidate Resume Text Parameters: ${resumeTextContext}
                    
                    Instructions: Greet the candidate professionally, reference one core language or database constraint from their profile, and ask a hard system design problem statement question. Keep it concise, under 35 words total.`;

                    const questionTextString = await queryGeminiTechnicalBrain(systemInitializationPrompt);

                    round.questionsEvaluations.push({
                        questionId: `TECH_Q_${Date.now()}`,
                        questionText: questionTextString,
                        difficultyTag: 'Hard',
                        studentAnswer: '',
                        idealAnswer: 'Clear, architectural description tracking execution complexity limits correctly.',
                        isAttempted: false
                    });

                    await round.save();
                    await sendDataToSimliWebRTCStream(simliSessionToken, questionTextString);
                }
            } catch (error) {
                logger.error("Failed handling initial technical execution triggers:", error);
                socket.emit('error-alert', { msg: "Voice validation cluster memory error." });
            }
        });

        socket.on('stream-user-audio-chunk', (audioRawChunkBuffer) => {
            if (dgLiveInstance && dgLiveInstance.getReadyState() === 1) {
                dgLiveInstance.send(audioRawChunkBuffer);
            }
        });

        socket.on('disconnect', () => {
            if (dgLiveInstance) {
                try { dgLiveInstance.finish(); } catch (e) {}
                dgLiveInstance = null;
            }
        });
    });
};


// Isolated evaluator strictly maps scoring parameters onto the 3 verbal nodes only

async function triggerIsolatedTechnicalVerbalMatrix(roundId) {
    try {
        logger.info(`[Tech Persona Background Sync Engine Active] for RoundID: ${roundId}`);
        const round = await RoundDetail.findById(roundId);
        if (!round) return;

        // Scopes mapping parameters exclusively for verbal entries (excluding code blocks tracking fields)
        const targetVerbalQuestions = round.questionsEvaluations.filter(node => node.isAttempted && !node.language);

        for (let item of targetVerbalQuestions) {
            // Process semantics via your dedicated analyzeHrResponse handler schema configuration
            const matrixResult = await analyzeHrResponse({
                questionText: item.questionText,
                studentAnswer: item.studentAnswer,
                idealAnswer: item.idealAnswer
            });

            item.evaluationLayers.l1KeywordCoverage = matrixResult.keywordCoverage || 75;
            item.evaluationLayers.l2SemanticSimilarity = matrixResult.semanticSimilarity || 70;
            item.evaluationLayers.l3LlmRubricCorrectness = matrixResult.rubricCorrectness || 80;
            item.evaluationLayers.l3LlmExplanation = matrixResult.explanation || "Verbal structural response evaluated correctly within architectural scopes.";
            item.score = matrixResult.score || 7;
        }

        // Save progress details directly into the sub-document model node parameters
        await round.save();
        logger.info(`[Tech Persona Matrix Complete]: Scoped verbal records updated cleanly for RoundID: ${roundId}`);

    } catch (matrixErr) {
        logger.error("[Tech Isolated Verbal Evaluation Anomaly Trace]:", matrixErr);
    }
}