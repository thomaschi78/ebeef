# EBEEF - Plataforma de Atendimento ao Cliente via WhatsApp

Sistema de atendimento ao cliente via WhatsApp com copiloto inteligente para churrascarias e distribuidoras de carnes nobres.

## Funcionalidades

- **Dashboard do Operador** - Interface estilo WhatsApp para operadores
- **Painel Administrativo** - Gerenciamento de operadores, produtos e promoções
- **Copiloto com IA** - Sugestões inteligentes baseadas em histórico de compras
- **Chat em Tempo Real** - Comunicação via Socket.io
- **Integração WhatsApp** - Webhook para receber/enviar mensagens

## Stack Tecnológica

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 19, Vite 7, React Router |
| Backend | Node.js, Express 5, Socket.io |
| Banco de Dados | PostgreSQL 15, Prisma ORM |
| Autenticação | JWT tokens, bcrypt |
| Logging | Pino |
| Monitoramento de Erros | Sentry |

## Início Rápido

### Pré-requisitos

- Node.js 20+
- Docker (para PostgreSQL)
- Credenciais da API WhatsApp Business (opcional)

### Configuração para Desenvolvimento

```bash
# Clonar o repositório
git clone <repo-url>
cd ebeef-app

# Iniciar PostgreSQL
docker run -d --name ebeef-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ebeef \
  -p 5433:5432 \
  postgres:15-alpine

# Configurar servidor
cd server
cp .env.example .env
npm install
npm run db:setup  # Gera cliente, aplica schema, popula dados

# Iniciar servidor (modo demo)
npm run dev

# Em outro terminal, configurar cliente
cd ../client
npm install
npm run dev
```

Acessos:

- Cliente: http://localhost:5173
- Servidor: http://localhost:3001
- Health Check: http://localhost:3001/health

## Variáveis de Ambiente

### Servidor (.env)

```env
# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ebeef

# Autenticação
JWT_SECRET=sua-chave-secreta-minimo-32-caracteres
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=12

# WhatsApp (opcional)
WHATSAPP_TOKEN=seu-token-whatsapp
WHATSAPP_PHONE_ID=seu-phone-id
WHATSAPP_VERIFY_TOKEN=seu-verify-token
WHATSAPP_APP_SECRET=seu-app-secret

# OpenAI (opcional - para funcionalidades de IA)
OPENAI_API_KEY=sua-chave-openai

# Monitoramento de Erros (produção)
SENTRY_DSN=seu-sentry-dsn

# Modo da Aplicação
APP_MODE=demo  # demo | production
```

### Cliente (.env)

```env
VITE_API_URL=http://localhost:3001
```

## Estrutura do Projeto

```text
ebeef-app/
├── server/
│   ├── index.js          # App Express + Socket.io
│   ├── config/           # Configurações por ambiente
│   ├── lib/              # Prisma, cache, logger, sentry
│   ├── middleware/       # Auth, validação, logging
│   ├── routes/           # Rotas da API
│   ├── services/         # Lógica de negócio (copilot, IA)
│   ├── prisma/           # Schema + migrations + seed
│   └── tests/            # Testes Jest
├── client/
│   ├── src/
│   │   ├── App.jsx       # Configuração de rotas
│   │   ├── contexts/     # AuthContext
│   │   ├── components/   # LoginPage, ErrorBoundary
│   │   └── pages/        # operator/, admin/
│   └── vite.config.js
├── scripts/              # Scripts de backup/restore
└── .github/workflows/    # CI/CD
```

## Rotas da API

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | /health | Verificação de saúde |
| GET | /ready | Probe de prontidão |
| GET | /live | Probe de vida |
| GET | /metrics | Métricas do sistema (JSON) |
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Cadastro |
| GET | /api/conversations | Listar conversas |
| POST | /api/send | Enviar mensagem |
| POST | /api/mode | Alternar modo IA/Operador |
| GET | /api/copilot/suggestions/:phone | Obter sugestões |
| GET | /api/admin/stats | Estatísticas do dashboard |
| GET | /api/admin/operators | Listar operadores |
| GET | /api/admin/products | Listar produtos |
| GET | /api/admin/promotions | Listar promoções |
| GET | /api/admin/analytics | Dados analíticos |

## Deploy

### Docker Compose (Produção)

```bash
# Build e iniciar
docker-compose -f docker-compose.production.yml up -d

# Executar migrations
docker-compose exec server npx prisma migrate deploy
```

### Deploy Manual

1. **Build do cliente:**

   ```bash
   cd client
   npm run build
   ```

2. **Iniciar servidor:**

   ```bash
   cd server
   NODE_ENV=production APP_MODE=production node index.js
   ```

### CI/CD

Workflows do GitHub Actions configurados:

