/**
 * Production Configuration
 * Full security enabled - requires authentication for all operations
 */

module.exports = {
  mode: 'production',

  // Authentication required in production
  auth: {
    enabled: true,
    jwtSecret: process.env.JWT_SECRET, // MUST be set in environment
    jwtExpiresIn: '8h', // Token expires in 8 hours (work shift)
    refreshTokenExpiresIn: '7d', // Refresh token expires in 7 days
    bcryptRounds: 12, // Password hashing rounds
  },

  // CORS restricted to production domain
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
  },

  // Rate limiting enabled
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
  },

  // WhatsApp integration real
  whatsapp: {
    mockMode: false,
    verifySignature: true, // Validate X-Hub-Signature
  },

  // Logging structured for production
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: false, // JSON format for log aggregation
  },

  // No demo user in production
  demoUser: null,
};
