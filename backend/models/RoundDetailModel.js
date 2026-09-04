const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuestionEvaluationSchema = new Schema({
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    difficultyTag: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    studentAnswer: { type: String, default: '' },
    idealAnswer: { type: Schema.Types.Mixed, default: '' },
    language: { type: String, default: '' },
    isAttempted: { type: Boolean, default: false },
    topic: { type: String, default: '' },
    sub_topic: { type: String, default: '' },
    options: [{ type: String, default: '' }],
    explanation: { type: String, default: '' },
    // Aptitude only: the 1-indexed page this MCQ was served on, so the client
    // question palette can restore any-order navigation after a refresh.
    aptitudePage: { type: Number },
    codingMetadata: {
        language: String,
        testCasesPassed: { type: Number, default: 0 },
        totalTestCases: { type: Number, default: 0 },
        runtimeMs: { type: Number, default: 0 },
        memoryKb: { type: Number, default: 0 },
        timeComplexity: { type: String, default: '' },
        spaceComplexity: { type: String, default: '' },
        statusDescription: { type: String, default: 'Unattempted' }
    },
    evaluationLayers: {
        l1KeywordCoverage: { type: Number, default: 0 },
        l2SemanticSimilarity: { type: Number, default: 0 },
        l3LlmRubricCorrectness: { type: Number, default: 0 },
        l3LlmExplanation: { type: String, default: '' }
    },
    score: { type: Number, default: 0 }
}, { _id: false });

const RoundDetailSchema = new Schema({
    session: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true },
    roundType: { type: String, enum: ['aptitude', 'coding', 'technical', 'hr'], required: true },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    questionsEvaluations: [QuestionEvaluationSchema],
    roundScore: { type: Number, default: 0 },

    // --- Per-round server-authoritative timer state ---
    // startedAt/endsAt are the source of truth for time enforcement.
    startedAt: { type: Date },
    endsAt: { type: Date },
    durationSeconds: { type: Number },
    // true when the round was closed automatically because time ran out.
    forceEnded: { type: Boolean, default: false },
    endedAt: { type: Date },

    // External provider (aptitude / coding model) batch session id, kept so a
    // client refresh can resume the round without re-initialising the provider.
    providerSessionId: { type: String, default: '' },
    aptitudeTopics: [{ type: String }],
    // Aptitude only: total MCQs in the generated batch (from the provider's
    // pagination), so the client can render the full question palette.
    aptitudeTotalQuestions: { type: Number, default: 0 }
}, { timestamps: true });

// One round document per (session, roundType). Prevents duplicate-node crashes
// from concurrent question fetches.
RoundDetailSchema.index({ session: 1, roundType: 1 }, { unique: true });
// Supports the DB fallback cron that finalizes overdue, still-active rounds.
RoundDetailSchema.index({ status: 1, endsAt: 1 });

const RoundDetail = mongoose.model("RoundDetail", RoundDetailSchema);

module.exports = RoundDetail;