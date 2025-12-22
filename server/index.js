const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Import config (must be after dotenv)
const config = require('./config');

// Initialize Sentry (must be early, before other imports that might throw)
const sentry = require('./lib/sentry');

// Validate environment on startup
const { validateEnvOrExit } = require('./lib/validateEnv');
validateEnvOrExit(config.mode);

// Import services
const copilot = require('./services/copilot');
const ai = require('./services/ai');

// Import middleware
const { authenticate, authenticateSocket } = require('./middleware/auth');
const { validate, verifyWebhookSignature } = require('./middleware/validate');
const { requestLogger, errorLogger, notFoundHandler } = require('./middleware/requestLogger');
const { cacheMiddleware, TTL, cache } = require('./lib/cache');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// Initialize Prisma (singleton)
const prisma = require('./lib/prisma');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
  },
});

// Initialize Sentry with Express app
sentry.init(app);

// ================== SENTRY REQUEST HANDLER ==================
// Must be the first middleware
app.use(sentry.requestHandler());

// ================== SECURITY & PERFORMANCE MIDDLEWARE ==================

// Security headers (production only - relaxed in demo)
if (config.mode === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
} else {
  // Minimal security headers for demo
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
}

// Compression for responses > 1kb
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024,
}));

// Request timeout (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      error: 'Tempo limite da requisição excedido',
      code: 'REQUEST_TIMEOUT',
    });
  });
  next();
});

// Apply rate limiting if enabled
if (config.rateLimit.enabled) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { error: config.rateLimit.message, code: 'RATE_LIMITED' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

app.use(cors({ origin: config.cors.origins }));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Request logging (before routes)
app.use(requestLogger);

// Auth routes (no auth middleware needed)
app.use('/api/auth', authRoutes);

// Admin routes (auth required, admin role checked inside)
app.use('/api/admin', adminRoutes);

// Constants
const PORT = process.env.PORT || 3001;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || (config.mode === 'demo' ? 'test_token' : null);
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

// Helper: Send Message to WhatsApp
const sendWhatsAppMessage = async (to, text) => {
  if (!WHATSAPP_TOKEN) {
    console.log('Mock Sending to WhatsApp:', to, text);
    return;
  }
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text },
      },
      {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      }
    );
  } catch (error) {
    console.error(
      'Error sending WhatsApp message:',
      error.response ? error.response.data : error.message
    );
  }
};

// Helper: Get or create conversation
const getOrCreateConversation = async (phoneNumber) => {
  let conversation = await prisma.conversation.findUnique({
    where: { phoneNumber },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { phoneNumber, mode: 'AI', status: 'active' },
    });
  }

  return conversation;
};

// Helper: Check if message is duplicate (by whatsappMsgId)
const isMessageDuplicate = async (whatsappMsgId) => {
  if (!whatsappMsgId) return false;

  const existing = await prisma.message.findFirst({
    where: { whatsappMsgId },
    select: { id: true },
  });

  return !!existing;
};

// Helper: Save message to database
// Returns null if message is a duplicate
const saveMessage = async (phoneNumber, sender, content, whatsappMsgId = null) => {
  // Check for duplicate message
  if (whatsappMsgId && (await isMessageDuplicate(whatsappMsgId))) {
    console.log(`Duplicate message detected: ${whatsappMsgId}`);
    return null;
  }

  // Get customer ID if exists
  const customer = await prisma.customer.findUnique({
    where: { phone: phoneNumber },
  });

  const message = await prisma.message.create({
    data: {
      phoneNumber,
      customerId: customer?.id || null,
      sender,
      content,
      whatsappMsgId,
    },
  });

  // Update conversation last message time
  await prisma.conversation.update({
    where: { phoneNumber },
    data: { lastMessageAt: new Date() },
  });

  return message;
};