- **ci.yml** - Lint, teste, build em push/PR
- **deploy.yml** - Deploy para staging/produção
- **backup.yml** - Backups diários do banco

### Secrets Necessários

Configure nas configurações do repositório GitHub:

| Secret | Descrição |
|--------|-----------|
| DATABASE_URL | URL do banco de produção |
| JWT_SECRET | Chave secreta de autenticação |
| SENTRY_DSN | DSN do projeto Sentry |
| AWS_ACCESS_KEY_ID | Acesso S3 para backup (opcional) |
| AWS_SECRET_ACCESS_KEY | Secret S3 para backup (opcional) |

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| STAGING_URL | URL do ambiente de staging |
| PRODUCTION_URL | URL do ambiente de produção |
| AWS_S3_BUCKET | Bucket S3 para backups |
| AWS_REGION | Região AWS |

## Backups do Banco de Dados

Backup manual:

```bash
./scripts/backup.sh /caminho/para/backups
```

Restauração:

```bash
./scripts/restore.sh /caminho/para/backup.sql.gz
```

Backups automáticos rodam diariamente às 3:00 AM UTC via GitHub Actions.

## Testes

```bash
# Testes do servidor
cd server
npm test

# Com cobertura
npm run test:coverage

# Executar linting
npm run lint

# Corrigir problemas de lint
npm run lint:fix
```

## Monitoramento

### Endpoints de Saúde

- `GET /health` - Verificação básica
- `GET /ready` - Probe de prontidão
- `GET /live` - Probe de vida

### Endpoint de Métricas

`GET /metrics` retorna JSON com:

- `uptime_seconds` - Tempo de atividade do servidor
- `memory` - Uso de memória (rss, heap, external)
- `cpu` - Uso de CPU (user, system)
- `websocket.connected_clients` - Conexões WebSocket ativas
- `cache.stats` - Estatísticas de cache hit/miss
- `database.connected` - Status da conexão com banco
- `ai.available` - Disponibilidade do serviço de IA
- `error_tracking.enabled` - Status do Sentry

### Integração Sentry

Monitoramento de erros habilitado em produção quando `SENTRY_DSN` está configurado.

---

## Suporte ao Idioma

A plataforma é desenvolvida inteiramente em **Português Brasileiro (pt-BR)**:

- Todas as respostas da IA são geradas em português
- Labels e mensagens da interface em português
- Formatação de data/moeda usa locale pt-BR
- Contexto da IA inclui terminologia de churrasco brasileiro

O prompt do sistema de IA (`server/services/ai.js`) inclui:

- Contexto da empresa ebeef (carnes nobres)
- Catálogo de produtos com preços em reais
- Diretrizes de tom de comunicação (informal mas profissional)
- Orientações sobre uso de emojis

---

## Gerenciamento do Catálogo de Produtos

### Via Painel Administrativo

Acesse o painel admin em `/admin`:

| Página | URL | Ações |
|--------|-----|-------|
| Produtos | `/admin/produtos` | Adicionar, editar, excluir produtos |
| Promoções | `/admin/promocoes` | Criar códigos promocionais, definir validade |

### Schema do Produto

```text
Product {
  sku         - Código único do produto (ex: "PIC-001")
  name        - Nome do produto
  description - Descrição detalhada
  price       - Preço em BRL (Decimal)
  category    - Categoria (Bovinos, Suínos, Aves, etc.)
  subcategory - Subcategoria opcional
  imageUrl    - URL da imagem do produto
  stock       - Quantidade disponível
  isActive    - Se o produto está disponível
}
```

### Via Seed do Banco de Dados

Edite `server/prisma/seed.js`:

```javascript
await prisma.product.createMany({
  data: [
    {
      sku: 'PIC-001',
      name: 'Picanha Premium',
      description: 'Corte nobre, marmoreio especial',
      price: 129.90,
      category: 'Bovinos',
      stock: 100,
      isActive: true
    },
    {
      sku: 'MAM-001',
      name: 'Maminha',
      price: 69.90,
      category: 'Bovinos',
      stock: 50
    },
    {
      sku: 'CHI-001',
      name: 'Chimichurri Artesanal',
      price: 19.90,
      category: 'Acompanhamentos',
      stock: 200
    },
  ]
});
```

Execute o seed: `cd server && node prisma/seed.js`

---

## Gerenciamento de Promoções

### Schema da Promoção

```text
Promotion {
  code          - Código único da promoção (ex: "BEMVINDO")
  name          - Nome de exibição
  description   - Descrição para o cliente
  discountType  - "percentage" | "fixed" | "buyXgetY"
  discountValue - Valor do desconto
  minPurchase   - Valor mínimo do pedido (opcional)
  maxDiscount   - Teto máximo do desconto (opcional)
  validFrom     - Data de início
  validUntil    - Data de término
  isActive      - Se a promoção está ativa
  usageLimit    - Máximo de usos (opcional)
  usageCount    - Usos atuais
  targetType    - "all" | "category" | "products" | "customers"
}
```

