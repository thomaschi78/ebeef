/**
 * Configuration Loader
 * Loads appropriate config based on APP_MODE environment variable
 */

const demoConfig = require('./demo');
const productionConfig = require('./production');

// Determine which config to use
const mode = process.env.APP_MODE || 'demo';

let config;

if (mode === 'production') {
  // Validate required production environment variables
  const requiredEnvVars = ['JWT_SECRET', 'CORS_ORIGINS'];
  const missing = requiredEnvVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error('='.repeat(60));
    console.error('ERRO: Variáveis de ambiente obrigatórias não configuradas:');
    missing.forEach((v) => console.error(`  - ${v}`));
    console.error('='.repeat(60));
    process.exit(1);
  }

  config = productionConfig;
  console.log('Modo: PRODUÇÃO - Autenticação ATIVADA');
} else {
  config = demoConfig;
  console.log('Modo: DEMO - Autenticação DESATIVADA');
  console.log('⚠️  Use APP_MODE=production para ambiente de produção');
}

module.exports = config;