// Helper: Get messages for a conversation
const _getConversationMessages = async (phoneNumber, limit = 50) => {
  const messages = await prisma.message.findMany({
    where: { phoneNumber },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return messages.map((m) => ({
    sender: m.sender,
    text: m.content,
    timestamp: m.createdAt.getTime(),
  }));
};

// Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Incoming Webhook from WhatsApp
// Signature verification enabled in production mode
app.post('/webhook', verifyWebhookSignature, async (req, res) => {
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      const message = req.body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const text = message.text ? message.text.body : '[Media/Other]';
      const whatsappMsgId = message.id;

      // Get or create conversation
      const conversation = await getOrCreateConversation(from);

      // Save user message to database (returns null if duplicate)
      const savedMessage = await saveMessage(from, 'user', text, whatsappMsgId);

      // Skip processing if message is duplicate
      if (!savedMessage) {
        console.log(`Skipping duplicate message from ${from}: ${whatsappMsgId}`);
        return res.sendStatus(200);
      }

      const msgObj = { sender: 'user', text, timestamp: Date.now() };

      // Generate copilot suggestions for this message
      const suggestions = await copilot.generateSuggestions(from, text);

      // Notify Operator Dashboard with message and suggestions
      io.emit('new_message', {
        from,
        message: msgObj,
        mode: conversation.mode,
        suggestions,
      });

      // Handle AI mode - automatic response using LLM
      if (conversation.mode === 'AI') {
        // Keywords that trigger handoff to human operator
        const handoffKeywords = ['atendente', 'humano', 'pessoa', 'operador', 'falar com alguem', 'ajuda humana'];
        const needsHandoff = handoffKeywords.some((keyword) =>
          text.toLowerCase().includes(keyword)
        );

        if (needsHandoff) {
          // Transfer to operator mode
          await prisma.conversation.update({
            where: { phoneNumber: from },
            data: { mode: 'OPERATOR' },
          });

          const handoffMsg = 'Vou transferir você para um de nossos atendentes. Um momento, por favor! 🙋';
          await saveMessage(from, 'system', handoffMsg);
          await sendWhatsAppMessage(from, handoffMsg);

          io.emit('new_message', {
            from,
            message: { sender: 'system', text: handoffMsg, timestamp: Date.now() },
            mode: 'OPERATOR',
          });
          io.emit('mode_change', { from, mode: 'OPERATOR' });
        } else {
          // Generate AI response using LLM
          let aiResponse;

          if (ai.isAvailable()) {
            // Use LLM for intelligent response
            aiResponse = await ai.generateCustomerResponse(from, text, suggestions);

            // Fallback if LLM fails
            if (!aiResponse) {
              aiResponse = 'Desculpe, tive um problema técnico. Digite "atendente" para falar com um humano. 🙏';
            }
          } else {
            // Fallback when OpenAI is not configured - rule-based response
            const lowerText = text.toLowerCase();

            if (lowerText.includes('oi') || lowerText.includes('olá') || lowerText.includes('bom dia') || lowerText.includes('boa tarde') || lowerText.includes('boa noite')) {
              aiResponse = `Olá! 👋 Bem-vindo à ebeef! Sou o assistente virtual e estou aqui para ajudar você a encontrar as melhores carnes para seu churrasco. Como posso ajudar?`;
            } else if (lowerText.includes('picanha') || lowerText.includes('carne') || lowerText.includes('corte')) {
              aiResponse = `Temos cortes premium de alta qualidade! 🥩 Nossa Picanha Premium está por R$ 129,90/kg. Quer conhecer mais opções ou já fazer seu pedido?`;
            } else if (lowerText.includes('preço') || lowerText.includes('quanto') || lowerText.includes('valor')) {
              aiResponse = `Nossos preços variam conforme o corte. Picanha R$ 129,90/kg, Maminha R$ 69,90/kg, Filé Mignon R$ 109,90/kg. Qual corte te interessa?`;
            } else if (lowerText.includes('entrega') || lowerText.includes('prazo') || lowerText.includes('frete')) {
              aiResponse = `Fazemos entrega em 24-48 horas dependendo da sua região! 🚚 Me passa seu CEP que verifico a disponibilidade para você.`;
            } else if (lowerText.includes('pedido') || lowerText.includes('comprar') || lowerText.includes('quero')) {
              aiResponse = `Ótimo! Vou te ajudar com seu pedido. 📝 Qual corte e quantidade você gostaria? Posso sugerir nossa Picanha Premium, é a mais pedida!`;
            } else if (lowerText.includes('promoção') || lowerText.includes('desconto') || lowerText.includes('oferta')) {
              aiResponse = `Temos ótimas promoções! 🔥 Novos clientes ganham 10% com o código BEMVINDO. Quer conhecer nossas ofertas da semana?`;
            } else {
              aiResponse = `Entendi! 😊 Estou aqui para ajudar com informações sobre nossos cortes, preços, entregas e pedidos. Como posso te ajudar especificamente? Se preferir, digite "atendente" para falar com um humano.`;
            }
          }

          // Save AI response
          await saveMessage(from, 'ai', aiResponse);

          // Send to WhatsApp
          await sendWhatsAppMessage(from, aiResponse);

          // Notify dashboard
          io.emit('new_message', {
            from,
            message: { sender: 'ai', text: aiResponse, timestamp: Date.now() },
            mode: 'AI',
          });
        }
      } else {
        console.log(`Mensagem de ${from} em modo OPERADOR. Aguardando resposta do operador.`);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ================== API ENDPOINTS ==================
// All endpoints below require authentication (bypassed in demo mode)

// Get all conversations (with messages from database)
// Fixed N+1 query - now uses single query with includes
app.get('/api/conversations', authenticate, async (req, res) => {
  try {
    // Single query with all relations included
    const conversations = await prisma.conversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            sender: true,
            content: true,
            timestamp: true,
          },
        },
      },
    });

    // Get all phone numbers and fetch customers in one query
    const phoneNumbers = conversations.map((c) => c.phoneNumber);
    const customers = await prisma.customer.findMany({
      where: { phone: { in: phoneNumbers } },
      select: {
        phone: true,
        name: true,
        email: true,
        notes: true,
      },
    });

    // Create lookup map for customers
    const customerMap = new Map(customers.map((c) => [c.phone, c]));

    // Build result object
    const result = {};
    for (const conv of conversations) {
      const customer = customerMap.get(conv.phoneNumber);
      result[conv.phoneNumber] = {
        mode: conv.mode,
        status: conv.status,
        messages: conv.messages.map((m) => ({
          sender: m.sender,
          text: m.content,
          timestamp: m.timestamp.getTime(),
        })),
        customer: customer
          ? {
              name: customer.name,
              email: customer.email,
              notes: customer.notes,
            }
          : null,
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Operator send message
app.post('/api/send', authenticate, validate('sendMessage'), async (req, res) => {
  try {
    const { to, text } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { phoneNumber: to },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send to WhatsApp
    await sendWhatsAppMessage(to, text);

    // Save message to database
    await saveMessage(to, 'operator', text);

    const msgObj = { sender: 'operator', text, timestamp: Date.now() };

    // Notify dashboard
    io.emit('new_message', { from: to, message: msgObj, mode: conversation.mode });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Toggle conversation mode (AI/OPERATOR)
app.post('/api/mode', authenticate, validate('changeMode'), async (req, res) => {
  try {
    const { to, mode } = req.body;

    const conversation = await prisma.conversation.update({
      where: { phoneNumber: to },
      data: { mode },
    });

    io.emit('mode_change', { from: to, mode });
    res.json({ success: true, mode: conversation.mode });
  } catch (error) {
    console.error('Error changing mode:', error);
    res.status(500).json({ error: 'Failed to change mode' });
  }
});

// ================== COPILOT API ENDPOINTS ==================

// Get copilot suggestions for a conversation
app.get(
  '/api/copilot/suggestions/:phoneNumber',
  authenticate,
  validate('phoneParam', 'params'),
  async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const { message } = req.query;

      const suggestions = await copilot.generateSuggestions(
        phoneNumber,
        message || ''
      );

      res.json(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  }
);

// Get customer info and context
app.get(
  '/api/copilot/customer/:phoneNumber',
  authenticate,
  validate('phoneParam', 'params'),
  async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const context = await copilot.getCustomerContext(phoneNumber);
      res.json(context);
    } catch (error) {
      console.error('Error getting customer context:', error);
      res.status(500).json({ error: 'Failed to get customer context' });
    }
  }
);

// Update customer notes
app.post(
  '/api/copilot/customer/:phoneNumber/notes',
  authenticate,
  validate('phoneParam', 'params'),
  validate('updateNotes'),
  async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const { notes } = req.body;

      const customer = await copilot.updateCustomerNotes(phoneNumber, notes);
      res.json(customer);
    } catch (error) {
      console.error('Error updating customer notes:', error);
      res.status(500).json({ error: 'Failed to update customer notes' });
    }
  }
);

// Update customer name
app.post(
  '/api/copilot/customer/:phoneNumber/name',
  authenticate,
  validate('phoneParam', 'params'),
  validate('updateName'),
  async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const { name } = req.body;

      const customer = await copilot.updateCustomerName(phoneNumber, name);
      res.json(customer);
    } catch (error) {
      console.error('Error updating customer name:', error);
      res.status(500).json({ error: 'Failed to update customer name' });
    }
  }
);

// Search products
app.get(
  '/api/products/search',
  authenticate,
  validate('productSearch', 'query'),
  async (req, res) => {
    try {
      const { q } = req.query;
      const products = await copilot.searchProducts(q || '');
      res.json(products);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  }
);

// Get all products by category (cached)
app.get('/api/products', authenticate, cacheMiddleware('products', TTL.PRODUCTS), async (req, res) => {
  try {
    const { category } = req.query;
    const products = await copilot.getProductsByCategory(category);
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get active promotions (cached)
app.get('/api/promotions', authenticate, cacheMiddleware('promotions', TTL.PROMOTIONS), async (req, res) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(promotions);
  } catch (error) {
    console.error('Error getting promotions:', error);
    res.status(500).json({ error: 'Failed to get promotions' });
  }
});

// Get purchase history for a customer
app.get('/api/copilot/customer/:phoneNumber/purchases', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { phone: phoneNumber },
      include: {
        purchases: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.json({ purchases: [] });
    }

    res.json({ purchases: customer.purchases });
  } catch (error) {
    console.error('Error getting purchase history:', error);
    res.status(500).json({ error: 'Failed to get purchase history' });
  }
});

// ================== AI ENDPOINTS ==================
// AI-powered features for operators

// Check AI availability
app.get('/api/ai/status', authenticate, (req, res) => {
  res.json({
    available: ai.isAvailable(),
    features: ai.isAvailable()
      ? ['suggestions', 'improve', 'summarize', 'recommendations']
      : [],
  });
});

// Generate AI suggestion for operator response
app.post('/api/ai/suggest', authenticate, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'IA não disponível',
        code: 'AI_UNAVAILABLE',
      });
    }

    // Get customer context
    const customerContext = await copilot.getCustomerContext(phoneNumber);

    // Generate suggestion
    const suggestion = await ai.generateOperatorSuggestion(message, customerContext);

    if (!suggestion) {
      return res.status(500).json({
        error: 'Falha ao gerar sugestão',
        code: 'SUGGESTION_FAILED',
      });
    }

    res.json({ suggestion });
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    res.status(500).json({ error: 'Erro ao gerar sugestão' });
  }
});

