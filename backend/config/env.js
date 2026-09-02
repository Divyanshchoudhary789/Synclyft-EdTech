/**
 * Centralised environment loading + validation.
 *
 * Require this ONCE, as early as possible (before any other local module that
 * reads process.env at import time). It:
 *   1. loads .env quietly (no dotenv promo banner)
 *   2. fails fast in production if a required var is missing
 *   3. warns (but continues) for vars that only degrade a feature
 */

require('dotenv').config({ quiet: true });

const isProd = process.env.NODE_ENV === 'production';

// Vars the process cannot run correctly without.
const REQUIRED = [
    'MONGODB_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'FRONTEND_URL',
    'BACKEND_URL',
];

// Vars that only disable/limit a single feature when absent.
const RECOMMENDED = [
    'REDIS_URL',            // round timer -> DB-only degraded mode
    'JUDGE0_URL',           // coding round execution
    'GEMINI_API_KEY',       // AI evaluation
    'SMTP_HOST',            // transactional email
    'RAZORPAY_KEY_SECRET',  // billing
    'R2_BUCKET',            // file uploads
];

const missing = REQUIRED.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
const weakSecrets = ['JWT_SECRET', 'SESSION_SECRET']
    .filter((k) => process.env[k] && process.env[k].length < 32);

if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
    if (isProd) process.exit(1);
}

if (weakSecrets.length && isProd) {
    // eslint-disable-next-line no-console
    console.error(`[env] Secrets shorter than 32 chars in production: ${weakSecrets.join(', ')}`);
    process.exit(1);
}

const softMissing = RECOMMENDED.filter((k) => !process.env[k]);
if (softMissing.length) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Optional vars not set (related features degrade): ${softMissing.join(', ')}`);
}

// FRONTEND_URL is sometimes set to a comma-separated list of origins (student /
// officer / admin apps). Normalise it: keep the FIRST entry as the canonical
// single URL that every `process.env.FRONTEND_URL` consumer expects (OAuth
// redirects, email links, payment callbacks), and expose the full list for CORS.
const frontendUrls = String(process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
process.env.FRONTEND_URL = frontendUrls[0];

module.exports = {
    isProd,
    isDev: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    port: Number(process.env.PORT) || 8080,
    frontendUrl: frontendUrls[0],
    frontendUrls,
    // DB names for the auxiliary connections used by the interview engine.
    codingDbName: process.env.CODING_DB_NAME || 'Synclyft-EdTech',
    aptitudeDbName: process.env.APTITUDE_DB_NAME || 'aptitude_platform',
};
