// =============================================================================
// VOICE INTERVIEW ENGINE  (HR + Technical persona phase)
// -----------------------------------------------------------------------------
// One real-time pipeline shared by the HR round and the persona phase of the
// Technical round.
//
//   browser mic ──PCM16/16k──▶ socket ──▶ Deepgram STT (streaming) ──▶ transcript
//                                                                         │
//                                             Gemini (next question) ◀────┘
//                                                    │
//                        Deepgram TTS (Aura) ◀───────┘
//                                │  PCM16/16k
//                                ▼
//        socket ──▶ browser ──▶ simli-client.sendAudioData() ──▶ avatar speaks
//
// The Simli session token is minted server-side (services/simliService.js); the
// browser only ever holds the short-lived token.
//
// Socket contract (client <-> server), namespaced `voice:`
//   C→S  voice:join            { sessionId, roundId, roundType }
//   C→S  voice:candidate-audio  <ArrayBuffer>  (PCM16 mono 16 kHz)
//   C→S  voice:leave
//   S→C  voice:ready            { roundType }
//   S→C  voice:error            { message }
//   S→C  voice:interviewer-turn { text, index, total }
//   S→C  voice:interviewer-audio <ArrayBuffer>  (PCM16 mono 16 kHz)
//   S→C  voice:transcript       { text, isFinal }
//   S→C  voice:persona-complete { }        (technical only)
//   S→C  voice:round-complete   { }        (hr only)
// =============================================================================

const axios = require("axios");
const pdfParse = require("pdf-parse");
const { DeepgramClient } = require("@deepgram/sdk");

const RoundDetail = require("../models/RoundDetailModel.js");
const StudentProfile = require("../models/StudentProfileModel.js");
const { analyzeHrResponse } = require("./geminiService.js");
const { verifySocketSession } = require("../utils/socketAuth.js");
const logger = require("./loggerService.js");

const deepgram = process.env.DEEPGRAM_API_KEY
    ? new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY })
    : null;

const DG_AUTH = `Token ${process.env.DEEPGRAM_API_KEY || ""}`;

const ROUND_CONFIG = {
    hr: {
        questionBudget: 4,
        ttsModel: "aura-asteria-en",
        personaLabel: "HR Manager",
        systemPrompt: (role, jd, resume) =>
            `You are a warm but discerning HR interviewer assessing a candidate for "${role}". ` +
            `Job context: ${jd}. Candidate background: ${resume}. ` +
            `Greet them briefly, reference one concrete thing from their background, and ask your first behavioural question using the STAR method. Under 35 words. Ask exactly one question.`,
        followupPrompt: (role, jd, resume, log) =>
            `You are a warm but discerning HR interviewer for "${role}". Job context: ${jd}. Candidate background: ${resume}.\n` +
            `Conversation so far:\n${log}\n` +
            `Analyse the last answer and ask the next behavioural question. Under 30 words. Exactly one question. No commentary.`,
        closing: "Thank you — that's everything I needed. Your report is being compiled now.",
    },
    technical: {
        questionBudget: 3,
        ttsModel: "aura-orion-en",
        personaLabel: "Technical Architect",
        systemPrompt: (role, jd, resume) =>
            `You are a principal engineer running a hard technical interview for "${role}". ` +
            `Job context: ${jd}. Candidate background: ${resume}. ` +
            `Greet them briefly, reference one technology from their background, and pose a hard system-design question. Under 35 words. Exactly one question.`,
        followupPrompt: (role, jd, resume, log) =>
            `You are a principal engineer running a hard technical interview for "${role}". Job context: ${jd}. Candidate background: ${resume}.\n` +
            `Conversation so far:\n${log}\n` +
            `Based on the last answer, ask the next probing question about scaling, data models, concurrency or trade-offs. Under 30 words. Exactly one question. No commentary.`,
        closing: "Good. That covers the discussion — your coding challenge is now on screen. Take your time.",
    },
};

// ── helpers ─────────────────────────────────────────────────────────────────

async function extractResumeText(url) {
    if (!url) return "A software engineering background.";
    try {
        const { data } = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
        const parsed = await pdfParse(Buffer.from(data));
        return (parsed.text || "").slice(0, 6000) || "A software engineering background.";
    } catch (e) {
        logger.error("voice: resume extract failed", { error: e.message });
        return "A software engineering background.";
    }
}