// Improve/rephrase operator message
app.post('/api/ai/improve', authenticate, async (req, res) => {
  try {
    const { message, tone = 'friendly' } = req.body;

    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'IA não disponível',
        code: 'AI_UNAVAILABLE',
      });
    }

    const improved = await ai.improveMessage(message, tone);

    res.json({ original: message, improved, tone });
  } catch (error) {
    console.error('Error improving message:', error);
    res.status(500).json({ error: 'Erro ao melhorar mensagem' });
  }
});

// Summarize conversation for handoff
app.get('/api/ai/summarize/:phoneNumber', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'IA não disponível',
        code: 'AI_UNAVAILABLE',
      });
    }

    const summary = await ai.summarizeConversation(phoneNumber);

    if (!summary) {
      return res.status(500).json({
        error: 'Falha ao resumir conversa',
        code: 'SUMMARY_FAILED',
      });
    }

    res.json({ phoneNumber, summary });
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    res.status(500).json({ error: 'Erro ao resumir conversa' });
  }
});

// Get AI product recommendations based on conversation
app.get('/api/ai/recommendations/:phoneNumber', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'IA não disponível',
        code: 'AI_UNAVAILABLE',
      });
    }

    const customerContext = await copilot.getCustomerContext(phoneNumber);
    const recommendations = await ai.generateProductRecommendation(phoneNumber, customerContext);

    if (!recommendations) {
      return res.status(500).json({
        error: 'Falha ao gerar recomendações',
        code: 'RECOMMENDATION_FAILED',
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Erro ao gerar recomendações' });
  }
});