### Criando Promoções

```javascript
// Desconto para novo cliente
await prisma.promotion.create({
  data: {
    code: 'BEMVINDO',
    name: 'Desconto Primeira Compra',
    description: '10% de desconto na primeira compra!',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: new Date(),
    validUntil: new Date('2025-12-31'),
    targetType: 'all',
    isActive: true,
  }
});

// Desconto para pedidos grandes
await prisma.promotion.create({
  data: {
    code: 'CHURRASCO50',
    name: 'Pedidos acima de R$500',
    description: 'R$50 off em pedidos acima de R$500',
    discountType: 'fixed',
    discountValue: 50,
    minPurchase: 500,
    validFrom: new Date(),
    validUntil: new Date('2025-12-31'),
    isActive: true,
  }
});

// Promoção específica para produto
const promotion = await prisma.promotion.create({
  data: {
    code: 'PICANHA20',
    name: '20% na Picanha',
    description: '20% de desconto em todas as picanhas',
    discountType: 'percentage',
    discountValue: 20,
    validFrom: new Date(),
    validUntil: new Date('2025-06-30'),
    isActive: true,
  }
});

// Vincular promoção a produtos específicos
await prisma.promotionProduct.create({
  data: {
    promotionId: promotion.id,
    productId: picanha.id,
  }
});
```

---

## Funcionalidades Inteligentes de Vendas

### Como o Copiloto Funciona

Quando uma mensagem do cliente chega, o sistema automaticamente:

```text
┌─────────────────────────────────────────────────────────────────┐
│                 Mensagem do Cliente via WhatsApp                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. getCustomerContext(phoneNumber)                  │
│                                                                  │
│  Carrega do banco de dados:                                     │
│  • Perfil do cliente (nome, email, endereços)                   │
│  • Últimas 10 compras com todos os itens                        │
│  • Calcula: totalOrders, totalSpent                             │
│  • Extrai: favoriteProducts (por quantidade pedida)             │
│  • Calcula: daysSinceLastPurchase                               │
│                                                                  │
│  Localização: server/services/copilot.js:13-123                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. getRelevantPromotions(context)                   │
│                                                                  │
│  Pontua promoções por relevância ao cliente:                    │
│  • isNewCustomer + promo FIRSTORDER → +10 pontos                │
│  • totalSpent > R$500 + promo BULKBUY → +8 pontos               │
│  • favoriteProducts batem com produtos da promo → +5 cada       │
│                                                                  │
│  Retorna as 3 promoções mais relevantes                         │
│  Localização: server/services/copilot.js:128-175                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. getProductRecommendations(context)               │
│                                                                  │
│  CROSS-SELL (tabela ProductRelation):                           │
│  • Encontra produtos relacionados aos favoritos do cliente      │
│  • "Combina com Picanha" → sugere Chimichurri                   │
│                                                                  │
│  UPSELL (clientes recorrentes):                                 │
│  • daysSinceLastPurchase > 14 → sugestão de recompra            │
│  • "Faz 14 dias desde seu último pedido"                        │
│                                                                  │
│  NOVOS CLIENTES:                                                │
│  • Sugere produtos populares/mais vendidos                      │
│                                                                  │
│  Localização: server/services/copilot.js:180-244                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              4. Gerar Ações Rápidas                              │
│                                                                  │
│  Operador vê botões de um clique:                               │
│  • "Oferecer desconto de boas-vindas" (cliente novo)            │
│  • "Recomendar Picanha Premium" (baseado no histórico)          │
│  • "Compartilhar Promoção BEMVINDO" (promo relevante)           │
│                                                                  │
│  Localização: server/services/copilot.js:371-393                │
└─────────────────────────────────────────────────────────────────┘
```

### Relacionamentos de Produtos (Cross-sell)

Configure relacionamentos "frequentemente comprados juntos":

```javascript
// Picanha combina bem com Chimichurri
await prisma.productRelation.create({
  data: {
    productFromId: picanha.id,
    productToId: chimichurri.id,
    relationType: 'complement',  // Opções: related, complement, upgrade, accessory
    strength: 10,                // Maior = recomendação mais forte
  }
});

// Maminha é alternativa à Picanha
await prisma.productRelation.create({
  data: {
    productFromId: picanha.id,
    productToId: maminha.id,
    relationType: 'related',
    strength: 5,
  }
});

// Upgrade de regular para premium
await prisma.productRelation.create({
  data: {
    productFromId: picanhaRegular.id,
    productToId: picanhaPremium.id,
    relationType: 'upgrade',
    strength: 8,
  }
});
```

