require('dotenv').config();
const prisma = require('../lib/prisma');

async function main() {
  console.log('Populando banco de dados...');

  // Limpar dados existentes
  await prisma.promotionProduct.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.productRelation.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.suggestionTemplate.deleteMany();

  // Criar Produtos - Cortes tradicionais do churrasco brasileiro
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'BEEF-PIC-001',
        name: 'Picanha Premium',
        description: 'A rainha do churrasco brasileiro, 1.2kg, com capa de gordura perfeita',
        price: 129.90,
        category: 'Churrasco',
        subcategory: 'Picanha',
        stock: 50,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-FIL-001',
        name: 'Filé Mignon',
        description: 'Corte nobre e macio, 1kg, ideal para medalhões',
        price: 109.90,
        category: 'Cortes Nobres',
        subcategory: 'Filé',
        stock: 35,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-MAM-001',
        name: 'Maminha',
        description: 'Corte suculento e saboroso, 1kg, perfeita para grelhar',
        price: 69.90,
        category: 'Churrasco',
        subcategory: 'Maminha',
        stock: 60,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-FRA-001',
        name: 'Fraldinha',
        description: 'Corte versátil e saboroso, 1kg, ótima para churrasco ou panela',
        price: 59.90,
        category: 'Churrasco',
        subcategory: 'Fraldinha',
        stock: 70,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-ALC-001',
        name: 'Alcatra Completa',
        description: 'Peça inteira com picanha, maminha e coxão duro, 4kg',
        price: 199.90,
        category: 'Churrasco',
        subcategory: 'Alcatra',
        stock: 25,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-COS-001',
        name: 'Costela Gaúcha',
        description: 'Costela bovina completa, 5kg, para assar na brasa por 6 horas',
        price: 149.90,
        category: 'Churrasco',
        subcategory: 'Costela',
        stock: 20,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-CFI-001',
        name: 'Contra Filé',
        description: 'Corte macio com gordura entremeada, 1kg',
        price: 79.90,
        category: 'Cortes Nobres',
        subcategory: 'Contra Filé',
        stock: 45,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-CUP-001',
        name: 'Cupim',
        description: 'Corte típico brasileiro, 2kg, macio e suculento quando bem preparado',
        price: 89.90,
        category: 'Churrasco',
        subcategory: 'Cupim',
        stock: 30,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-COX-001',
        name: 'Coxão Mole',
        description: 'Ideal para bifes e escalopes, 1kg, corte magro',
        price: 54.90,
        category: 'Cortes do Dia a Dia',
        subcategory: 'Coxão',
        stock: 60,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-ACE-001',
        name: 'Acém',
        description: 'Perfeito para carne de panela e cozidos, 1kg',
        price: 39.90,
        category: 'Cortes do Dia a Dia',
        subcategory: 'Acém',
        stock: 80,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'BEEF-MOI-001',
        name: 'Carne Moída de Primeira',
        description: 'Moída de patinho, 500g, ideal para hambúrgueres artesanais',
        price: 24.90,
        category: 'Moídos',
        subcategory: 'Primeira',
        stock: 100,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ACC-SAL-001',
        name: 'Sal Grosso para Churrasco',
        description: 'Sal grosso especial, 1kg, o segredo do churrasqueiro',
        price: 9.90,
        category: 'Acessórios',
        subcategory: 'Temperos',
        stock: 200,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: 'ACC-CHI-001',
        name: 'Chimichurri Artesanal',
        description: 'Molho argentino tradicional, 300ml, complemento perfeito',
        price: 19.90,
        category: 'Acessórios',
        subcategory: 'Molhos',
        stock: 150,
        isActive: true,
      },
    }),
  ]);

  console.log(`Criados ${products.length} produtos`);

  // Criar relações de produtos (frequentemente comprados juntos, complementos)
  const productMap = {};
  products.forEach(p => { productMap[p.sku] = p; });

  await Promise.all([
    // Picanha combina com sal grosso
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-PIC-001'].id,
        productToId: productMap['ACC-SAL-001'].id,
        relationType: 'complemento',
        strength: 5,
      },
    }),
    // Picanha combina com chimichurri
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-PIC-001'].id,
        productToId: productMap['ACC-CHI-001'].id,
        relationType: 'complemento',
        strength: 4,
      },
    }),
    // Maminha relacionada com fraldinha (mesmo estilo de preparo)
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-MAM-001'].id,
        productToId: productMap['BEEF-FRA-001'].id,
        relationType: 'relacionado',
        strength: 5,
      },
    }),
    // Costela gaúcha com cupim (combo churrasco longo)
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-COS-001'].id,
        productToId: productMap['BEEF-CUP-001'].id,
        relationType: 'relacionado',
        strength: 5,
      },
    }),
    // Alcatra completa relacionada com picanha
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-ALC-001'].id,
        productToId: productMap['BEEF-PIC-001'].id,
        relationType: 'relacionado',
        strength: 4,
      },
    }),
    // Caminho de upgrade: Maminha -> Picanha
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-MAM-001'].id,
        productToId: productMap['BEEF-PIC-001'].id,
        relationType: 'upgrade',
        strength: 4,
      },
    }),
    // Caminho de upgrade: Contra Filé -> Filé Mignon
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-CFI-001'].id,
        productToId: productMap['BEEF-FIL-001'].id,
        relationType: 'upgrade',
        strength: 3,
      },
    }),
    // Coxão Mole relacionado com Acém (cortes do dia a dia)
    prisma.productRelation.create({
      data: {
        productFromId: productMap['BEEF-COX-001'].id,
        productToId: productMap['BEEF-ACE-001'].id,
        relationType: 'relacionado',
        strength: 3,
      },
    }),
  ]);

  console.log('Criadas relações de produtos');

  // Criar Clientes
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        phone: '5511999991234',
        name: 'João Silva',
        email: 'joao.silva@email.com',
        birthdate: new Date('1985-03-15'),
        notes: 'Fã de picanha, cliente frequente, faz churrasco todo fim de semana',
        billingStreet: 'Rua das Palmeiras',
        billingNumber: '123',
        billingComplement: 'Apto 45',
        billingNeighborhood: 'Jardim América',
        billingCity: 'São Paulo',
        billingState: 'SP',
        billingZipCode: '01234-567',
        deliveryStreet: 'Rua das Palmeiras',
        deliveryNumber: '123',
        deliveryComplement: 'Apto 45',
        deliveryNeighborhood: 'Jardim América',
        deliveryCity: 'São Paulo',
        deliveryState: 'SP',
        deliveryZipCode: '01234-567',
      },
    }),
    prisma.customer.create({
      data: {
        phone: '5511999995678',
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        birthdate: new Date('1978-07-22'),
        notes: 'Dona de churrascaria, compra em grande quantidade',
        billingStreet: 'Av. Paulista',
        billingNumber: '1500',
        billingComplement: 'Sala 302',
        billingNeighborhood: 'Bela Vista',
        billingCity: 'São Paulo',
        billingState: 'SP',
        billingZipCode: '01310-100',
        deliveryStreet: 'Rua Augusta',
        deliveryNumber: '800',
        deliveryComplement: 'Churrascaria Fogo de Chão',
        deliveryNeighborhood: 'Consolação',
        deliveryCity: 'São Paulo',
        deliveryState: 'SP',
        deliveryZipCode: '01304-001',
      },
    }),
    prisma.customer.create({
      data: {
        phone: '5511999999012',
        name: 'Roberto Oliveira',
        email: 'roberto.oliveira@email.com',
        birthdate: new Date('1990-11-08'),
        notes: 'Churrasqueiro amador, adora costela gaúcha e cupim',
        billingStreet: 'Rua Oscar Freire',
        billingNumber: '456',
        billingNeighborhood: 'Pinheiros',
        billingCity: 'São Paulo',
        billingState: 'SP',
        billingZipCode: '05409-010',
        deliveryStreet: 'Rua Oscar Freire',
        deliveryNumber: '456',
        deliveryNeighborhood: 'Pinheiros',
        deliveryCity: 'São Paulo',
        deliveryState: 'SP',
        deliveryZipCode: '05409-010',
      },
    }),
    prisma.customer.create({
      data: {
        phone: '5511999993456',
        name: 'Ana Paula Costa',
        email: 'ana.costa@email.com',
        birthdate: new Date('1995-01-30'),
        notes: 'Cliente nova, indicada pelo João',
        billingStreet: 'Rua Haddock Lobo',
        billingNumber: '789',
        billingComplement: 'Casa 2',
        billingNeighborhood: 'Cerqueira César',
        billingCity: 'São Paulo',
        billingState: 'SP',
        billingZipCode: '01414-001',
        deliveryStreet: 'Rua Haddock Lobo',
        deliveryNumber: '789',
        deliveryComplement: 'Casa 2',
        deliveryNeighborhood: 'Cerqueira César',
        deliveryCity: 'São Paulo',
        deliveryState: 'SP',
        deliveryZipCode: '01414-001',
      },
    }),
    prisma.customer.create({
      data: {
        phone: '5511999997890',
        name: 'Carlos Ferreira',
        email: 'carlos.f@email.com',
        birthdate: new Date('1982-09-12'),
        notes: 'Prefere cortes magros para o dia a dia, coxão mole e acém',
        billingStreet: 'Alameda Santos',
        billingNumber: '1000',
        billingComplement: 'Cobertura',
        billingNeighborhood: 'Jardim Paulista',
        billingCity: 'São Paulo',
        billingState: 'SP',
        billingZipCode: '01418-100',
        deliveryStreet: 'Alameda Santos',
        deliveryNumber: '1000',
        deliveryComplement: 'Cobertura',
        deliveryNeighborhood: 'Jardim Paulista',
        deliveryCity: 'São Paulo',
        deliveryState: 'SP',
        deliveryZipCode: '01418-100',
      },
    }),
  ]);

  console.log(`Criados ${customers.length} clientes`);

  // Criar Compras com itens
  const now = new Date();

  // Compras do João (amante de picanha)
  await prisma.purchase.create({
    data: {
      customerId: customers[0].id,
      orderNumber: 'PED-2024-001',
      status: 'concluído',
      totalAmount: 289.60,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
      items: {
        create: [
          { productId: productMap['BEEF-PIC-001'].id, quantity: 2, unitPrice: 129.90, totalPrice: 259.80 },
          { productId: productMap['ACC-SAL-001'].id, quantity: 2, unitPrice: 9.90, totalPrice: 19.80 },
          { productId: productMap['ACC-CHI-001'].id, quantity: 1, unitPrice: 19.90, totalPrice: 19.90 },
        ],
      },
    },
  });

  await prisma.purchase.create({
    data: {
      customerId: customers[0].id,
      orderNumber: 'PED-2024-015',
      status: 'concluído',
      totalAmount: 199.80,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
      items: {
        create: [
          { productId: productMap['BEEF-PIC-001'].id, quantity: 1, unitPrice: 129.90, totalPrice: 129.90 },
          { productId: productMap['BEEF-MAM-001'].id, quantity: 1, unitPrice: 69.90, totalPrice: 69.90 },
        ],
      },
    },
  });

  // Compra em grande quantidade da Maria (restaurante)
  await prisma.purchase.create({
    data: {
      customerId: customers[1].id,
      orderNumber: 'PED-2024-008',
      status: 'concluído',
      totalAmount: 1089.30,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: productMap['BEEF-PIC-001'].id, quantity: 5, unitPrice: 129.90, totalPrice: 649.50 },
          { productId: productMap['BEEF-MAM-001'].id, quantity: 3, unitPrice: 69.90, totalPrice: 209.70 },
          { productId: productMap['BEEF-FRA-001'].id, quantity: 2, unitPrice: 59.90, totalPrice: 119.80 },
          { productId: productMap['ACC-SAL-001'].id, quantity: 5, unitPrice: 9.90, totalPrice: 49.50 },
          { productId: productMap['ACC-CHI-001'].id, quantity: 3, unitPrice: 19.90, totalPrice: 59.70 },
        ],
      },
    },
  });

  // Pedido de churrasco do Roberto (churrasco de fim de semana)
  await prisma.purchase.create({
    data: {
      customerId: customers[2].id,
      orderNumber: 'PED-2024-012',
      status: 'concluído',
      totalAmount: 329.70,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: productMap['BEEF-COS-001'].id, quantity: 1, unitPrice: 149.90, totalPrice: 149.90 },
          { productId: productMap['BEEF-CUP-001'].id, quantity: 1, unitPrice: 89.90, totalPrice: 89.90 },
          { productId: productMap['BEEF-FRA-001'].id, quantity: 1, unitPrice: 59.90, totalPrice: 59.90 },
          { productId: productMap['ACC-SAL-001'].id, quantity: 3, unitPrice: 9.90, totalPrice: 29.70 },
        ],
      },
    },
  });

  // Escolha do dia a dia do Carlos (cortes magros)
  await prisma.purchase.create({
    data: {
      customerId: customers[4].id,
      orderNumber: 'PED-2024-020',
      status: 'concluído',
      totalAmount: 189.60,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { productId: productMap['BEEF-COX-001'].id, quantity: 2, unitPrice: 54.90, totalPrice: 109.80 },
          { productId: productMap['BEEF-MOI-001'].id, quantity: 2, unitPrice: 24.90, totalPrice: 49.80 },
          { productId: productMap['BEEF-ACE-001'].id, quantity: 1, unitPrice: 39.90, totalPrice: 39.90 },
        ],
      },
    },
  });

  console.log('Criadas compras');

  // Criar Promoções
  const promotions = await Promise.all([
    prisma.promotion.create({
      data: {
        code: 'CHURRAS15',
        name: 'Promoção Churrasco do Final de Semana',
        description: '15% de desconto em picanha, maminha e fraldinha - monte seu churrasco!',
        discountType: 'porcentagem',
        discountValue: 15,
        validFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        targetType: 'produtos',
        products: {
          create: [
            { productId: productMap['BEEF-PIC-001'].id },
            { productId: productMap['BEEF-MAM-001'].id },
            { productId: productMap['BEEF-FRA-001'].id },
          ],
        },
      },
    }),
    prisma.promotion.create({
      data: {
        code: 'PICANHA30',
        name: 'Festival da Picanha',
        description: 'R$30 de desconto na compra de 2 ou mais picanhas',
        discountType: 'fixo',
        discountValue: 30,
        minPurchase: 200,
        validFrom: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        isActive: true,
        targetType: 'produtos',
        products: {
          create: [
            { productId: productMap['BEEF-PIC-001'].id },
            { productId: productMap['BEEF-ALC-001'].id },
          ],
        },
      },
    }),
    prisma.promotion.create({
      data: {
        code: 'BEMVINDO',
        name: 'Desconto de Boas-Vindas',
        description: '10% de desconto na sua primeira compra - bem-vindo à EBEEF!',
        discountType: 'porcentagem',
        discountValue: 10,
        maxDiscount: 50,
        validFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
        targetType: 'todos',
      },
    }),
    prisma.promotion.create({
      data: {
        code: 'CHURRASCAO',
        name: 'Desconto Churrascão',
        description: '20% de desconto em pedidos acima de R$500 - ideal para festas e eventos!',
        discountType: 'porcentagem',
        discountValue: 20,
        minPurchase: 500,
        validFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        isActive: true,
        targetType: 'todos',
      },
    }),
  ]);

  console.log(`Criadas ${promotions.length} promoções`);

  // Criar Templates de Sugestão para o copilot
  await Promise.all([
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'oi|olá|ola|bom dia|boa tarde|boa noite|e aí|eae',
        category: 'saudação',
        template: 'Olá {customer_name}! Bem-vindo à EBEEF. Como posso ajudá-lo hoje?',
        priority: 10,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'preço|preco|quanto custa|valor|custo',
        category: 'preços',
        template: 'Nosso {product_name} está por R${product_price}. Gostaria de saber sobre alguma promoção ativa?',
        priority: 8,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'pedido|comprar|quero|pedir|encomendar',
        category: 'pedido',
        template: 'Ficarei feliz em ajudá-lo a fazer um pedido de {product_name}. Quantas unidades você gostaria?',
        priority: 9,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'entrega|frete|quando chega|prazo|envio',
        category: 'entrega',
        template: 'Oferecemos entrega no próximo dia útil para pedidos feitos até às 14h. Seu pedido chegaria em {delivery_date}.',
        priority: 7,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'recomenda|sugere|indica|qual o melhor|dica',
        category: 'recomendação',
        template: 'Baseado nas suas compras anteriores de {past_products}, eu recomendaria experimentar nosso {recommended_product}.',
        priority: 8,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'desconto|promoção|promocao|oferta|cupom',
        category: 'promoção',
        template: 'Ótima notícia! Temos estas promoções ativas: {active_promotions}',
        priority: 9,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'reclamação|reclamacao|problema|errado|ruim|péssimo|pessimo',
        category: 'reclamação',
        template: 'Lamento saber que você está tendo um problema. Deixe-me verificar isso para você imediatamente. Pode me contar mais sobre o que aconteceu?',
        priority: 10,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'obrigado|obrigada|valeu|agradeço|agradeco|tchau|até mais|ate mais',
        category: 'encerramento',
        template: 'Obrigado por escolher a EBEEF, {customer_name}! Não hesite em entrar em contato se precisar de mais alguma coisa. Tenha um ótimo dia!',
        priority: 5,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'status|onde está|cadê|cade|rastrear|acompanhar',
        category: 'status_pedido',
        template: 'Deixe-me verificar o status do seu pedido. Seu último pedido #{order_number} está atualmente {order_status}.',
        priority: 8,
      },
    }),
    prisma.suggestionTemplate.create({
      data: {
        trigger: 'cancelar|devolver|reembolso|estorno|trocar',
        category: 'cancelamento',
        template: 'Entendo que você gostaria de cancelar/devolver seu pedido. Posso ajudá-lo com isso. Poderia me informar o motivo para que possamos melhorar nosso serviço?',
        priority: 9,
      },
    }),
  ]);

  console.log('Criados templates de sugestão');

  // Criar conversas de exemplo com diferentes clientes e necessidades

  // Conversa 1: João - Cliente fiel querendo picanha para churrasco
  await prisma.conversation.create({
    data: {
      phoneNumber: '5511999991234',
      mode: 'AI',
      status: 'active',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999991234',
      customerId: customers[0].id,
      sender: 'user',
      content: 'Oi, quero encomendar picanha pro churrasco de domingo',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999991234',
      customerId: customers[0].id,
      sender: 'ai',
      content: 'Olá João! Que bom falar com você! Vejo que você é fã de picanha - já pediu várias vezes! Nossa Picanha Premium está por R$129,90 o kg. Quantas você gostaria para o churrasco de domingo?',
    },
  });

  // Conversa 2: Maria - Dona de churrascaria, pedido grande
  await prisma.conversation.create({
    data: {
      phoneNumber: '5511999995678',
      mode: 'AI',
      status: 'active',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999995678',
      customerId: customers[1].id,
      sender: 'user',
      content: 'Bom dia! Preciso fazer um pedido grande para a churrascaria. Vocês têm preço especial para atacado?',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999995678',
      customerId: customers[1].id,
      sender: 'ai',
      content: 'Bom dia Maria! Claro, temos condições especiais para pedidos em grande quantidade. Para pedidos acima de R$500, você ganha 20% de desconto com o código CHURRASCAO. Qual seria a quantidade que você precisa?',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999995678',
      customerId: customers[1].id,
      sender: 'user',
      content: 'Preciso de 10kg de picanha, 5kg de maminha e 5kg de fraldinha',
    },
  });

  // Conversa 3: Roberto - Churrasqueiro querendo costela
  await prisma.conversation.create({
    data: {
      phoneNumber: '5511999999012',
      mode: 'AI',
      status: 'active',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999999012',
      customerId: customers[2].id,
      sender: 'user',
      content: 'E aí! To querendo fazer uma costela gaúcha no final de semana. Qual o tempo de preparo que vocês recomendam?',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999999012',
      customerId: customers[2].id,
      sender: 'ai',
      content: 'Fala Roberto! Para uma Costela Gaúcha perfeita, recomendamos de 5 a 6 horas na brasa baixa. Nossa costela de 5kg está por R$149,90. Quer que eu reserve uma pra você?',
    },
  });

  // Conversa 4: Ana Paula - Cliente nova com dúvidas
  await prisma.conversation.create({
    data: {
      phoneNumber: '5511999993456',
      mode: 'OPERATOR',
      status: 'active',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999993456',
      customerId: customers[3].id,
      sender: 'user',
      content: 'Oi! O João me indicou vocês. Nunca comprei carne online, como funciona a entrega?',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999993456',
      customerId: customers[3].id,
      sender: 'ai',
      content: 'Olá Ana Paula! Que bom que o João te indicou! A entrega é feita em caixas térmicas para manter a qualidade. Pedidos feitos até 14h são entregues no próximo dia útil. Como é sua primeira compra, você ganha 10% de desconto com o código BEMVINDO!',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999993456',
      customerId: customers[3].id,
      sender: 'user',
      content: 'Que legal! E qual corte vocês recomendam para quem não tem muita experiência na churrasqueira?',
    },
  });

  // Conversa 5: Carlos - Preocupado com saúde, quer cortes magros
  await prisma.conversation.create({
    data: {
      phoneNumber: '5511999997890',
      mode: 'AI',
      status: 'active',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999997890',
      customerId: customers[4].id,
      sender: 'user',
      content: 'Boa tarde! Estou procurando cortes mais magros, com menos gordura. O que vocês têm?',
    },
  });

  await prisma.message.create({
    data: {
      phoneNumber: '5511999997890',
      customerId: customers[4].id,
      sender: 'ai',
      content: 'Boa tarde Carlos! Para uma opção mais magra, recomendo nosso Coxão Mole (R$54,90/kg) ou o Filé Mignon (R$109,90/kg), que são cortes com pouca gordura. Também temos Carne Moída de Primeira (R$24,90/500g) que é ótima para o dia a dia!',
    },
  });

  console.log('Criadas conversas de exemplo');

  console.log('Banco de dados populado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao popular banco de dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
