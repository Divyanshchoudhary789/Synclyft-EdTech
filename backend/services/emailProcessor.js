const EmailQueue = require("../models/EmailQueueModel");
const { processQueuedEmail } = require("./emailService");
const logger = require("./loggerService");

let isProcessing = false;
let intervalId = null;

const BATCH_SIZE = 20;
const POLL_INTERVAL_MS = 10000;

const processBatch = async () => {
    if (isProcessing) {
        return;
    }

    const pendingCount = await EmailQueue.countDocuments({ status: "pending" });
    if (pendingCount === 0) {
        return;
    }

    isProcessing = true;
    try {
        const emails = await EmailQueue.findPendingEmails({ limit: BATCH_SIZE });

        if (emails.length === 0) {
            return;
        }

        logger.info(`Email processor processing batch of ${emails.length} emails`);

        for (const email of emails) {
            try {
                await processQueuedEmail(email);
            } catch (err) {
                logger.error(`Failed to process queued email ${email._id}: ${err.message}`);
            }
        }
    } catch (err) {
        logger.error("Email processor batch error:", err);
    } finally {
        isProcessing = false;
    }
};

const start = () => {
    if (intervalId) {
        logger.warn("Email processor already running");
        return;
    }

    if (process.env.EMAIL_PROCESSOR_DISABLED === "true") {
        logger.info("Email processor is disabled via EMAIL_PROCESSOR_DISABLED env flag");
        return;
    }

    intervalId = setInterval(processBatch, POLL_INTERVAL_MS);

    processBatch();

    logger.info(`Email processor started (polling every ${POLL_INTERVAL_MS}ms, batch size: ${BATCH_SIZE})`);
};

const stop = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info("Email processor stopped");
    }
};

const getStatus = async () => {
    const stats = await EmailQueue.getQueueStats();
    const isRunning = intervalId !== null;
    return {
        isRunning,
        batchSize: BATCH_SIZE,
        pollIntervalMs: POLL_INTERVAL_MS,
        queue: stats,
    };
};

module.exports = {
    start,
    stop,
    getStatus,
    processBatch
};
