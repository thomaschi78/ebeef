/**
 * Request/Response Logging Middleware
 * Uses Pino for structured logging with request IDs
 */

const crypto = require('crypto');
const { createLogger } = require('../lib/logger');
const config = require('../config');

const log = createLogger('http');

// Generate short request ID
const generateRequestId = () => {
  return crypto.randomBytes(4).toString('hex');
};

/**
 * Request logging middleware
 * Logs request start and response completion with timing
 */
function requestLogger(req, res, next) {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Skip health check logging to reduce noise
  if (req.path === '/health') {
    return next();
  }

  const start = Date.now();

  // Log request start (only in debug mode)
  if (log.level === 'debug') {
    log.debug({
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
    }, 'Request started');
  }

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    log[logLevel]({
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      // Include user info if available (from auth middleware)
      userId: req.user?.id,
      userName: req.user?.name,
    }, `${req.method} ${req.path} ${statusCode} ${duration}ms`);
  });

  next();
}

/**
 * Error logging middleware
 * Must be registered after all routes
 */
function errorLogger(err, req, res, next) {
  const requestId = req.requestId || generateRequestId();

  log.error({
    requestId,
    method: req.method,
    path: req.path,
    error: {
      message: err.message,
      stack: config.mode === 'demo' ? err.stack : undefined,
      code: err.code,
    },
  }, `Error: ${err.message}`);

  // Pass to default error handler
  next(err);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  const requestId = req.requestId || generateRequestId();

  log.warn({
    requestId,
    method: req.method,
    path: req.path,
  }, `Route not found: ${req.method} ${req.path}`);

  res.status(404).json({
    error: 'Rota não encontrada',
    code: 'NOT_FOUND',
    path: req.path,
  });
}

module.exports = {
  requestLogger,
  errorLogger,
  notFoundHandler,
};
