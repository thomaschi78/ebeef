/**
 * Authentication Routes
 * Handles operator login, logout, registration, and token refresh
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const config = require('../config');
const {
  authenticate,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate operator and return tokens
 */
router.post('/login', validate('login'), async (req, res) => {
  try {
    // Demo mode - return demo token
    if (!config.auth.enabled) {
      return res.json({
        success: true,
        mode: 'demo',
        user: config.demoUser,
        token: 'demo-token',
        refreshToken: null,
        message: 'Modo demo - autenticação desativada',
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
        code: 'AUTH_MISSING_CREDENTIALS',
      });
    }

    // Find operator by email
    const operator = await prisma.operator.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!operator) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    if (!operator.isActive) {
      return res.status(401).json({
        error: 'Conta desativada. Contate o administrador.',
        code: 'AUTH_ACCOUNT_DISABLED',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, operator.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    // Generate tokens
    const token = generateToken(operator);
    const refreshToken = generateRefreshToken(operator);

    // Store refresh token in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenHash,
        operatorId: operator.id,
        expiresAt,
      },
    });

    // Update last login
    await prisma.operator.update({
      where: { id: operator.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      success: true,
      user: {
        id: operator.id,
        email: operator.email,
        name: operator.name,
        role: operator.role,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Erro ao fazer login',
      code: 'AUTH_LOGIN_ERROR',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validate('refreshToken'), async (req, res) => {
  try {
    // Demo mode - return demo token
    if (!config.auth.enabled) {
      return res.json({
        success: true,
        mode: 'demo',
        token: 'demo-token',
      });
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token é obrigatório',
        code: 'AUTH_MISSING_REFRESH_TOKEN',
      });
    }

    // Verify refresh token format
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
        code: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    // Check if refresh token exists in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenHash },
      include: { operator: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      return res.status(401).json({
        error: 'Refresh token inválido ou expirado',
        code: 'AUTH_INVALID_REFRESH_TOKEN',
      });
    }

    const operator = storedToken.operator;

    if (!operator.isActive) {
      return res.status(401).json({
        error: 'Conta desativada',
        code: 'AUTH_ACCOUNT_DISABLED',
      });
    }

    // Generate new access token
    const newToken = generateToken(operator);

    res.json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Erro ao renovar token',
      code: 'AUTH_REFRESH_ERROR',
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Demo mode - nothing to do
    if (!config.auth.enabled) {
      return res.json({ success: true, message: 'Logout (demo)' });
    }

    const { refreshToken } = req.body;

    if (refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({
        where: { token: refreshTokenHash },
      });
    }

    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Erro ao fazer logout',
      code: 'AUTH_LOGOUT_ERROR',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    isDemo: req.isDemo,
  });
});

/**
 * POST /api/auth/register
 * Register new operator (admin only in production, open in demo)
 */
router.post('/register', validate('register'), async (req, res) => {
  try {
    const { email, password, name, role = 'operator' } = req.body;

    // In production, require admin auth for registration
    if (config.auth.enabled) {
      // Check if any operators exist (allow first registration without auth)
      const operatorCount = await prisma.operator.count();

      if (operatorCount > 0) {
        // Require authentication for subsequent registrations
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          return res.status(401).json({
            error: 'Autenticação necessária para registrar novos operadores',
            code: 'AUTH_REQUIRED',
          });
        }

        // Verify admin role
        // TODO: Add proper admin verification
      }
    }

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, senha e nome são obrigatórios',
        code: 'AUTH_MISSING_FIELDS',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Senha deve ter no mínimo 8 caracteres',
        code: 'AUTH_WEAK_PASSWORD',
      });
    }

    // Check if email already exists
    const existing = await prisma.operator.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({
        error: 'Email já cadastrado',
        code: 'AUTH_EMAIL_EXISTS',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      config.auth.bcryptRounds || 12
    );

    // Create operator
    const operator = await prisma.operator.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: role === 'admin' && config.auth.enabled ? 'admin' : 'operator',
      },
    });

    // Generate tokens
    const token = config.auth.enabled ? generateToken(operator) : 'demo-token';
    const refreshToken = config.auth.enabled ? generateRefreshToken(operator) : null;

    if (config.auth.enabled && refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          token: refreshTokenHash,
          operatorId: operator.id,
          expiresAt,
        },
      });
    }

    res.status(201).json({
      success: true,
      user: {
        id: operator.id,
        email: operator.email,
        name: operator.name,
        role: operator.role,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Erro ao registrar operador',
      code: 'AUTH_REGISTER_ERROR',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change operator password
 */
router.post('/change-password', authenticate, validate('changePassword'), async (req, res) => {
  try {
    if (req.isDemo) {
      return res.json({ success: true, message: 'Senha alterada (demo)' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Senha atual e nova senha são obrigatórias',
        code: 'AUTH_MISSING_PASSWORDS',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Nova senha deve ter no mínimo 8 caracteres',
        code: 'AUTH_WEAK_PASSWORD',
      });
    }

    // Get operator with password
    const operator = await prisma.operator.findUnique({
      where: { id: req.user.id },
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, operator.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Senha atual incorreta',
        code: 'AUTH_INVALID_PASSWORD',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.auth.bcryptRounds || 12);

    // Update password
    await prisma.operator.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens (force re-login on other devices)
    await prisma.refreshToken.deleteMany({
      where: { operatorId: req.user.id },
    });

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Erro ao alterar senha',
      code: 'AUTH_CHANGE_PASSWORD_ERROR',
    });
  }
});

module.exports = router;