// Classify message intent
app.post('/api/ai/classify', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'IA não disponível',
        code: 'AI_UNAVAILABLE',
      });
    }

    const classification = await ai.classifyIntent(message);

    res.json(classification);
  } catch (error) {
    console.error('Error classifying message:', error);
    res.status(500).json({ error: 'Erro ao classificar mensagem' });
  }
});

// ================== HEALTH CHECK ==================

// Basic health check (fast, for load balancers)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: config.mode,
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check (includes DB and services)
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    mode: config.mode,
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unknown' },
      ai: { status: ai.isAvailable() ? 'ok' : 'disabled' },
      cache: { status: 'ok', size: cache.stats().size },
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = { status: 'ok' };
  } catch (error) {
    health.status = 'degraded';
    health.services.database = {
      status: 'error',
      message: 'Falha na conexão com banco de dados',
    };
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not ready' });
  }
});

// Liveness check (for Kubernetes)
app.get('/live', (req, res) => {
  res.json({ live: true });
});

// Prometheus-style metrics endpoint
app.get('/metrics', async (req, res) => {
  const startTime = Date.now();
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Get connection counts
  let dbPoolStats = { total: 0, idle: 0, waiting: 0 };
  try {
    // Note: Actual pool stats depend on your prisma adapter config
    await prisma.$queryRaw`SELECT 1`;
    dbPoolStats = { status: 'connected' };
  } catch {
    dbPoolStats = { status: 'disconnected' };
  }

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),

    // Memory metrics (in MB)
    memory: {
      rss_mb: Math.round(memUsage.rss / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      external_mb: Math.round(memUsage.external / 1024 / 1024),
    },

    // CPU metrics (in microseconds)
    cpu: {
      user_us: cpuUsage.user,
      system_us: cpuUsage.system,
    },

    // Socket.io connections
    websocket: {
      connected_clients: io.engine.clientsCount || 0,
    },

    // Cache stats
    cache: cache.stats(),

    // Database
    database: dbPoolStats,

    // AI service
    ai: {
      available: ai.isAvailable(),
    },

    // Sentry
    error_tracking: {
      enabled: sentry.isEnabled(),
    },

    // Response time for this endpoint
    response_time_ms: Date.now() - startTime,
  };

  res.json(metrics);
});

