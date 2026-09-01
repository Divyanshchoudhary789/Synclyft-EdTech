const logger = require('../services/loggerService');
const { ApiError } = require('../utils/errorHandler');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        logger.warn({
          message: 'Validation failed',
          source,
          path: req.path,
          errors
        });

        return next(new ApiError(400, 'Validation Error', errors));
      }

      req[source] = value;
      next();
    } catch (err) {
      logger.error({
        message: 'Validation middleware error',
        error: err.message
      });
      next(err);
    }
  };
};

const stripTags = (str) =>
  str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

/**
 * Mutates `obj` in place:
 *  - drops keys starting with `$` or containing `.` (NoSQL operator injection)
 *  - strips <script>/<iframe> from string values
 * In Express 5 `req.query` / `req.params` are getter-only, so we can never
 * reassign them — everything here is an in-place mutation.
 */
const sanitizeInPlace = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 12) return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = stripTags(val);
    } else if (val && typeof val === 'object') {
      sanitizeInPlace(val, depth + 1);
    }
  }
};

const sanitizeRequest = (req, res, next) => {
  try {
    sanitizeInPlace(req.body);
    sanitizeInPlace(req.query);
    sanitizeInPlace(req.params);
    next();
  } catch (err) {
    logger.error({ message: 'Sanitization error', error: err.message });
    next(err);
  }
};

const addRequestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      message: 'HTTP Request',
      requestId: req.id,
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
  validate,
  sanitizeRequest,
  addRequestId,
  requestLogger
};
