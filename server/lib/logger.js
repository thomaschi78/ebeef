/**
 * Structured Logger using Pino
 * Pretty prints in demo mode, JSON in production
 */

const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logging?.level || 'info',
  transport: config.logging?.prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: config.mode,
  },
});

// Create child loggers for different modules
const createLogger = (module) => {
  return logger.child({ module });
};

module.exports = {
  logger,
  createLogger,
};
