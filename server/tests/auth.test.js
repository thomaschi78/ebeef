/**
 * Authentication Tests
 * Tests auth validation and basic functionality
 */

const request = require('supertest');
const express = require('express');

// Mock config to enable authentication (not demo mode)
jest.mock('../config', () => ({
  mode: 'test',
  auth: {
    enabled: true,
    jwtSecret: 'test-secret-key-for-testing-minimum-32-chars',
    jwtExpiresIn: '8h',
    bcryptRounds: 10,
  },
}));

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  operator: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const _prisma = require('../lib/prisma');

// Create test app with auth routes
const authRoutes = require('../routes/auth');
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ error: err.message });
});

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for weak password (too short)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'validpassword123',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'validpassword123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Input validation', () => {
    it('should validate email format correctly', async () => {
      const invalidEmails = ['test', 'test@', '@test.com', 'test@.com'];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'password123' });

        expect(response.status).toBe(400);
      }
    });

    it('should require password minimum length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'valid@email.com',
          password: 'short',
          name: 'Test',
        });

      expect(response.status).toBe(400);
    });
  });
});
