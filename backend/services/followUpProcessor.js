const FollowUpEngine = require('../services/followUpEngine');
const logger = require('./loggerService');

let isProcessing = false;
let intervalId = null;

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 60000;

const processBatch = async () => {
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    try {
        const results = await FollowUpEngine.processPendingFollowUps();
        if (results.length > 0) {
            logger.info(`Follow-up processor processed ${results.length} follow-ups`);
        }
    } catch (err) {
        logger.error("Follow-up processor batch error:", err);
    } finally {
        isProcessing = false;
    }
};

const start = () => {
    if (intervalId) {
        logger.warn("Follow-up processor already running");
        return;
    }

    intervalId = setInterval(processBatch, POLL_INTERVAL_MS);

    processBatch();

    logger.info(`Follow-up processor started (polling every ${POLL_INTERVAL_MS}ms)`);
};

const stop = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info("Follow-up processor stopped");
    }
};

const getStatus = async () => {
    const stats = await FollowUpEngine.getFollowUpStats();
    const isRunning = intervalId !== null;
    return {
        isRunning,
        pollIntervalMs: POLL_INTERVAL_MS,
        stats
    };
};

module.exports = {
    start,
    stop,
    getStatus,
    processBatch
};