async function askGemini(promptText, fallback) {
    try {
        const { GoogleGenAI } = require("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const res = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: promptText });
        return (res.text || "").trim() || fallback;
    } catch (e) {
        logger.error("voice: gemini failed", { error: e.message });
        return fallback;
    }
}

// Deepgram Aura TTS → raw PCM16 mono 16 kHz Buffer (no container header).
async function synthesizeSpeech(text, model) {
    if (!deepgram) throw new Error("Deepgram not configured");
    const res = await deepgram.speak.v1.audio.generate({
        text,
        model: model || "aura-asteria-en",
        encoding: "linear16",
        sample_rate: 16000,
        container: "none",
    });
    return Buffer.from(await res.arrayBuffer());
}

function jd(session) {
    const j = session.jobDescription;
    if (!j) return session.targetRole || "";
    if (typeof j === "string") return j;
    return `${j.title || ""} — ${j.description || ""}`.slice(0, 4000);
}

function conversationLog(round) {
    return (round.questionsEvaluations || [])
        .map((q) => `Interviewer: ${q.questionText}\nCandidate: ${q.studentAnswer || "(no answer yet)"}`)
        .join("\n");
}

// ── per-connection state machine ────────────────────────────────────────────

function attach(io) {
    if (!deepgram) {
        logger.warn("voiceInterviewEngine: DEEPGRAM_API_KEY missing — voice rounds disabled");
    }

    io.on("connection", (socket) => {
        /** @type {null | { sessionId, roundId, roundType, cfg, session, profile, resumeText, dg, transcriptBuf, speaking, closing }} */
        let ctx = null;
        let utteranceTimer = null;

        const emitError = (message) => socket.emit("voice:error", { message });

        const speak = async (text, index, total) => {
            socket.emit("voice:interviewer-turn", { text, index, total });
            try {
                const audio = await synthesizeSpeech(text, ctx.cfg.ttsModel);
                // send as ArrayBuffer for the browser
                socket.emit("voice:interviewer-audio", audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength));
            } catch (e) {
                logger.error("voice: TTS failed", { error: e.message });
                socket.emit("voice:error", { message: "The interviewer's voice service is unavailable." });
            }
        };

        const finishRound = async () => {
            if (!ctx || ctx.closing) return;
            ctx.closing = true;
            const { cfg, roundId, roundType, sessionId } = ctx;

            await speak(cfg.closing, cfg.questionBudget, cfg.questionBudget);

            try { ctx.dg?.close?.(); } catch { /* noop */ }

            // Score the verbal answers, then either hand off to coding (technical)
            // or finalise the whole interview (hr).
            await scoreVerbalRound(roundId).catch((e) => logger.error("voice: scoring failed", { error: e.message }));

            if (roundType === "technical") {
                socket.emit("voice:persona-complete", {});
            } else {
                try {
                    const { finalizeInterviewSessionLogic } = require("../controllers/interviewController.js");
                    await finalizeInterviewSessionLogic(sessionId);
                } catch (e) {
                    logger.error("voice: finalize failed", { error: e.message });
                }
                socket.emit("voice:round-complete", {});
            }
        };

        // Called when the candidate finishes speaking (utterance end).
        const onCandidateAnswer = async (answerText) => {
            if (!ctx || ctx.closing || !answerText.trim()) return;

            const round = await RoundDetail.findById(ctx.roundId);
            if (!round) return;
            const idx = round.questionsEvaluations.length - 1;
            if (idx < 0) return;

            round.questionsEvaluations[idx].studentAnswer =
                `${round.questionsEvaluations[idx].studentAnswer || ""} ${answerText}`.trim();
            round.questionsEvaluations[idx].isAttempted = true;
            await round.save();

            if (round.questionsEvaluations.length >= ctx.cfg.questionBudget) {
                await finishRound();
                return;
            }

            const next = await askGemini(
                ctx.cfg.followupPrompt(ctx.session.targetRole, jd(ctx.session), ctx.resumeText, conversationLog(round)),
                "Can you walk me through a concrete example of that?"
            );
            round.questionsEvaluations.push({
                questionId: `${ctx.roundType.toUpperCase()}_Q_${Date.now()}`,
                questionText: next,
                difficultyTag: ctx.roundType === "technical" ? "Hard" : "Medium",
                studentAnswer: "",
                idealAnswer: "A clear, structured, specific answer.",
                isAttempted: false,
            });
            await round.save();
            await speak(next, round.questionsEvaluations.length, ctx.cfg.questionBudget);
        };

        const openDeepgram = () => {
            const conn = deepgram.listen.v1.connect({
                model: "nova-3",
                language: "en-US",
                smart_format: true,
                interim_results: true,
                encoding: "linear16",
                sample_rate: 16000,
                channels: 1,
                vad_events: true,
                utterance_end_ms: 1200,
                endpointing: 300,
                Authorization: DG_AUTH,
            });

            conn.then((socketConn) => {
                ctx.dg = socketConn;
                socketConn.on("open", () => logger.info("voice: Deepgram STT open"));
                socketConn.on("error", (err) => logger.error("voice: Deepgram error", { error: err?.message || String(err) }));
                socketConn.on("close", () => logger.info("voice: Deepgram STT closed"));
                socketConn.on("message", (msg) => {
                    if (!ctx || ctx.closing) return;
                    if (msg.type === "Results") {
                        const alt = msg.channel?.alternatives?.[0];
                        const text = alt?.transcript || "";
                        if (!text) return;
                        socket.emit("voice:transcript", { text, isFinal: Boolean(msg.is_final) });
                        if (msg.is_final) {
                            ctx.transcriptBuf = `${ctx.transcriptBuf} ${text}`.trim();
                        }
                        if (msg.speech_final) {
                            const done = ctx.transcriptBuf;
                            ctx.transcriptBuf = "";
                            if (done) onCandidateAnswer(done).catch((e) => logger.error("voice: answer handling failed", { error: e.message }));
                        }
                    } else if (msg.type === "UtteranceEnd") {
                        const done = ctx.transcriptBuf;
                        ctx.transcriptBuf = "";
                        if (done) onCandidateAnswer(done).catch((e) => logger.error("voice: answer handling failed", { error: e.message }));
                    }
                });
                socketConn.connect();
            }).catch((e) => {
                logger.error("voice: Deepgram connect failed", { error: e.message });
                emitError("Speech recognition is unavailable right now.");
            });
        };

        socket.on("voice:join", async ({ sessionId, roundId, roundType }) => {
            try {
                if (!deepgram) return emitError("Voice interviews are not configured on this server.");
                const cfg = ROUND_CONFIG[roundType];
                if (!cfg) return emitError("Unknown round type.");

                const auth = await verifySocketSession(socket, sessionId);
                if (!auth.ok) return emitError("You are not authorized for this interview session.");

                const round = await RoundDetail.findById(roundId);
                if (!round || String(round.session) !== String(sessionId) || round.roundType !== roundType) {
                    return emitError("Interview round not found.");
                }

                const profile = await StudentProfile.findOne({ user: auth.session.student }).lean();
                const resumeText = await extractResumeText(profile?.resumeUrl);

                ctx = {
                    sessionId, roundId, roundType, cfg,
                    session: auth.session, profile, resumeText,
                    dg: null, transcriptBuf: "", closing: false,
                };

                openDeepgram();
                socket.emit("voice:ready", { roundType });

                // First question (only if the round is fresh — supports rejoin).
                if (round.questionsEvaluations.length === 0) {
                    const q = await askGemini(
                        cfg.systemPrompt(auth.session.targetRole, jd(auth.session), resumeText),
                        roundType === "technical"
                            ? "Design a URL shortener that serves 10,000 requests per second. Walk me through the data model and the read path."
                            : "Tell me about a time you disagreed with a teammate on a technical decision and how you resolved it."
                    );
                    round.questionsEvaluations.push({
                        questionId: `${roundType.toUpperCase()}_Q_${Date.now()}`,
                        questionText: q,
                        difficultyTag: roundType === "technical" ? "Hard" : "Medium",
                        studentAnswer: "",
                        idealAnswer: "A clear, structured, specific answer.",
                        isAttempted: false,
                    });
                    round.status = "active";
                    await round.save();
                    await speak(q, 1, cfg.questionBudget);
                } else {
                    // Rejoin: re-read the last unanswered question aloud.
                    const last = round.questionsEvaluations[round.questionsEvaluations.length - 1];
                    await speak(last.questionText, round.questionsEvaluations.length, cfg.questionBudget);
                }
            } catch (err) {
                logger.error("voice:join failed", { error: err.message, stack: err.stack });
                emitError("Could not start the voice interview.");
            }
        });

        socket.on("voice:candidate-audio", (chunk) => {
            if (!ctx || !ctx.dg || ctx.closing) return;
            try {
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                if (ctx.dg.readyState === 1 || ctx.dg.readyState === "OPEN") {
                    ctx.dg.sendMedia(buf);
                }
            } catch (e) {
                // transient — ignore
            }
        });

        socket.on("voice:leave", () => cleanup());
        socket.on("disconnect", () => cleanup());

        function cleanup() {
            if (utteranceTimer) clearTimeout(utteranceTimer);
            try { ctx?.dg?.sendCloseStream?.(); } catch { /* noop */ }
            try { ctx?.dg?.close?.(); } catch { /* noop */ }
            ctx = null;
        }
    });
}

