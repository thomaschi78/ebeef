/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

const { createLogger } = require('./logger');

const log = createLogger('config');

/**
 * Required environment variables for each mode
 */
const REQUIRED_ENV = {
  // Always required
  common: ['DATABASE_URL'],

  // Required in production mode only
  production: [
    'JWT_SECRET',
    'CORS_ORIGINS',
  ],

  // Optional (WhatsApp integration)
  optional: [
    'WHATSAPP_TOKEN',
    'PHONE_NUMBER_ID',
    'VERIFY_TOKEN',
    'WHATSAPP_APP_SECRET',
  ],

  // Optional but recommended
  recommended: ['OPENAI_API_KEY', 'SENTRY_DSN'],
};

/**
 * Validate environment variables
 * @param {string} mode - Application mode (demo or production)
 * @returns {Object} - Validation result
 */
function validateEnv(mode = 'demo') {
  const errors = [];
  const warnings = [];

  // Check common required variables
  for (const envVar of REQUIRED_ENV.common) {
    if (!process.env[envVar]) {
      errors.push(`${envVar} é obrigatório`);
    }
  }

  // Check production-specific variables
  if (mode === 'production') {
    for (const envVar of REQUIRED_ENV.production) {
      if (!process.env[envVar]) {
        errors.push(`${envVar} é obrigatório em modo produção`);
      }
    }

    // Check JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET deve ter pelo menos 32 caracteres para segurança adequada');
    }

    // Check if using default values
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET está usando valor padrão - altere para produção');
    }

    if (process.env.VERIFY_TOKEN === 'your-webhook-verify-token') {
      errors.push('VERIFY_TOKEN está usando valor padrão - altere para produção');
    }
  }

  // Check recommended variables
  for (const envVar of REQUIRED_ENV.recommended) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar} não configurado (funcionalidade reduzida)`);
    }
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL deve começar com postgresql://');
    }
  }

  // Validate PORT if set
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('PORT deve ser um número entre 1 e 65535');
    }
  }

  // Log results
  if (errors.length > 0) {
    log.error({ errors }, 'Erro na validação de ambiente');
  }

  if (warnings.length > 0) {
    log.warn({ warnings }, 'Avisos de configuração');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate and exit if invalid
 * Call this on startup in production mode
 */
function validateEnvOrExit(mode = 'demo') {
  const result = validateEnv(mode);

  if (!result.valid) {
    log.fatal({ errors: result.errors }, 'Configuração inválida - servidor não iniciará');
    console.error('\n❌ Erro de configuração:\n');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    console.error('\n');
    process.exit(1);
  }

  if (result.warnings.length > 0 && mode === 'production') {
    console.warn('\n⚠️  Avisos de configuração:\n');
    result.warnings.forEach((warn) => console.warn(`  - ${warn}`));
    console.warn('\n');
  }

  return result;
}

module.exports = {
  validateEnv,
  validateEnvOrExit,
};
