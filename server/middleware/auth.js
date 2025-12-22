/**
 * Authentication Middleware
 * Handles JWT verification and demo mode bypass
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Main authentication middleware
 * In demo mode: auto-authenticates with demo user
 * In production: requires valid JWT token
 */
function authenticate(req, res, next) {
  // Demo mode - bypass authentication
  if (!config.auth.enabled) {
    req.user = config.demoUser;
    req.isDemo = true;
    return next();
  }

  // Production mode - require JWT
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token de autenticação não fornecido',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Use: Bearer <token>',
      code: 'AUTH_TOKEN_INVALID_FORMAT',
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    req.isDemo = false;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado. Faça login novamente.',
        code: 'AUTH_TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      error: 'Token inválido',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
}

/**
 * Role-based authorization middleware
 * Use after authenticate middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // Demo mode bypasses role check
    if (req.isDemo) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        code: 'AUTH_NOT_AUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Você não tem permissão para esta ação',
        code: 'AUTH_FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Socket.io authentication middleware
 * Validates JWT from handshake auth or query
 */
function authenticateSocket(socket, next) {
  // Demo mode - bypass authentication
  if (!config.auth.enabled) {
    socket.user = config.demoUser;
    socket.isDemo = true;
    return next();
  }

  // Get token from handshake
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Token de autenticação não fornecido'));
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    socket.user = decoded;
    socket.isDemo = false;
    next();
  } catch (err) {
    next(new Error('Token inválido ou expirado'));
  }
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

/**
 * Generate refresh token for user
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.refreshTokenExpiresIn,
  });
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch {
    return null;
  }
}

module.exports = {
  authenticate,
  authorize,
  authenticateSocket,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
};