// Score the verbal Q&A of a round with Gemini (STAR / architecture rubric).
async function scoreVerbalRound(roundId) {
    const round = await RoundDetail.findById(roundId);
    if (!round) return;

    const verbal = round.questionsEvaluations.filter((q) => !q.language); // exclude the coding node
    let sum = 0;
    let counted = 0;
    for (const item of verbal) {
        if (!item.studentAnswer) continue;
        const r = await analyzeHrResponse({
            questionText: item.questionText,
            studentAnswer: item.studentAnswer,
            idealAnswer: item.idealAnswer,
        });
        item.evaluationLayers = {
            l1KeywordCoverage: r.keywordCoverage || 0,
            l2SemanticSimilarity: r.semanticSimilarity || 0,
            l3LlmRubricCorrectness: r.rubricCorrectness || 0,
            l3LlmExplanation: r.explanation || "",
        };
        item.score = Math.max(0, Math.min(10, Number(r.score) || 0));
        item.isAttempted = true;
        sum += item.score * 10;
        counted += 1;
    }

    if (round.roundType === "hr") {
        // Whole round is verbal → roundScore is the 0-100 average.
        round.roundScore = counted ? Math.round(sum / counted) : 0;
    } else {
        // Technical: sum of every per-question score (0-10). The finaliser
        // normalises this against the number of questions served.
        round.roundScore = round.questionsEvaluations.reduce((acc, q) => acc + (q.score || 0), 0);
    }
    await round.save();
}

module.exports = { attach, scoreVerbalRound };
