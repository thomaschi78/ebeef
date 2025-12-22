/**
 * EBEEF Copilot Service
 * Serviço de sugestões híbrido combinando regras com IA
 */

const prisma = require('../lib/prisma');
const ai = require('./ai');

/**
 * Get customer context by phone number
 * Returns customer info, purchase history, and relevant data for suggestions
 */
async function getCustomerContext(phoneNumber) {
  // Find or create customer
  let customer = await prisma.customer.findUnique({
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
        take: 10, // Last 10 orders
      },
    },
  });

  if (!customer) {
    // Create new customer record
    customer = await prisma.customer.create({
      data: { phone: phoneNumber },
      include: { purchases: true },
    });
  }

  // Calculate customer metrics
  const totalOrders = customer.purchases.length;
  const totalSpent = customer.purchases.reduce(
    (sum, p) => sum + parseFloat(p.totalAmount),
    0
  );

  // Get most purchased products
  const productCounts = {};
  customer.purchases.forEach((purchase) => {
    purchase.items?.forEach((item) => {
      const productId = item.productId;
      if (!productCounts[productId]) {
        productCounts[productId] = {
          count: 0,
          quantity: 0,
          product: item.product,
        };
      }
      productCounts[productId].count++;
      productCounts[productId].quantity += item.quantity;
    });
  });

  const favoriteProducts = Object.values(productCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Get last purchase date
  const lastPurchase = customer.purchases[0];
  const daysSinceLastPurchase = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    customer: {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      email: customer.email,
      birthdate: customer.birthdate,
      notes: customer.notes,
      billingAddress: customer.billingStreet ? {
        street: customer.billingStreet,
        number: customer.billingNumber,
        complement: customer.billingComplement,
        neighborhood: customer.billingNeighborhood,
        city: customer.billingCity,
        state: customer.billingState,
        zipCode: customer.billingZipCode,
      } : null,
      deliveryAddress: customer.deliveryStreet ? {
        street: customer.deliveryStreet,
        number: customer.deliveryNumber,
        complement: customer.deliveryComplement,
        neighborhood: customer.deliveryNeighborhood,
        city: customer.deliveryCity,
        state: customer.deliveryState,
        zipCode: customer.deliveryZipCode,
      } : null,
    },
    isNewCustomer: totalOrders === 0,
    totalOrders,
    totalSpent: totalSpent.toFixed(2),
    favoriteProducts,
    lastPurchase: lastPurchase
      ? {
          orderNumber: lastPurchase.orderNumber,
          date: lastPurchase.createdAt,
          amount: lastPurchase.totalAmount,
          status: lastPurchase.status,
          items: lastPurchase.items?.map(item => ({
            productId: item.productId,
            productName: item.product?.name,
            productSku: item.product?.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })) || [],
        }
      : null,
    daysSinceLastPurchase,
  };
}

/**
 * Get active promotions relevant to a customer
 */
async function getRelevantPromotions(customerContext) {
  const now = new Date();

  // Get all active promotions
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

  // Score promotions by relevance to customer
  const scoredPromotions = promotions.map((promo) => {
    let relevanceScore = 0;

    // New customer discount
    if (promo.code === 'FIRSTORDER' && customerContext.isNewCustomer) {
      relevanceScore += 10;
    }

    // Bulk discount for big spenders
    if (promo.code === 'BULKBUY' && parseFloat(customerContext.totalSpent) > 500) {
      relevanceScore += 8;
    }

    // Product-specific promotions matching favorites
    if (promo.products.length > 0 && customerContext.favoriteProducts.length > 0) {
      const promoProductIds = promo.products.map((pp) => pp.productId);
      const favoriteIds = customerContext.favoriteProducts.map((fp) => fp.product.id);
      const matches = promoProductIds.filter((id) => favoriteIds.includes(id));
      relevanceScore += matches.length * 5;
    }

    return { ...promo, relevanceScore };
  });

  return scoredPromotions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3);
}

/**
 * Get product recommendations based on customer history
 */
