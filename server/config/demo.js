/**
 * Demo Configuration
 * Used for demonstrations and testing without authentication
 */

module.exports = {
  mode: 'demo',

  // Authentication disabled in demo mode
  auth: {
    enabled: false,
    bypassToken: 'demo', // Any request with this token bypasses auth
  },

  // CORS allows all localhost ports
  cors: {
    origins: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  },

  // Rate limiting relaxed for demo
  rateLimit: {
    enabled: false,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  },

  // WhatsApp integration mocked
  whatsapp: {
    mockMode: true, // Always mock in demo
  },

  // Logging verbose for debugging
  logging: {
    level: 'debug',
    prettyPrint: true,
  },

  // Demo user for auto-login
  demoUser: {
    id: 1,
    email: 'demo@ebeef.com.br',
    name: 'Operador Demo',
    role: 'operator',
  },
};
