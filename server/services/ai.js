/**
 * EBEEF AI Service
 * Serviço de IA para atendimento ao cliente via WhatsApp
 * Todas as interações são em Português Brasileiro
 */

const OpenAI = require('openai');
const { createLogger } = require('../lib/logger');
const prisma = require('../lib/prisma');

const log = createLogger('ai');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  log.info('Cliente OpenAI inicializado');
} else {
  log.warn('OPENAI_API_KEY não configurada - funcionalidades de IA desabilitadas');
}

/**
 * Verifica se a IA está disponível
 */
function isAvailable() {
  return !!openai;
}

/**
 * Contexto da empresa para todas as interações de IA
 */
const COMPANY_CONTEXT = `
Você é o assistente virtual da ebeef, uma empresa de carnes nobres e churrasco brasileiro premium.

SOBRE A EMPRESA:
- Nome: ebeef
- Especialidade: Carnes nobres, cortes premium para churrasco, e acessórios
- Localização: Brasil
- Diferencial: Qualidade premium, entrega rápida, atendimento personalizado

PRODUTOS PRINCIPAIS:
- Picanha Premium - A rainha do churrasco (R$ 129,90/kg)
- Costela Gaúcha - Para assar na brasa por 6 horas (R$ 149,90/5kg)
- Maminha - Corte suculento e saboroso (R$ 69,90/kg)
- Cupim - Típico brasileiro, macio e suculento (R$ 89,90/2kg)
- Filé Mignon - Corte nobre e macio (R$ 109,90/kg)
- Contra Filé - Macio com gordura entremeada (R$ 79,90/kg)
- Carne Moída de Primeira - Ideal para hambúrgueres (R$ 24,90/500g)
- Sal Grosso para Churrasco (R$ 9,90/kg)
- Chimichurri Artesanal (R$ 19,90/300ml)

POLÍTICAS:
- Entrega: 24-48 horas dependendo da região
- Pagamento: PIX, cartão de crédito, boleto
- Devoluções: Garantia de satisfação ou troca
- Horário de atendimento: Segunda a Sábado, 8h às 20h

TOM DE COMUNICAÇÃO:
- Amigável e profissional
- Use linguagem informal mas educada (você, não senhor/senhora)
- Demonstre conhecimento sobre churrasco brasileiro
- Seja proativo em sugerir produtos
- Use emojis com moderação (🥩, 🔥, 😊)
- SEMPRE responda em Português Brasileiro
`.trim();

/**
 * Get conversation history for context
 */
async function getConversationHistory(phoneNumber, limit = 10) {
  const messages = await prisma.message.findMany({
    where: { phoneNumber },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      sender: true,
      content: true,
      timestamp: true,
    },
  });

  return messages.reverse().map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
}

/**
 * Classify intent of a customer message
 * @param {string} message - The customer message
 * @returns {Object} - Intent classification with confidence
 */