async function getProductRecommendations(customerContext) {
  const recommendations = [];

  // If customer has favorites, get related products
  if (customerContext.favoriteProducts.length > 0) {
    const favoriteIds = customerContext.favoriteProducts.map((fp) => fp.product.id);

    // Get related products
    const relations = await prisma.productRelation.findMany({
      where: {
        productFromId: { in: favoriteIds },
      },
      include: {
        productTo: true,
      },
      orderBy: { strength: 'desc' },
      take: 5,
    });

    relations.forEach((rel) => {
      if (!favoriteIds.includes(rel.productToId)) {
        recommendations.push({
          product: rel.productTo,
          reason: `Combina com ${customerContext.favoriteProducts.find(
            (fp) => fp.product.id === rel.productFromId
          )?.product.name}`,
          type: rel.relationType,
        });
      }
    });
  }

  // For new customers, recommend bestsellers
  if (customerContext.isNewCustomer) {
    const popularProducts = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { stock: 'desc' }, // Proxy for popularity
      take: 3,
    });

    popularProducts.forEach((product) => {
      recommendations.push({
        product,
        reason: 'Escolha popular entre nossos clientes',
        type: 'popular',
      });
    });
  }

  // If returning customer hasn't ordered in a while, suggest reorder
  if (
    customerContext.daysSinceLastPurchase &&
    customerContext.daysSinceLastPurchase > 14 &&
    customerContext.favoriteProducts.length > 0
  ) {
    const topFavorite = customerContext.favoriteProducts[0];
    recommendations.unshift({
      product: topFavorite.product,
      reason: `Faz ${customerContext.daysSinceLastPurchase} dias desde seu último pedido`,
      type: 'reorder',
    });
  }

  return recommendations.slice(0, 5);
}

/**
 * Find matching suggestion templates based on message content
 */
async function findMatchingTemplates(messageText) {
  const templates = await prisma.suggestionTemplate.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  const lowerMessage = messageText.toLowerCase();
  const matchedTemplates = [];

  for (const template of templates) {
    const triggers = template.trigger.split('|');
    for (const trigger of triggers) {
      if (lowerMessage.includes(trigger.toLowerCase())) {
        matchedTemplates.push(template);
        break;
      }
    }
  }

  return matchedTemplates.slice(0, 3);
}

/**
 * Fill template placeholders with actual data
 */
function fillTemplate(template, context) {
  let filled = template;

  // Customer placeholders
  filled = filled.replace(/{customer_name}/g, context.customer?.name || 'cliente');
  filled = filled.replace(/{customer_phone}/g, context.customer?.phone || '');

  // Product placeholders
  if (context.favoriteProducts?.length > 0) {
    const pastProducts = context.favoriteProducts
      .slice(0, 3)
      .map((fp) => fp.product.name)
      .join(', ');
    filled = filled.replace(/{past_products}/g, pastProducts);
  }

  if (context.recommendations?.length > 0) {
    filled = filled.replace(/{recommended_product}/g, context.recommendations[0].product.name);
  }

  // Promotion placeholders
  if (context.promotions?.length > 0) {
    const promoList = context.promotions
      .map((p) => `${p.name} (code: ${p.code})`)
      .join('; ');
    filled = filled.replace(/{active_promotions}/g, promoList);
  }

  // Order placeholders
  if (context.lastPurchase) {
    filled = filled.replace(/{order_number}/g, context.lastPurchase.orderNumber);
    filled = filled.replace(/{order_status}/g, context.lastPurchase.status);
  }

  // Date placeholders
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 1);
  filled = filled.replace(
    /{delivery_date}/g,
    deliveryDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  return filled;
}

/**
 * Generate LLM-powered suggestion using AI service
 */
async function generateLLMSuggestion(messageText, context) {
  if (!ai.isAvailable()) {
    return null;
  }

  try {
    return await ai.generateOperatorSuggestion(messageText, context);
  } catch (error) {
    console.error('Erro ao gerar sugestão IA:', error.message);
    return null;
  }
}

/**
 * Main function: Generate copilot suggestions for a message
 */
