const { createClient } = require("redis");
const logger = require('../services/loggerService.js');


const REDIS_URL = process.env.REDIS_URL;
const isTls = Boolean(REDIS_URL) && REDIS_URL.startsWith("rediss://");

if (!REDIS_URL) {
    logger.warn("[Redis] REDIS_URL is not set — round timer will run in DB-only degraded mode.");
} else if (process.env.NODE_ENV === "production" && !isTls) {
    logger.warn(
        "[Redis] NODE_ENV=production but REDIS_URL is not rediss:// (TLS). " +
        "Upstash requires TLS — use the rediss:// URL from your Upstash console."
    );
}

// Only construct a client when a URL is provided; otherwise stay in degraded mode.
const client = REDIS_URL
    ? createClient({
          url: REDIS_URL,
          pingInterval: 30000, // keep-alive against Upstash idle timeout
          socket: {
              connectTimeout: 10000,
              reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
              keepAlive: true,
          },
      })
    : null;

if (client) {
    client.on("error", (err) => logger.error("[Redis] Client error:", err.message));
    client.on("connect", () => logger.info("[Redis] Connected"));
    client.on("reconnecting", () => logger.info("[Redis] Reconnecting..."));
}

let bootstrapped = false;

async function initRedis() {
    if (!client) return null;
    if (client.isReady) return client;
    try {
        await client.connect();
        bootstrapped = true;
        logger.info(`[Redis] Ready (TLS=${isTls ? "on" : "off"})`);
    } catch (err) {
        logger.error("[Redis] Connection failed, timer will run in degraded mode:", err.message);
        bootstrapped = false;
    }
    return client;
}

function isRedisReady() {
    return bootstrapped && Boolean(client) && client.isReady;
}

module.exports = { client, initRedis, isRedisReady };