async function classifyIntent(message) {
  if (!openai) {
    return { intent: 'unknown', confidence: 0, subIntent: null };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um classificador de intenções para um e-commerce de carnes.
Classifique a mensagem do cliente em uma das seguintes categorias:

INTENÇÕES PRINCIPAIS:
- greeting: Saudação (oi, olá, bom dia)
- product_inquiry: Pergunta sobre produtos (preço, disponibilidade, cortes)
- order_status: Status do pedido (onde está, quando chega)
- complaint: Reclamação (problema, insatisfação)
- support: Pedido de ajuda geral
- purchase_intent: Intenção de compra (quero comprar, fazer pedido)
- recommendation: Pedindo recomendação (o que você sugere)
- promotion: Pergunta sobre promoções/descontos
- delivery: Pergunta sobre entrega (prazo, frete, região)
- payment: Pergunta sobre pagamento (formas, parcelamento)
- goodbye: Despedida (tchau, obrigado)
- other: Outros assuntos

Responda APENAS em JSON no formato:
{"intent": "categoria", "confidence": 0.0-1.0, "subIntent": "detalhamento opcional"}`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 100,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    log.debug({ message, result }, 'Intent classified');
    return result;
  } catch (error) {
    log.error({ error: error.message }, 'Intent classification failed');
    return { intent: 'unknown', confidence: 0, subIntent: null };
  }
}


/**
 * Generate AI response for customer in AI mode
 * @param {string} phoneNumber - Customer phone
 * @param {string} message - Customer message
 * @param {Object} customerContext - Customer data and history
 * @returns {string} - AI generated response
 */
async function generateCustomerResponse(phoneNumber, message, customerContext) {
  if (!openai) {
    return null;
  }

  try {
    // Get conversation history
    const history = await getConversationHistory(phoneNumber);

    // Build customer info string
    const customerInfo = customerContext
      ? `
INFORMAÇÕES DO CLIENTE:
- Nome: ${customerContext.customer?.name || 'Não informado'}
- Tipo: ${customerContext.isNewCustomer ? 'Novo cliente' : 'Cliente recorrente'}
- Total de pedidos: ${customerContext.totalOrders || 0}
- Total gasto: R$ ${customerContext.totalSpent || '0.00'}
${customerContext.favoriteProducts?.length > 0 ? `- Produtos favoritos: ${customerContext.favoriteProducts.map((fp) => fp.product.name).join(', ')}` : ''}
${customerContext.lastPurchase ? `- Último pedido: ${customerContext.lastPurchase.orderNumber} (${customerContext.lastPurchase.status})` : ''}
${customerContext.daysSinceLastPurchase ? `- Dias desde último pedido: ${customerContext.daysSinceLastPurchase}` : ''}
`
      : '';

    // Build promotions info
    const promotionsInfo = customerContext?.promotions?.length > 0
      ? `
PROMOÇÕES ATIVAS:
${customerContext.promotions.map((p) => `- ${p.name}: ${p.description} (código: ${p.code})`).join('\n')}
`
      : '';

    const systemPrompt = `${COMPANY_CONTEXT}

${customerInfo}
${promotionsInfo}

INSTRUÇÕES:
1. Responda de forma natural e amigável em português brasileiro
2. Seja útil e proativo em oferecer soluções
3. Se não souber algo específico, diga que vai verificar ou transfira para um atendente
4. Para reclamações ou problemas complexos, sugira transferir para um atendente humano digitando "ATENDENTE"
5. Mantenha respostas concisas (máximo 2-3 parágrafos)
6. Sempre que apropriado, sugira produtos ou promoções relevantes
7. Use emojis com moderação para criar uma experiência agradável`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6), // Last 6 messages for context
      { role: 'user', content: message },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    log.info({ phoneNumber, messageLength: message.length, responseLength: aiResponse.length }, 'AI response generated');
    return aiResponse;
  } catch (error) {
    log.error({ error: error.message, phoneNumber }, 'AI response generation failed');
    return null;
  }
}

/**
 * Generate suggestion for operator based on customer message
 * @param {string} message - Customer message
 * @param {Object} customerContext - Customer data
 * @returns {string} - Suggested response for operator
 */
async function generateOperatorSuggestion(message, customerContext) {
  if (!openai) {
    return null;
  }

  try {
    const customerInfo = customerContext
      ? `
Cliente: ${customerContext.customer?.name || 'Não identificado'}
Tipo: ${customerContext.isNewCustomer ? 'Novo' : 'Recorrente'} (${customerContext.totalOrders} pedidos)
${customerContext.favoriteProducts?.length > 0 ? `Favoritos: ${customerContext.favoriteProducts.map((fp) => fp.product.name).join(', ')}` : ''}
`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente que ajuda operadores de atendimento da ebeef.
Gere uma sugestão de resposta profissional e personalizada.

${COMPANY_CONTEXT}

${customerInfo}

INSTRUÇÕES:
- Gere uma resposta pronta para o operador usar ou adaptar
- Seja profissional mas amigável
- Personalize com base no contexto do cliente
- Mantenha a resposta concisa (2-3 frases)`,
        },
        {
          role: 'user',
          content: `Mensagem do cliente: "${message}"`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    log.error({ error: error.message }, 'Operator suggestion generation failed');
    return null;
  }
}

/**
 * Improve/rephrase operator message before sending
 * @param {string} message - Original operator message
 * @param {string} tone - Desired tone (formal, friendly, apologetic)
 * @returns {string} - Improved message
 */
