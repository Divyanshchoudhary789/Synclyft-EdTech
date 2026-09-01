const env = require('./config/env.js'); // loads + validates .env before anything else

const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoose = require('mongoose');
const session = require('express-session');

const passport = require('passport');
require('./config/passport.js');

const logger = require("./services/loggerService.js");

const {
    errorHandler,
    notFoundHandler
} = require('./utils/errorHandler.js');

const {
    helmetMiddleware,
    generalLimiter,
    getCorsOptions,
    securityHeaders,
    limitInputLength,
    requestContext
} = require('./utils/securityUtils.js');

const {
    sanitizeRequest,
    addRequestId,
    requestLogger
} = require('./middlewares/validationMiddleware.js');

const mainRouter = require('./routes/main.router.js');
const { initSocket } = require("./config/socket.js");
const initializeProctoringEngine = require('./services/proctorEngine.js');
const initializeLiveHRPipelineEngine = require("./services/hrVoiceEngine.js");
const initializeLiveTechnicalPipelineEngine = require("./services/technicalVoiceEngine.js");
const emailProcessor = require("./services/emailProcessor");
const followUpProcessor = require("./services/followUpProcessor");
const { initRedis } = require("./config/redis.js");
const { startTimerSweeper } = require("./services/timerService.js");
require("./services/automatedCron.js"); // registers subscription/billing/timer-fallback crons

const app = express();
const server = http.createServer(app);
const port = env.port;

// Behind Render / Nginx / Vercel edge — required for correct client IPs in
// rate-limiting and for `secure` cookies to be honoured.
app.set('trust proxy', 1);

// Security middleware
app.use(helmetMiddleware);
app.use(securityHeaders);
app.use(cors(getCorsOptions()));
app.use(compression());

// Body parsing middleware
app.use(cookieParser());
// Keep the global JSON limit small; large bodies (base64 media, resume text)
// are opted-in per-route where needed.
app.use(express.json({
    limit: '2mb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(limitInputLength);

// Rate limiting
app.use(generalLimiter);

// Request tracking and logging middleware
app.use(addRequestId);
app.use(requestContext);
app.use(sanitizeRequest);
app.use(requestLogger);


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Production me HTTPS mandatory hai
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
    }
}));



// Authentication
app.use(passport.initialize());
app.use(passport.session());

// Database connection
mongoose.connect(process.env.MONGODB_URL)
    .then(async () => {
        logger.info('MongoDB connected successfully');
        emailProcessor.start();
        followUpProcessor.start();

        // Timer service: non-fatal if Redis is unavailable (degrades to DB-only).
        await initRedis();
        startTimerSweeper();
    })
    .catch((error) => {
        logger.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    });

// Real-time features
const io = initSocket(server);
initializeProctoringEngine(io);
initializeLiveHRPipelineEngine(io);
initializeLiveTechnicalPipelineEngine(io);

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to Synclyft - EdTech",
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api', mainRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Server startup
server.listen(port, () => {
    logger.info(`Server running on port ${port} (${process.env.NODE_ENV || 'development'})`);
});

// Graceful shutdown handlers
const gracefulShutdown = () => {
    logger.info('Shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        emailProcessor.stop();
        followUpProcessor.stop();
        mongoose.connection.close().then(() => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        }).catch(err => {
            logger.error('MongoDB connection close error:', err);
            process.exit(1);
        });
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason}`);
    process.exit(1);
});
