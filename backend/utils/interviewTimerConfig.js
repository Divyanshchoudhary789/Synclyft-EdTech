// =============================================================================
// INTERVIEW ROUND TIMER POLICY
// -----------------------------------------------------------------------------
// Per-round time budgets. All values are in SECONDS and are fully configurable
// here without touching business logic. Durations are computed on the server
// (never trusted from the client) so the timer cannot be tampered with.
//
// These are total-round budgets sized for a realistic mock interview, not
// generous per-question allowances. A candidate can always finish early.
// =============================================================================

const ROUND_DURATION_POLICY = {
    // Round 1 - Aptitude: 15 MCQs are served PER selected topic.
    // Budget = (topics selected) * 15 * perQuestionSeconds, capped.
    aptitude: {
        perQuestionSeconds: 60,
        maxTotalSeconds: 75 * 60, // hard cap even if many topics picked
    },

    // Round 2 - Coding: fixed distribution 3 Easy / 5 Medium / 2 Hard,
    // one flat budget for the whole round.
    coding: {
        totalSeconds: 60 * 60, // 60 min
    },

    // Round 3 - Technical: AI persona phase + one hard coding question.
    technical: {
        personaSeconds: 10 * 60, // 10 min verbal persona
        codingSeconds: 30 * 60,  // 30 min hard code
    },

    // Round 4 - HR: live voice conversation.
    hr: {
        totalSeconds: 15 * 60, // 15 min
    },
};

// Fixed difficulty breakdown for the coding round (matches the spec).
const CODING_DISTRIBUTION = { Easy: 3, Medium: 5, Hard: 2 };

/**
 * Compute the total allowed duration (seconds) for a given round.
 * @param {('aptitude'|'coding'|'technical'|'hr')} roundType
 * @param {{ topicsCount?: number }} opts - aptitude needs selected topic count
 * @returns {number} duration in seconds
 */
function computeRoundDurationSeconds(roundType, opts = {}) {
    const topicsCount = opts.topicsCount || 0;

    switch (roundType) {
        case "aptitude": {
            const { perQuestionSeconds, maxTotalSeconds } = ROUND_DURATION_POLICY.aptitude;
            const totalQuestions = Math.max(1, topicsCount) * 15;
            return Math.min(totalQuestions * perQuestionSeconds, maxTotalSeconds);
        }
        case "coding":
            return ROUND_DURATION_POLICY.coding.totalSeconds;
        case "technical": {
            const { personaSeconds, codingSeconds } = ROUND_DURATION_POLICY.technical;
            return personaSeconds + codingSeconds;
        }
        case "hr":
            return ROUND_DURATION_POLICY.hr.totalSeconds;
        default:
            return 30 * 60;
    }
}

module.exports.ROUND_DURATION_POLICY = ROUND_DURATION_POLICY;
module.exports.CODING_DISTRIBUTION = CODING_DISTRIBUTION;
module.exports.computeRoundDurationSeconds = computeRoundDurationSeconds;