async function generateSuggestions(phoneNumber, messageText) {
  // Get all context
  const customerContext = await getCustomerContext(phoneNumber);
  const promotions = await getRelevantPromotions(customerContext);
  const recommendations = await getProductRecommendations(customerContext);
  const templates = await findMatchingTemplates(messageText);

  // Build full context
  const fullContext = {
    ...customerContext,
    promotions,
    recommendations,
  };

  // Generate rule-based suggestions from templates
  const ruleSuggestions = templates.map((template) => ({
    type: 'template',
    category: template.category,
    text: fillTemplate(template.template, fullContext),
    priority: template.priority,
  }));

  // Generate LLM suggestion (if available)
  const llmSuggestion = await generateLLMSuggestion(messageText, fullContext);
  if (llmSuggestion) {
    ruleSuggestions.unshift({
      type: 'ai',
      category: 'ai_generated',
      text: llmSuggestion,
      priority: 100,
    });
  }

  // Build quick actions based on context
  const quickActions = [];

  if (customerContext.isNewCustomer) {
    quickActions.push({
      label: 'Oferecer desconto de boas-vindas',
      action: `Bem-vindo à ebeef! Como é sua primeira compra, use o código BEMVINDO para 10% de desconto!`,
    });
  }

  if (recommendations.length > 0) {
    quickActions.push({
      label: `Recomendar ${recommendations[0].product.name}`,
      action: `Baseado nas suas preferências, eu recomendo nosso ${recommendations[0].product.name} - ${recommendations[0].reason}. Está por R$${recommendations[0].product.price}.`,
    });
  }

  if (promotions.length > 0) {
    quickActions.push({
      label: `Compartilhar ${promotions[0].name}`,
      action: `Ótima notícia! ${promotions[0].description} Use o código ${promotions[0].code} no checkout!`,
    });
  }

  return {
    customerInfo: {
      name: customerContext.customer.name,
      phone: customerContext.customer.phone,
      email: customerContext.customer.email,
      birthdate: customerContext.customer.birthdate,
      billingAddress: customerContext.customer.billingAddress,
      deliveryAddress: customerContext.customer.deliveryAddress,
      isNew: customerContext.isNewCustomer,
      totalOrders: customerContext.totalOrders,
      totalSpent: customerContext.totalSpent,
      notes: customerContext.customer.notes,
    },
    lastOrder: customerContext.lastPurchase,
    suggestions: ruleSuggestions.sort((a, b) => b.priority - a.priority).slice(0, 4),
    quickActions: quickActions.slice(0, 4),
    recommendations: recommendations.slice(0, 3).map((r) => ({
      id: r.product.id,
      name: r.product.name,
      price: r.product.price,
      reason: r.reason,
    })),
    promotions: promotions.slice(0, 3).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
    })),
    purchaseHistory: customerContext.favoriteProducts.slice(0, 5).map((fp) => ({
      productId: fp.product.id,
      productName: fp.product.name,
      timesOrdered: fp.count,
      totalQuantity: fp.quantity,
    })),
  };
}

/**
 * Search products by query
 */
async function searchProducts(query) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 10,
  });

  return products;
}

/**
 * Get all active products by category
 */
async function getProductsByCategory(category = null) {
  const where = { isActive: true };
  if (category) {
    where.category = category;
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { category: 'asc' },
  });

  // Group by category
  const grouped = {};
  products.forEach((product) => {
    if (!grouped[product.category]) {
      grouped[product.category] = [];
    }
    grouped[product.category].push(product);
  });

  return grouped;
}

/**
 * Update customer notes (operator annotations)
 */
async function updateCustomerNotes(phoneNumber, notes) {
  const customer = await prisma.customer.upsert({
    where: { phone: phoneNumber },
    update: { notes },
    create: { phone: phoneNumber, notes },
  });

  return customer;
}

/**
 * Update customer name
 */
async function updateCustomerName(phoneNumber, name) {
  const customer = await prisma.customer.upsert({
    where: { phone: phoneNumber },
    update: { name },
    create: { phone: phoneNumber, name },
  });

  return customer;
}

module.exports = {
  generateSuggestions,
  getCustomerContext,
  getRelevantPromotions,
  getProductRecommendations,
  searchProducts,
  getProductsByCategory,
  updateCustomerNotes,
  updateCustomerName,
};
