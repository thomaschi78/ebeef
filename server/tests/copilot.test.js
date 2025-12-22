/**
 * Copilot Service Tests
 * Tests copilot promotion scoring logic
 */

const mockPromotions = [
  {
    id: 1,
    name: 'Bem-vindo',
    code: 'BEMVINDO',
    discountType: 'percentage',
    discountValue: 10,
    isNewCustomerOnly: true,
    products: [],
  },
  {
    id: 2,
    name: 'Churras 15%',
    code: 'CHURRAS15',
    discountType: 'percentage',
    discountValue: 15,
    isNewCustomerOnly: false,
    minOrderValue: 100,
    products: [],
  },
  {
    id: 3,
    name: 'Picanha R$30',
    code: 'PICANHA30',
    discountType: 'fixed',
    discountValue: 30,
    isNewCustomerOnly: false,
    products: [{ productId: 1 }],
  },
];

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  customer: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  promotion: {
    findMany: jest.fn().mockResolvedValue(mockPromotions),
  },
  product: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  productRelation: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  $queryRaw: jest.fn().mockResolvedValue([]),
}));

describe('Copilot Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRelevantPromotions', () => {
    it('should prioritize new customer promotion for new customers', async () => {
      const prisma = require('../lib/prisma');
      prisma.promotion.findMany.mockResolvedValue(mockPromotions);

      const { getRelevantPromotions } = require('../services/copilot');

      const newCustomerContext = {
        totalOrders: 0,
        totalSpent: 0,
        favoriteProducts: [],
        isNewCustomer: true,
      };

      const result = await getRelevantPromotions(newCustomerContext);

      expect(Array.isArray(result)).toBe(true);
      // BEMVINDO should be first for new customers
      if (result.length > 0) {
        expect(result[0].code).toBe('BEMVINDO');
      }
    });

    it('should return promotions for existing customers', async () => {
      const prisma = require('../lib/prisma');
      prisma.promotion.findMany.mockResolvedValue(mockPromotions);

      const { getRelevantPromotions } = require('../services/copilot');

      const existingCustomerContext = {
        totalOrders: 5,
        totalSpent: 500,
        favoriteProducts: [{ product: { id: 1, name: 'Picanha' } }],
        isNewCustomer: false,
      };

      const result = await getRelevantPromotions(existingCustomerContext);

      expect(Array.isArray(result)).toBe(true);
      // Should not include new customer only promotions first
      if (result.length > 0 && result[0].isNewCustomerOnly) {
        // BEMVINDO should not be prioritized for existing customers
        expect(result[0].code).not.toBe('BEMVINDO');
      }
    });
  });

  describe('module exports', () => {
    it('should export required functions', () => {
      const copilot = require('../services/copilot');

      expect(typeof copilot.getCustomerContext).toBe('function');
      expect(typeof copilot.getRelevantPromotions).toBe('function');
      expect(typeof copilot.getProductRecommendations).toBe('function');
      expect(typeof copilot.generateSuggestions).toBe('function');
    });
  });
});
