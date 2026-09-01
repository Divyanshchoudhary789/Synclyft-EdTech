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
    codingMetadata: {
        language: String,
        testCasesPassed: { type: Number, default: 0 },
        totalTestCases: { type: Number, default: 0 },
        runtimeMs: { type: Number, default: 0 },
        memoryKb: { type: Number, default: 0 },
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
    endedAt: { type: Date }
}, { timestamps: true });

// Supports the DB fallback cron that finalizes overdue, still-active rounds.
RoundDetailSchema.index({ status: 1, endsAt: 1 });

const RoundDetail = mongoose.model("RoundDetail", RoundDetailSchema);

module.exports = RoundDetail;