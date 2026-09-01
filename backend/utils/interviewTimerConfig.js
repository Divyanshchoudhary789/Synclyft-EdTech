// =============================================================================
// INTERVIEW ROUND TIMER POLICY
// -----------------------------------------------------------------------------
// Per-round time budgets. All values are in SECONDS and are fully configurable
// here without touching business logic. Durations are computed on the server
// (never trusted from the client) so the timer cannot be tampered with.
// =============================================================================

const ROUND_DURATION_POLICY = {
    // Round 1 - Aptitude: 15 questions are served PER selected topic.
    // Time = (topics selected) * 15 * perQuestionSeconds.
    aptitude: {
        perQuestionSeconds: 40,
    },

    // Round 2 - Coding: fixed distribution 3 Easy / 5 Medium / 2 Hard.
    coding: {
        byDifficulty: {
            Easy: 20 * 60,   // 20 min
            Medium: 30 * 60, // 30 min
            Hard: 45 * 60,   // 45 min
        },
    },

    // Round 3 - Technical: AI persona phase + one hard coding question.
    technical: {
        personaSeconds: 5 * 60,  // 5 min verbal persona
        codingSeconds: 45 * 60,  // 45 min hard code
    },

    // Round 4 - HR: live voice conversation.
    hr: {
        totalSeconds: 15 * 60, // 15 min
    },
};

// Fixed difficulty breakdown for the coding round (matches your spec).
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
            const totalQuestions = topicsCount * 15;
            return totalQuestions * ROUND_DURATION_POLICY.aptitude.perQuestionSeconds;
        }
        case "coding": {
            const { Easy, Medium, Hard } = CODING_DISTRIBUTION;
            const { byDifficulty } = ROUND_DURATION_POLICY.coding;
            return (
                Easy * byDifficulty.Easy +
                Medium * byDifficulty.Medium +
                Hard * byDifficulty.Hard
            );
        }
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