// ================== ERROR HANDLING ==================
// Must be after all routes

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error logging middleware
app.use(errorLogger);

// Sentry error handler (must be before other error handlers)
app.use(sentry.errorHandler());

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Capture error to Sentry for 500 errors
  if (statusCode === 500) {
    sentry.captureException(err, {
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      tags: { endpoint: req.path, method: req.method },
      extra: { requestId: req.requestId },
    });
  }

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Erro interno do servidor' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.requestId,
  });
});

// ================== SOCKET.IO EVENTS ==================

// Apply authentication middleware to Socket.io
io.use(authenticateSocket);

io.on('connection', (socket) => {
  const user = socket.user;
  console.log(`Operator connected: ${socket.id} (${user?.name || 'demo'})`);

  // Request copilot suggestions for a specific message
  socket.on('request_suggestions', async ({ phoneNumber, message }) => {
    try {
      const suggestions = await copilot.generateSuggestions(phoneNumber, message);
      socket.emit('suggestions_update', { phoneNumber, suggestions });
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Operator disconnected: ${socket.id} (${user?.name || 'demo'})`);
  });
});

// ================== SERVER STARTUP ==================

const { createLogger } = require('./lib/logger');
const serverLog = createLogger('server');

server.listen(PORT, () => {
  serverLog.info({ port: PORT, mode: config.mode }, `EBEEF Server running on port ${PORT}`);
  serverLog.info(
    { openai: !!process.env.OPENAI_API_KEY },
    `OpenAI integration: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled (rule-based only)'}`
  );
});

// ================== GRACEFUL SHUTDOWN ==================

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    serverLog.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  serverLog.info({ signal }, `Received ${signal}, starting graceful shutdown...`);

  // Set a timeout for force shutdown
  const forceShutdownTimeout = setTimeout(() => {
    serverLog.error('Force shutdown - timeout exceeded');
    process.exit(1);
  }, 30000); // 30 seconds max

  try {
    // 1. Stop accepting new connections
    serverLog.info('Closing HTTP server...');
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    serverLog.info('HTTP server closed');

    // 2. Close Socket.IO connections
    serverLog.info('Closing Socket.IO connections...');
    io.disconnectSockets(true);
    serverLog.info('Socket.IO connections closed');

    // 3. Clear cache
    serverLog.info('Clearing cache...');
    cache.destroy();
    serverLog.info('Cache cleared');

    // 4. Close database connection
    serverLog.info('Closing database connection...');
    await prisma.$disconnect();
    serverLog.info('Database connection closed');

    clearTimeout(forceShutdownTimeout);
    serverLog.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    serverLog.error({ error: error.message }, 'Error during shutdown');
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  serverLog.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  sentry.captureException(error, { tags: { type: 'uncaughtException' } });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  serverLog.error({ reason: String(reason) }, 'Unhandled promise rejection');
  sentry.captureException(reason, { tags: { type: 'unhandledRejection' } });
});
