const logger = require('../services/loggerService');

class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.timestamp = new Date();
  }
}

const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
    errors = [{ field, message: `${field} must be unique` }];
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.isJoi) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
  }

  logger.error({
    message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(isDevelopment && { stack: err.stack }),
    ...(errors.length > 0 && { errors }),
    timestamp: new Date().toISOString()
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  ApiError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
