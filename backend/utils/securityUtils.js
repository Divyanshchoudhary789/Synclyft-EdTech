const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('../services/loggerService');
const { client: redisClient } = require('../config/redis.js');
const { frontendUrls } = require('../config/env.js');

/**
 * Rate-limit store that runs on per-instance memory until the shared Redis
 * client is connected, then transparently switches to Redis so limits are
 * consistent across horizontally-scaled instances (Render). Building the
 * RedisStore lazily avoids the "client is closed" crash at boot.
 */
class HybridRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.memory = new MemoryStore();
    this.redis = null;
    this.options = null;
  }
  init(options) {
    this.options = options;
    this.memory.init(options);
  }
  _active() {
    if (!this.redis && redisClient && redisClient.isReady) {
      try {
        this.redis = new RedisStore({
          prefix: `rl:${this.prefix}:`,
          sendCommand: (...args) => redisClient.sendCommand(args),
        });
        this.redis.init(this.options);
        logger.info(`[rate-limit] Redis store active for "${this.prefix}"`);
      } catch (err) {
        this.redis = null;
        logger.warn(`[rate-limit] Redis store failed for "${this.prefix}": ${err.message}`);
      }
    }
    return this.redis || this.memory;
  }
  increment(key) { return this._active().increment(key); }
  decrement(key) { return this._active().decrement(key); }
  resetKey(key) { return this._active().resetKey(key); }
  resetAll() { return this.memory.resetAll && this.memory.resetAll(); }
}

const makeStore = (prefix) => new HybridRateLimitStore(prefix);

const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('general'),
  // Payment gateways (Razorpay) retry webhooks; never throttle them or
  // activation can be delayed / dropped.
  skip: (req) => req.path.includes('/webhooks/')
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('strict')
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('auth')
});

const getCorsOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const parseList = (v) => String(v || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const extra = parseList(process.env.CORS_ALLOWED_ORIGINS);

  const allowedOrigins = [
    // FRONTEND_URL may itself be a comma-separated list of app origins;
    // config/env.js parses it into frontendUrls.
    ...frontendUrls,
    ...extra,
    // Local dev origins are only trusted outside production.
    ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173']),
  ].filter(Boolean);

  return {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
  };
};

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

const limitInputLength = (req, res, next) => {
  const maxStringLength = 500;
  const maxArrayLength = 100;

  const checkDepth = (obj, depth = 0) => {
    if (depth > 10) throw new Error('Object nesting too deep');
    if (Array.isArray(obj)) {
      if (obj.length > maxArrayLength) throw new Error('Array too large');
      obj.forEach(item => checkDepth(item, depth + 1));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => checkDepth(value, depth + 1));
    } else if (typeof obj === 'string' && obj.length > maxStringLength) {
      throw new Error('String too long');
    }
  };

  try {
    if (req.body) checkDepth(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addRequestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

const requestContext = (req, res, next) => {
  req.context = {
    timestamp: new Date(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path,
    userId: req.user?.id || null,
    userRole: req.user?.role || null
  };
  next();
};

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      message: 'HTTP Request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous'
    });
  });

  next();
};

module.exports = {
  helmetMiddleware,
  generalLimiter,
  strictLimiter,
  authLimiter,
  makeStore,
  getCorsOptions,
  securityHeaders,
  limitInputLength,
  addRequestId,
  requestContext,
  requestLogger
};
