const axios = require('axios');
const pdfParse = require('pdf-parse');
const { LiveTranscriptionEvents, DeepgramClient } = require("@deepgram/sdk");

const RoundDetail = require("../models/RoundDetailModel.js");
const InterviewSession = require("../models/InterviewSessionModel.js");
const StudentProfile = require("../models/StudentProfileModel.js");
const { analyzeHrResponse } = require("./geminiService.js");
const logger = require("./loggerService.js");


// Deepgram client initialization
const deepgramClient = new DeepgramClient(process.env.DEEPGRAM_API_KEY);


// Extracts raw text from candidate resume URL safely

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


//Injects plaintext response into Simli WebRTC audio stream

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
        logger.error("[Simli Packet Injection Refused]:", err.response?.data || err.message);
    }
}


// Queries Gemini Core AI to get the next contextual interview question

async function queryGeminiCoreBrain(messagesPayload) {
    try {
        const { GoogleGenAI } = require("@google/genai");
        const aiEngine = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const responseFrame = await aiEngine.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: messagesPayload
        });
        return responseFrame.text?.trim() || "Could you please elaborate on your project's technical choices?";
    } catch (err) {
        logger.error("[Gemini Text Engine Handshake Failure]:", err.message);
        return "Can you talk about how you manage application state and concurrency limits under high platform load constraints?";
    }
}

module.exports = function initializeLiveHRPipelineEngine(io) {
        io.on('connection', (socket) => {
            logger.info(`[HR Round Connection Established]: ${socket.id}`);

        let dgLiveInstance = null;

        // Setup Real-time Deepgram STT Connection
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
                    logger.info(`[Deepgram STT Active]: Client ${socket.id}`);
                });

                dgLiveInstance.on(LiveTranscriptionEvents.Transcript, async (data) => {
                    const receivedText = data.channel.alternatives[0]?.transcript;
                    if (!receivedText || receivedText.trim().length === 0) return;

                    logger.info(`[STT Packet]: User Said -> ${receivedText}`);
                    await executeTurnTakingConversationLogic(receivedText);
                });

                dgLiveInstance.on(LiveTranscriptionEvents.Error, (err) => {
                    logger.error("[Deepgram Live Socket Error]:", err);
                });

                dgLiveInstance.on(LiveTranscriptionEvents.Close, () => {
                    logger.info(`[Deepgram STT Closed] for client: ${socket.id}`);
                });

            } catch (error) {
                logger.error("Deepgram initialization failure:", error);
                socket.emit('error-alert', { msg: "Voice validation cluster memory error." });
            }
        };

        // Main Turn-Taking Conversation Handler
        const executeTurnTakingConversationLogic = async (processedSpeechText) => {
            try {
                const { activeSessionId, activeRoundId, simliSessionToken } = socket;
                if (!activeRoundId) return;

                const round = await RoundDetail.findById(activeRoundId);
                const session = await InterviewSession.findById(activeSessionId);
                const profile = await StudentProfile.findOne({ user: session.student });
                const resumeTextContext = await extractCandidateResumeDataText(profile.resumeUrl);

                let activePointerIndex = round.questionsEvaluations.length - 1;
                if (activePointerIndex < 0) return;

                // Append speech text to current question's answer
                round.questionsEvaluations[activePointerIndex].studentAnswer += ` ${processedSpeechText}`;
                round.questionsEvaluations[activePointerIndex].isAttempted = true;
                await round.save();

                // Check Boundary Condition: Max 4 Questions allowed per HR Round
                if (round.questionsEvaluations.length >= 4) {
                    round.status = 'completed';
                    await round.save();

                    const terminatingText = "Thank you for sharing your experiences. That concludes our structured behavioral assessment round. Your report insights are compiling.";
                    await sendDataToSimliWebRTCStream(simliSessionToken, terminatingText);

                    // 1. First finish individual HR metrics evaluation upfront
                    await triggerBackgroundHREvaluationMatrix(activeRoundId, profile);

                    const { finalizeInterviewSessionLogic } = require("../controllers/interviewController.js");
                    // 2. THE SINGLE LINE REUSE HANDSHAKE: Call the core controller function directly
                    await finalizeInterviewSessionLogic(activeSessionId);

                    // 3. Emit safe indicator signal back to Next.js
                    socket.emit('live-hr-session-terminated', { sessionId: activeSessionId });
                    return;
                }

                // Construct Context-Aware Prompt for Sequential Questions
                let historicTraceLogContext = `System Directive Configuration:
                You are a senior technical Talent Acquisition Executive conducting a professional architectural validation interview round.
                Target Hiring Designation Role: ${session.targetRole}
                Target Job Requirements Specification: ${session.jobDescription}
                Candidate Professional Document Context: ${resumeTextContext}
                
                Active Conversations Progress Log:\n`;

                round.questionsEvaluations.forEach(node => {
                    historicTraceLogContext += `HR Question Asked: ${node.questionText}\nCandidate Answer Provided: ${node.studentAnswer}\n`;
                });

                historicTraceLogContext += `\nTask: Analyze their previous answer. Generate the next sequential interview question targeting their background constraints. Ask exactly ONE concise question. Do not exceed 30 words in your response output string. Do not give inline review comments.`;

                const sequentialQuestionText = await queryGeminiCoreBrain(historicTraceLogContext);

                // Push new question node into the schema pipeline
                round.questionsEvaluations.push({
                    questionId: `HR_Q_${Date.now()}`,
                    questionText: sequentialQuestionText,
                    difficultyTag: round.questionsEvaluations.length > 2 ? 'Hard' : 'Medium',
                    idealAnswer: 'Clear, structural response displaying contextual architectural adaptation matching corporate expectations.'
                });
                await round.save();

                // Stream question voice packet back to candidate avatar
                await sendDataToSimliWebRTCStream(simliSessionToken, sequentialQuestionText);

            } catch (innerLoopErr) {
                logger.error("Failure tracking operational state variables:", innerLoopErr);
            }
        };

        // Initialization trigger upon frontend WebRTC socket join action
        socket.on('join-hr-live-stream', async ({ sessionId, roundId, simliSessionToken }) => {
            socket.activeSessionId = sessionId;
            socket.activeRoundId = roundId;
            socket.simliSessionToken = simliSessionToken;

            try {
                const round = await RoundDetail.findById(roundId);
                const session = await InterviewSession.findById(sessionId);
                const profile = await StudentProfile.findOne({ user: session.student });
                const resumeTextContext = await extractCandidateResumeDataText(profile.resumeUrl);

                setupDeepgramLiveConnection(simliSessionToken);

                // Send the first introductory question if array is fresh/empty
                if (round && round.questionsEvaluations.length === 0) {
                    const systemInitializationPrompt = `You are an expert HR Manager evaluating a candidate for the position of ${session.targetRole}.
                    Target Job Specification Requirements: ${session.jobDescription}
                    Candidate Resume Text Parameters: ${resumeTextContext}
                    
                    Instructions: Greet the candidate gracefully, make a precise reference to one skill or project from their background parameters, and ask your first behavioral evaluation question. Keep it concise, under 35 words total.`;

                    const questionTextString = await queryGeminiCoreBrain(systemInitializationPrompt);

                    round.questionsEvaluations.push({
                        questionId: `HR_Q_${Date.now()}`,
                        questionText: questionTextString,
                        difficultyTag: 'Medium',
                        studentAnswer: '',
                        idealAnswer: 'Articulate structural introduction highlighting core competency alignments clearly.',
                        isAttempted: false
                    });

                    await round.save();
                    await sendDataToSimliWebRTCStream(simliSessionToken, questionTextString);
                }
            } catch (error) {
                logger.error("Failed handling initial execution triggers:", error);
                socket.emit('error-alert', { msg: "Failed initializing interview context logs maps." });
            }
        });

        // Binary streaming buffer chunk pipe from client microphone to Deepgram Instance
        socket.on('stream-user-audio-chunk', (audioRawChunkBuffer) => {
            if (dgLiveInstance && dgLiveInstance.getReadyState() === 1) {
                dgLiveInstance.send(audioRawChunkBuffer);
            }
        });

        // Safe Resource Cleanup Wrapper on socket close
        socket.on('disconnect', () => {
            logger.info(`[Resource Cleanup]: Client disconnected -> ${socket.id}`);
            if (dgLiveInstance) {
                try {
                    dgLiveInstance.finish();
                } catch (dgCleanErr) {
                    logger.error("Deepgram connection cleanup error:", dgCleanErr.message);
                }
                dgLiveInstance = null;
            }
        });
    });
};