async function improveMessage(message, tone = 'friendly') {
  if (!openai) {
    return message;
  }

  try {
    const toneInstructions = {
      formal: 'Use linguagem formal e profissional',
      friendly: 'Use linguagem amigável e acolhedora, com emojis moderados',
      apologetic: 'Use tom de desculpas sinceras e comprometimento em resolver',
      enthusiastic: 'Use tom entusiasmado e positivo, com emojis',
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você melhora mensagens de atendimento ao cliente.
${toneInstructions[tone] || toneInstructions.friendly}
Mantenha o significado original mas melhore a clareza e o tom.
Responda APENAS com a mensagem melhorada, sem explicações.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    return response.choices[0].message.content;
  } catch (error) {
    log.error({ error: error.message }, 'Message improvement failed');
    return message;
  }
}

/**
 * Generate product recommendation based on conversation
 * @param {string} phoneNumber - Customer phone
 * @param {Object} customerContext - Customer data
 * @returns {Object} - Product recommendations with reasoning
 */
async function generateProductRecommendation(phoneNumber, customerContext) {
  if (!openai) {
    return null;
  }

  try {
    // Get recent conversation
    const history = await getConversationHistory(phoneNumber, 5);
    const conversationText = history.map((m) => `${m.role}: ${m.content}`).join('\n');

    // Get all products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, description: true, price: true, category: true },
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em carnes e churrasco brasileiro.
Analise a conversa e o perfil do cliente para recomendar produtos.

PRODUTOS DISPONÍVEIS:
${products.map((p) => `- ${p.name} (${p.category}): ${p.description} - R$ ${p.price}`).join('\n')}

PERFIL DO CLIENTE:
${customerContext?.favoriteProducts?.length > 0 ? `Favoritos: ${customerContext.favoriteProducts.map((fp) => fp.product.name).join(', ')}` : 'Sem histórico'}
Tipo: ${customerContext?.isNewCustomer ? 'Novo cliente' : 'Cliente recorrente'}

Responda em JSON:
{
  "recommendations": [
    {"productName": "nome", "reason": "motivo da recomendação", "priority": 1-3}
  ],
  "conversationalSuggestion": "frase natural para sugerir ao cliente"
}`,
        },
        {
          role: 'user',
          content: `Conversa recente:\n${conversationText}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    log.error({ error: error.message }, 'Product recommendation failed');
    return null;
  }
}

/**
 * Summarize a conversation for handoff or notes
 * @param {string} phoneNumber - Customer phone
 * @returns {string} - Conversation summary
 */
async function summarizeConversation(phoneNumber) {
  if (!openai) {
    return null;
  }

  try {
    const history = await getConversationHistory(phoneNumber, 20);
    const conversationText = history.map((m) => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Resuma a conversa de atendimento de forma concisa.
Inclua:
- Motivo principal do contato
- Problemas ou solicitações mencionados
- Status atual (resolvido, pendente, etc.)
- Ações necessárias

Formato: Resumo em 3-5 bullet points em português.`,
        },
        {
          role: 'user',
          content: conversationText,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  } catch (error) {
    log.error({ error: error.message }, 'Conversation summary failed');
    return null;
  }
}

/**
 * Extract order or product info from message
 * @param {string} message - Customer message
 * @returns {Object} - Extracted entities
 */
async function extractEntities(message) {
  if (!openai) {
    return { products: [], orderNumber: null, quantity: null };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extraia entidades da mensagem do cliente.

PRODUTOS CONHECIDOS: picanha, maminha, cupim, costela, filé mignon, contra filé, alcatra, fraldinha, coxão, acém, carne moída, sal grosso, chimichurri

Responda em JSON:
{
  "products": ["produtos mencionados"],
  "orderNumber": "número do pedido se mencionado",
  "quantity": "quantidade se mencionada",
  "deliveryDate": "data de entrega se mencionada",
  "phone": "telefone se mencionado",
  "address": "endereço se mencionado"
}`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    log.error({ error: error.message }, 'Entity extraction failed');
    return { products: [], orderNumber: null, quantity: null };
  }
}

module.exports = {
  isAvailable,
  classifyIntent,
  generateCustomerResponse,
  generateOperatorSuggestion,
  improveMessage,
  generateProductRecommendation,
  summarizeConversation,
  extractEntities,
};
