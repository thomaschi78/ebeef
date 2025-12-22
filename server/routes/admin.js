/**
 * Admin Routes
 * Handles admin-only operations for managing operators, products, promotions, and analytics
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const ai = require('../services/ai');

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// Check admin role (bypass in demo mode)
router.use((req, res, next) => {
  if (!config.auth.enabled) {
    return next(); // Demo mode - allow all
  }
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Requer permissão de administrador.',
      code: 'ADMIN_REQUIRED',
    });
  }
  next();
});

// ================== STATS/DASHBOARD ==================

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalConversations,
      activeConversations,
      totalMessages,
      aiMessages,
    ] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'active' } }),
      prisma.message.count(),
      prisma.message.count({ where: { sender: 'ai' } }),
    ]);

    res.json({
      totalConversations,
      activeConversations,
      totalMessages,
      aiResponses: aiMessages,
      aiAvailable: ai.isAvailable(),
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

// ================== OPERATORS ==================

/**
 * GET /api/admin/operators
 * List all operators
 */
router.get('/operators', async (req, res) => {
  try {
    const operators = await prisma.operator.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(operators);
  } catch (error) {
    console.error('Error listing operators:', error);
    res.status(500).json({ error: 'Erro ao listar operadores' });
  }
});

/**
 * PUT /api/admin/operators/:id
 * Update an operator
 */
router.put('/operators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const updateData = {
      name,
      email: email?.toLowerCase(),
      role,
    };

    // Only update password if provided
    if (password && password.length >= 8) {
      updateData.password = await bcrypt.hash(password, config.auth.bcryptRounds || 12);
    }

    const operator = await prisma.operator.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    res.json(operator);
  } catch (error) {
    console.error('Error updating operator:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    res.status(500).json({ error: 'Erro ao atualizar operador' });
  }
});

/**
 * PATCH /api/admin/operators/:id/status
 * Toggle operator active status
 */
router.patch('/operators/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const operator = await prisma.operator.update({
      where: { id: parseInt(id, 10) },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    res.json(operator);
  } catch (error) {
    console.error('Error updating operator status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// ================== PRODUCTS ==================

/**
 * GET /api/admin/products
 * List all products
 */
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

/**
 * POST /api/admin/products
 * Create a new product
 */
router.post('/products', async (req, res) => {
  try {
    const { sku, name, description, price, category, subcategory, stock, isActive } = req.body;

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        price,
        category,
        subcategory,
        stock: stock || 0,
        isActive: isActive !== false,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update a product
 */
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, name, description, price, category, subcategory, stock, isActive } = req.body;

    const product = await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: {
        sku,
        name,
        description,
        price,
        category,
        subcategory,
        stock,
        isActive,
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'SKU já existe' });
    }
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete a product
 */
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id: parseInt(id, 10) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Não é possível excluir produto com histórico de compras',
      });
    }
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// ================== PROMOTIONS ==================

/**
 * GET /api/admin/promotions
 * List all promotions
 */
router.get('/promotions', async (req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    res.json(promotions);
  } catch (error) {
    console.error('Error listing promotions:', error);
    res.status(500).json({ error: 'Erro ao listar promoções' });
  }
});

/**
 * POST /api/admin/promotions
 * Create a new promotion
 */
router.post('/promotions', async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    } = req.body;

    const promotion = await prisma.promotion.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit,
        isActive: isActive !== false,
      },
    });

    res.status(201).json(promotion);
  } catch (error) {
    console.error('Error creating promotion:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Código de promoção já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar promoção' });
  }
});

/**
 * PUT /api/admin/promotions/:id
 * Update a promotion
 */
router.put('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    } = req.body;

    const promotion = await prisma.promotion.update({
      where: { id: parseInt(id, 10) },
      data: {
        code: code.toUpperCase(),
        name,
        description,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit,
        isActive,
      },
    });

    res.json(promotion);
  } catch (error) {
    console.error('Error updating promotion:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Código de promoção já existe' });
    }
    res.status(500).json({ error: 'Erro ao atualizar promoção' });
  }
});

/**
 * DELETE /api/admin/promotions/:id
 * Delete a promotion
 */
router.delete('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related promotion products first
    await prisma.promotionProduct.deleteMany({
      where: { promotionId: parseInt(id, 10) },
    });

    await prisma.promotion.delete({
      where: { id: parseInt(id, 10) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ error: 'Erro ao excluir promoção' });
  }
});

// ================== ANALYTICS ==================

/**
 * GET /api/admin/analytics
 * Get analytics data
 */
router.get('/analytics', async (req, res) => {
  try {
    const { range = 'week' } = req.query;

    // Calculate date range
    let _dateFrom;
    const now = new Date();

    switch (range) {
      case 'today':
        _dateFrom = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        _dateFrom = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        _dateFrom = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        _dateFrom = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        // All time - no date filter
    }

    // Get date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all analytics data in parallel
    const [
      // Conversations
      totalConversations,
      activeConversations,
      resolvedConversations,
      aiModeConversations,
      operatorModeConversations,
      // Messages
      totalMessages,
      userMessages,
      aiMessages,
      operatorMessages,
      systemMessages,
      todayMessages,
      weekMessages,
      monthMessages,
      // Customers
      totalCustomers,
      customersWithPurchases,
      newCustomersThisMonth,
      // Products
      totalProducts,
      activeProducts,
      lowStockProducts,
    ] = await Promise.all([
      // Conversations
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'active' } }),
      prisma.conversation.count({ where: { status: 'resolved' } }),
      prisma.conversation.count({ where: { mode: 'AI' } }),
      prisma.conversation.count({ where: { mode: 'OPERATOR' } }),
      // Messages
      prisma.message.count(),
      prisma.message.count({ where: { sender: 'user' } }),
      prisma.message.count({ where: { sender: 'ai' } }),
      prisma.message.count({ where: { sender: 'operator' } }),
      prisma.message.count({ where: { sender: 'system' } }),
      prisma.message.count({ where: { createdAt: { gte: today } } }),
      prisma.message.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.message.count({ where: { createdAt: { gte: monthAgo } } }),
      // Customers
      prisma.customer.count(),
      prisma.customer.count({
        where: { purchases: { some: {} } },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: monthAgo } },
      }),
      // Products
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { stock: { lt: 10 } } }),
    ]);

    res.json({
      conversations: {
        total: totalConversations,
        byStatus: {
          active: activeConversations,
          resolved: resolvedConversations,
        },
        byMode: {
          AI: aiModeConversations,
          OPERATOR: operatorModeConversations,
        },
      },
      messages: {
        total: totalMessages,
        bySender: {
          user: userMessages,
          ai: aiMessages,
          operator: operatorMessages,
          system: systemMessages,
        },
        today: todayMessages,
        thisWeek: weekMessages,
        thisMonth: monthMessages,
      },
      customers: {
        total: totalCustomers,
        withPurchases: customersWithPurchases,
        newThisMonth: newCustomersThisMonth,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
      },
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Erro ao carregar analytics' });
  }
});

module.exports = router;