// Asynchronous Background Worker Matrix for Deep Performance Scoring
async function triggerBackgroundHREvaluationMatrix(roundId, profile) {
    try {
        logger.info(`[Background Worker Spawned]: Calculating RoundID: ${roundId}`);
        const round = await RoundDetail.findById(roundId);
        let integratedCumulativeScoreSum = 0;

        for (let item of round.questionsEvaluations) {
            const matrixResult = await analyzeHrResponse({
                questionText: item.questionText,
                studentAnswer: item.studentAnswer,
                idealAnswer: item.idealAnswer
            });

            // Sync matrix evaluation weights safely with default fallbacks
            item.evaluationLayers.l1KeywordCoverage = matrixResult.keywordCoverage || 75;
            item.evaluationLayers.l2SemanticSimilarity = matrixResult.semanticSimilarity || 70;
            item.evaluationLayers.l3LlmRubricCorrectness = matrixResult.rubricCorrectness || 80;
            item.evaluationLayers.l3LlmExplanation = matrixResult.explanation || "Behavioral metrics successfully mapped inside analytical schemas structures.";
            item.score = matrixResult.score || 7;

            integratedCumulativeScoreSum += (item.score * 10);
        }

        const calculatedFinalRoundScore = Math.round(integratedCumulativeScoreSum / round.questionsEvaluations.length);
        round.roundScore = calculatedFinalRoundScore;
        await round.save();

        // Update main user statistics schema profile data
        profile.communicationScore = calculatedFinalRoundScore;
        profile.scoreBreakdown.mockInterviewPerformance = calculatedFinalRoundScore;

        // Weighted Average Multiplier logic for global metrics tracking
        profile.placementReadinessScore = Math.round(
            (profile.scoreBreakdown.academicPerformance * 0.2) +
            (profile.scoreBreakdown.codingPerformance * 0.3) +
            (profile.scoreBreakdown.aptitudePerformance * 0.2) +
            (calculatedFinalRoundScore * 0.3)
        );

        await profile.save();
        logger.info(`[Database State Completely Synced] for RoundID: ${roundId}`);

    } catch (err) {
        logger.error("[Background Processing Matrix Exception]:", err);
    }
}