const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 */
function errorHandler(err, req, res, next) {
  logger.error(`Error processing ${req.method} ${req.url}:`, err.message || err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || null,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