### Pedido com Um Clique

O sistema retorna detalhes completos do último pedido para recompra rápida:

```javascript
// Retornado nas sugestões do copilot (server/services/copilot.js:105-119)
lastPurchase: {
  orderNumber: 'ORD-2024-0042',
  date: '2024-01-15T10:30:00Z',
  amount: 259.80,
  status: 'completed',
  items: [
    {
      productId: 1,
      productName: 'Picanha Premium',
      productSku: 'PIC-001',
      quantity: 2,
      unitPrice: 129.90,
      totalPrice: 259.80
    }
  ]
}
```

O dashboard do operador pode exibir um botão "Repetir Pedido" usando esses dados.

### Dados Retornados ao Dashboard

Cada mensagem dispara uma resposta de contexto completo:

```javascript
{
  customerInfo: {
    name: "João Silva",
    phone: "5511999999999",
    isNew: false,
    totalOrders: 5,
    totalSpent: "1250.00",
    notes: "Prefere entrega aos sábados",
    deliveryAddress: { street, number, city, state, zipCode }
  },
  lastOrder: {
    orderNumber: "ORD-2024-0042",
    date: "2024-01-15",
    items: [{ productName, quantity, unitPrice }]
  },
  suggestions: [
    { type: "ai", text: "Sugestão gerada por IA...", priority: 100 },
    { type: "template", text: "Resposta de template...", priority: 50 }
  ],
  quickActions: [
    { label: "Recomendar Picanha", action: "Texto pré-formatado..." },
    { label: "Oferecer Promoção", action: "Texto com código..." }
  ],
  recommendations: [
    { id: 1, name: "Chimichurri", price: 19.90, reason: "Combina com Picanha" }
  ],
  promotions: [
    { code: "BEMVINDO", name: "10% primeira compra", discountValue: 10 }
  ],
  purchaseHistory: [
    { productName: "Picanha Premium", timesOrdered: 3, totalQuantity: 6 }
  ]
}
```

---

## Latência da API do WhatsApp

### Fluxo de Processamento de Mensagem

| Etapa | Operação | Latência | Localização |
|-------|----------|----------|-------------|
| 1 | Webhook recebe mensagem | - | `index.js:251` |
| 2 | `getOrCreateConversation()` | ~5-20ms | Query no banco |
| 3 | `saveMessage()` | ~10-30ms | Verificação de duplicata + insert |
| 4 | `copilot.generateSuggestions()` | ~50-300ms | Queries de contexto do cliente |
| 5 | **Resposta da IA** (se modo IA) | **500-3000ms** | Chamada à API OpenAI |
| 6 | `saveMessage()` (resposta IA) | ~10-20ms | Insert no banco |
| 7 | `sendWhatsAppMessage()` | ~100-500ms | API Graph da Meta |

### Tempo Total de Resposta

- **Sem IA**: ~200-500ms
- **Com IA (gpt-4o-mini)**: ~700-1500ms
- **Com IA (gpt-4)**: ~2000-4000ms

### Dicas de Otimização

1. **Use gpt-4o-mini** - Mais rápido que gpt-4, suficiente para atendimento
2. **Habilite cache** - Produtos e promoções são cacheados (TTL 5 min)
3. **Connection pooling** - Configure `DB_POOL_MAX` para produção
4. **Processamento assíncrono** - Considere responder 200 imediatamente e processar async

### Timeout do Webhook da Meta

O webhook da Meta tem timeout de 20 segundos. A implementação atual é síncrona mas deve completar bem dentro desse limite.

---

## Visão Geral do Schema do Banco

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────<│  Purchase   │────<│PurchaseItem │
│             │     │             │     │             │
│ phone (PK)  │     │ customerId  │     │ purchaseId  │
│ name        │     │ orderNumber │     │ productId   │
│ email       │     │ totalAmount │     │ quantity    │
│ addresses   │     │ status      │     │ unitPrice   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       │
       ▼                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Message    │     │ Promotion   │────<│PromotionProd│
│             │     │             │     │             │
│ phoneNumber │     │ code        │     │ promotionId │
│ sender      │     │ discountType│     │ productId   │
│ content     │     │ validFrom   │     └─────────────┘
│ timestamp   │     │ validUntil  │            │
└─────────────┘     └─────────────┘            │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│Conversation │     │  Product    │────<│ProductRelat │
│             │     │             │     │             │
│ phoneNumber │     │ sku         │     │ productFrom │
│ mode (AI/OP)│     │ name        │     │ productTo   │
│ status      │     │ price       │     │ relationType│
│ assignedTo  │     │ category    │     │ strength    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Licença

ISC
