/**
 * Input Validation Middleware
 * Uses Joi for schema validation
 */

const Joi = require('joi');

// ================== SCHEMAS ==================

// Brazilian phone number: country code (55) + DDD (2 digits) + number (8-9 digits)
const phoneSchema = Joi.string()
  .pattern(/^55\d{10,11}$/)
  .messages({
    'string.pattern.base': 'Telefone deve estar no formato brasileiro: 55 + DDD + número (ex: 5511999991234)',
  });

// Message text - prevent XSS and limit length
const messageTextSchema = Joi.string()
  .min(1)
  .max(4096)
  .trim()
  .messages({
    'string.min': 'Mensagem não pode estar vazia',
    'string.max': 'Mensagem muito longa (máximo 4096 caracteres)',
  });

// Conversation mode
const modeSchema = Joi.string()
  .valid('AI', 'OPERATOR')
  .messages({
    'any.only': 'Modo deve ser AI ou OPERATOR',
  });

// Customer notes
const notesSchema = Joi.string()
  .max(10000)
  .allow('')
  .trim()
  .messages({
    'string.max': 'Anotações muito longas (máximo 10000 caracteres)',
  });

// Customer name
const nameSchema = Joi.string()
  .min(1)
  .max(200)
  .trim()
  .messages({
    'string.min': 'Nome não pode estar vazio',
    'string.max': 'Nome muito longo (máximo 200 caracteres)',
  });

// Email
const emailSchema = Joi.string()
  .email()
  .max(255)
  .lowercase()
  .messages({
    'string.email': 'Email inválido',
    'string.max': 'Email muito longo',
  });

// Password
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .messages({
    'string.min': 'Senha deve ter no mínimo 8 caracteres',
    'string.max': 'Senha muito longa',
  });

// Product search query
const searchQuerySchema = Joi.string()
  .max(200)
  .trim()
  .allow('')
  .messages({
    'string.max': 'Busca muito longa (máximo 200 caracteres)',
  });

// ================== REQUEST SCHEMAS ==================

const schemas = {
  // POST /api/send
  sendMessage: Joi.object({
    to: phoneSchema.required(),
    text: messageTextSchema.required(),
  }),

  // POST /api/mode
  changeMode: Joi.object({
    to: phoneSchema.required(),
    mode: modeSchema.required(),
  }),

  // POST /api/copilot/customer/:phoneNumber/notes
  updateNotes: Joi.object({
    notes: notesSchema.required(),
  }),

  // POST /api/copilot/customer/:phoneNumber/name
  updateName: Joi.object({
    name: nameSchema.required(),
  }),

  // Auth - POST /api/auth/login
  login: Joi.object({
    email: emailSchema.allow('').required(),
    password: Joi.string().allow('').required(),
  }),

  // Auth - POST /api/auth/register
  register: Joi.object({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    name: nameSchema.required(),
    role: Joi.string().valid('operator', 'admin', 'supervisor').optional(),
  }),

  // Auth - POST /api/auth/change-password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordSchema.required(),
  }),

  // Auth - POST /api/auth/refresh
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  // URL params - phone number
  phoneParam: Joi.object({
    phoneNumber: phoneSchema.required(),
  }),

  // Query params - product search
  productSearch: Joi.object({
    q: searchQuerySchema.optional(),
  }),

  // Query params - copilot suggestions
  copilotSuggestions: Joi.object({
    message: messageTextSchema.optional().allow(''),
  }),
};

// ================== MIDDLEWARE FACTORY ==================

/**
 * Create validation middleware for a schema
 * @param {string} schemaName - Name of schema in schemas object
 * @param {string} source - 'body', 'params', or 'query'
 */
function validate(schemaName, source = 'body') {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Schema '${schemaName}' not found`);
  }

  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: messages,
      });
    }

    // Replace with sanitized values
    req[source] = value;
    next();
  };
}

/**
 * Sanitize HTML/XSS from string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Verify WhatsApp webhook signature
 */
function verifyWebhookSignature(req, res, next) {
  const config = require('../config');

  // Skip in demo mode
  if (config.mode === 'demo' || !config.whatsapp?.verifySignature) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('Webhook request missing X-Hub-Signature-256 header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('WHATSAPP_APP_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const crypto = require('crypto');
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

module.exports = {
  validate,
  schemas,
  sanitizeString,
  verifyWebhookSignature,
};
