/**
 * Sentry error tracking. Must be required before Express and route modules so
 * the auto-instrumentation can patch them. No-ops when SENTRY_DSN is unset.
 */
const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || undefined,
        // Keep tracing light; bump if you want performance data.
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
        sendDefaultPii: false,
        ignoreErrors: [
            'Not allowed by CORS',
            'Please Login!',
            'Unauthorized, Access Denied!',
        ],
    });
}

module.exports = Sentry;
