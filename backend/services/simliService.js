// =============================================================================
// SIMLI SERVICE
// -----------------------------------------------------------------------------
// Thin wrapper around Simli's Compose API. We generate the session token on the
// server so the SIMLI_API_KEY is never exposed to the browser. The client then
// uses this token with the `simli-client` SDK to open the WebRTC avatar stream
// and we push PCM16 (16 kHz mono) audio to it via our socket relay.
//
// Docs: https://docs.simli.com/api-reference/compose-session-token
// =============================================================================

const axios = require("axios");
const logger = require("./loggerService.js");

const SIMLI_BASE = process.env.SIMLI_BASE_URL || "https://api.simli.ai";

/**
 * Create a Compose session token for an avatar face.
 * @param {{ faceId: string, maxSessionLength?: number, maxIdleTime?: number }} opts
 * @returns {Promise<string>} session_token
 */
async function createSimliSessionToken({ faceId, maxSessionLength = 1800, maxIdleTime = 300 }) {
    if (!process.env.SIMLI_API_KEY) {
        const err = new Error("Simli is not configured (SIMLI_API_KEY missing).");
        err.code = "SIMLI_NOT_CONFIGURED";
        throw err;
    }
    if (!faceId) {
        const err = new Error("A Simli faceId is required.");
        err.code = "SIMLI_FACE_MISSING";
        throw err;
    }

    try {
        const { data } = await axios.post(
            `${SIMLI_BASE}/compose/token`,
            {
                faceId,
                apiVersion: "v2",
                handleSilence: true,
                maxSessionLength,
                maxIdleTime,
                audioInputFormat: "pcm16",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-simli-api-key": process.env.SIMLI_API_KEY,
                },
                timeout: 10000,
            }
        );

        const token = data?.session_token;
        if (!token) {
            throw new Error("Simli did not return a session_token.");
        }
        return token;
    } catch (err) {
        logger.error("createSimliSessionToken failed", {
            status: err.response?.status,
            body: err.response?.data,
            message: err.message,
        });
        const wrapped = new Error(
            err.response?.status === 401
                ? "Simli rejected the API key."
                : "Could not start the AI interviewer avatar."
        );
        wrapped.code = "SIMLI_SESSION_FAILED";
        wrapped.statusCode = 503;
        throw wrapped;
    }
}

module.exports = { createSimliSessionToken };
