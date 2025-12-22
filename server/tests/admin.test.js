/**
 * Admin API Tests
 * Tests admin route validation and basic functionality
 */

const request = require('supertest');
const express = require('express');

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  conversation: {
    count: jest.fn().mockResolvedValue(10),
    findMany: jest.fn().mockResolvedValue([]),
  },
  message: {
    count: jest.fn().mockResolvedValue(100),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  operator: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  promotion: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  promotionProduct: {
    deleteMany: jest.fn(),
  },
}));

// Mock config
jest.mock('../config', () => ({
  mode: 'demo',
  auth: { enabled: false },
}));

const prisma = require('../lib/prisma');
const adminRoutes = require('../routes/admin');

// Create test app
const app = express();
app.use(express.json());

// Mock authenticate middleware for testing
app.use((req, res, next) => {
  req.user = { id: 1, role: 'admin' };
  next();
});

app.use('/api/admin', adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ error: err.message });
});

describe('Admin API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/stats', () => {
    it('should return dashboard stats', async () => {
      prisma.conversation.count.mockResolvedValueOnce(10);
      prisma.conversation.count.mockResolvedValueOnce(5);
      prisma.message.count.mockResolvedValueOnce(100);
      prisma.message.count.mockResolvedValueOnce(30);

      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalConversations');
      expect(response.body).toHaveProperty('activeConversations');
      expect(response.body).toHaveProperty('totalMessages');
      expect(response.body).toHaveProperty('aiResponses');
    });
  });

  describe('GET /api/admin/operators', () => {
    it('should return list of operators', async () => {
      const mockOperators = [
        { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', isActive: true },
        { id: 2, name: 'Operador', email: 'op@test.com', role: 'operator', isActive: true },
      ];

      prisma.operator.findMany.mockResolvedValue(mockOperators);

      const response = await request(app).get('/api/admin/operators');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/admin/products', () => {
    it('should return list of products', async () => {
      const mockProducts = [
        { id: 1, name: 'Picanha', sku: 'PIC001', price: 129.9, category: 'CARNES_NOBRES' },
      ];

      prisma.product.findMany.mockResolvedValue(mockProducts);

      const response = await request(app).get('/api/admin/products');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/admin/promotions', () => {
    it('should return list of promotions', async () => {
      const mockPromotions = [
        { id: 1, name: 'Desconto', code: 'DESC10', discountType: 'percentage', products: [] },
      ];

      prisma.promotion.findMany.mockResolvedValue(mockPromotions);

      const response = await request(app).get('/api/admin/promotions');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/admin/products', () => {
    it('should create product with valid data', async () => {
      const mockProduct = {
        id: 1,
        name: 'Picanha',
        sku: 'PIC001',
        price: 129.9,
        category: 'CARNES_NOBRES',
        stock: 50,
      };

      prisma.product.create.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/admin/products')
        .send({
          name: 'Picanha',
          sku: 'PIC001',
          price: 129.9,
          category: 'CARNES_NOBRES',
          stock: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });
});
