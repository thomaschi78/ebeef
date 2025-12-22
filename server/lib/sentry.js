/**
 * Sentry Error Tracking Configuration
 *
 * Setup: Add SENTRY_DSN to your environment variables
 * Get your DSN from: https://sentry.io/settings/[org]/projects/[project]/keys/
 */

const Sentry = require('@sentry/node');
const config = require('../config');

const isEnabled = () => {
  return !!process.env.SENTRY_DSN && config.mode === 'production';
};

/**
 * Initialize Sentry
 * Call this BEFORE any other imports in index.js
 */
const init = (_app) => {
  if (!isEnabled()) {
    console.log('Sentry: Disabled (SENTRY_DSN not set or not in production mode)');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.mode,
    release: process.env.npm_package_version || '1.0.0',

    // Performance monitoring
    tracesSampleRate: config.mode === 'production' ? 0.1 : 1.0,

    // Only send errors in production
    enabled: config.mode === 'production',

    // Integrations
    integrations: [
      // Express integration is automatically added
      Sentry.expressIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request && event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive data from body
      if (event.request && event.request.data) {
        const data = event.request.data;
        if (typeof data === 'object') {
          delete data.password;
          delete data.token;
          delete data.refreshToken;
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Ignore rate limit errors
      'Too many requests',
      // Ignore authentication errors
      'jwt expired',
      'invalid token',
      // Ignore client errors
      'Request aborted',
      'ECONNRESET',
    ],
  });

  console.log('Sentry: Initialized for', config.mode);
};

/**
 * Express error handler middleware
 * Use this AFTER all routes and other error handlers
 */
const errorHandler = () => {
  if (!isEnabled()) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.expressErrorHandler();
};

/**
 * Request handler middleware
 * Use this BEFORE all routes
 */
const requestHandler = () => {
  if (!isEnabled()) {
    return (req, res, next) => next();
  }
  return Sentry.expressRequestHandler();
};

/**
 * Capture an exception manually
 */
const captureException = (error, context = {}) => {
  if (!isEnabled()) {
    console.error('Error (Sentry disabled):', error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser(context.user);
    }
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture a message manually
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (!isEnabled()) {
    console.log(`Message (Sentry disabled) [${level}]:`, message);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    Sentry.captureMessage(message);
  });
};

/**
 * Set user context for current scope
 */
const setUser = (user) => {
  if (!isEnabled()) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

/**
 * Clear user context
 */
const clearUser = () => {
  if (!isEnabled()) return;
  Sentry.setUser(null);
};

module.exports = {
  init,
  isEnabled,
  errorHandler,
  requestHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  Sentry, // Export raw Sentry for advanced usage
};
