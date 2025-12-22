# EBEEF API Documentation

Base URL: `http://localhost:3001`

## Authentication

All endpoints except `/health`, `/webhook`, and auth routes require authentication.

In **demo mode** (`APP_MODE=demo`), authentication is bypassed.
In **production mode**, include the JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /api/auth/login
Authenticate operator and receive tokens.

**Body:**
```json
{
  "email": "operator@ebeef.com.br",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "operator@ebeef.com.br",
    "name": "João Silva",
    "role": "operator"
  },
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

---

### POST /api/auth/refresh
Refresh access token using refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbG..."
}
```

---

### POST /api/auth/logout
Invalidate refresh token.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

---

### GET /api/auth/me
Get current authenticated user info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "operator@ebeef.com.br",
    "name": "João Silva",
    "role": "operator"
  },
  "isDemo": false
}
```

---

### POST /api/auth/register
Register new operator.

**Body:**
```json
{
  "email": "novo@ebeef.com.br",
  "password": "password123",
  "name": "Maria Santos",
  "role": "operator"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 2,
    "email": "novo@ebeef.com.br",
    "name": "Maria Santos",
    "role": "operator"
  },
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

---

### POST /api/auth/change-password
Change operator password.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## Conversation Endpoints

### GET /api/conversations
Get all conversations with messages and customer info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "5511999998888": {
    "mode": "AI",
    "status": "active",
    "messages": [
      {
        "sender": "user",
        "text": "Olá, gostaria de saber os preços",
        "timestamp": 1699999999000
      }
    ],
    "customer": {
      "name": "Carlos Souza",
      "email": "carlos@email.com",
      "notes": "Cliente frequente"
    }
  }
}
```

---

### POST /api/send
Send message to WhatsApp customer.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "to": "5511999998888",
  "text": "Olá! Como posso ajudar?"
}
```

---

### POST /api/mode
Toggle conversation mode (AI/OPERATOR).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "to": "5511999998888",
  "mode": "OPERATOR"
}
```

---

## Copilot Endpoints

### GET /api/copilot/suggestions/:phoneNumber
Get AI-generated response suggestions for a conversation.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `message` (optional): Current message to generate suggestions for

**Response:**
```json
{
  "suggestions": [
    "Olá! A Picanha Premium está por R$ 129,90/kg.",
    "Entrega em 24-48 horas na sua região!"
  ],
  "intent": "product_inquiry",
  "confidence": 0.85
}
```

---

### GET /api/copilot/customer/:phoneNumber
Get customer context and purchase history summary.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "customer": {
    "name": "Carlos Souza",
    "phone": "5511999998888",
    "email": "carlos@email.com"
  },
  "purchaseHistory": {
    "totalPurchases": 5,
    "totalSpent": 1250.00,
    "favoriteProducts": ["Picanha Premium", "Maminha"]
  },
  "conversationSummary": "Cliente interessado em cortes premium"
}
```

---

### POST /api/copilot/customer/:phoneNumber/notes
Update customer notes.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "notes": "Prefere entrega às terças-feiras"
}
```

---

### POST /api/copilot/customer/:phoneNumber/name
Update customer name.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Carlos Roberto Souza"
}
```

---

### GET /api/copilot/customer/:phoneNumber/purchases
Get detailed purchase history for a customer.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "purchases": [
    {
      "id": 1,
      "orderNumber": "ORD-2024-001",
      "status": "completed",
      "totalAmount": 259.80,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "items": [
        {
          "product": {
            "name": "Picanha Premium",
            "sku": "PIC-001"
          },
          "quantity": 2,
          "unitPrice": 129.90,
          "totalPrice": 259.80
        }
      ]
    }
  ]
}
```

---

## Product Endpoints

### GET /api/products
Get all products (cached for 5 minutes).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
[
  {
    "id": 1,
    "sku": "PIC-001",
    "name": "Picanha Premium",
    "description": "Corte nobre de primeira qualidade",
    "price": 129.90,
    "category": "Bovinos",
    "subcategory": "Premium",
    "stock": 50,
    "isActive": true
  }
]
```

---

### GET /api/products/search
Search products by name or description.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q`: Search query

**Response:**
```json
[
  {
    "id": 1,
    "name": "Picanha Premium",
    "price": 129.90,
    "category": "Bovinos"
  }
]
```

---

## Promotions Endpoint

### GET /api/promotions
Get active promotions (cached for 2 minutes).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "code": "BEMVINDO",
    "name": "Desconto Novo Cliente",
    "description": "10% de desconto na primeira compra",
    "discountType": "percentage",
    "discountValue": 10.00,
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validUntil": "2024-12-31T23:59:59.000Z",
    "isActive": true
  }
]
```

---

## AI Endpoints

These endpoints require OpenAI API key to be configured (`OPENAI_API_KEY`).

### GET /api/ai/status
Check AI service availability.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "available": true,
  "features": ["suggestions", "improve", "summarize", "recommendations"]
}
```

---

### POST /api/ai/suggest
Generate AI suggestion for operator response.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "phoneNumber": "5511999998888",
  "message": "Quanto custa a picanha?"
}
```

**Response:**
```json
{
  "suggestion": "Olá! Nossa Picanha Premium está por R$ 129,90/kg. É o corte mais procurado! Quer que eu reserve para você?"
}
```

---

### POST /api/ai/improve
Improve/rephrase operator message.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "message": "ta 129 o kg",
  "tone": "friendly"
}
```

**Response:**
```json
{
  "original": "ta 129 o kg",
  "improved": "O preço é R$ 129,90 por kg! Posso ajudar com mais alguma informação?",
  "tone": "friendly"
}
```

---

### GET /api/ai/summarize/:phoneNumber
Get AI-generated conversation summary.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "phoneNumber": "5511999998888",
  "summary": "Cliente interessado em picanha premium para churrasco. Perguntou sobre preços e prazo de entrega. Ainda não finalizou pedido."
}
```

---

### GET /api/ai/recommendations/:phoneNumber
Get AI product recommendations based on conversation.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "products": [
    {
      "name": "Picanha Premium",
      "reason": "Mencionou interesse em churrasco"
    },
    {
      "name": "Kit Churrasco Completo",
      "reason": "Complementa a picanha"
    }
  ]
}
```

---

### POST /api/ai/classify
Classify message intent.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "message": "Quanto tempo demora pra entregar?"
}
```

**Response:**
```json
{
  "intent": "delivery_inquiry",
  "confidence": 0.92,
  "entities": {
    "topic": "delivery"
  }
}
```

---

## Health Check Endpoints

### GET /health
Basic health check (no auth required).

**Response:**
```json
{
  "status": "ok",
  "mode": "demo",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /health/detailed
Detailed health check with database and service status.

**Response:**
```json
{
  "status": "ok",
  "mode": "production",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": { "status": "ok" },
    "ai": { "status": "ok" },
    "cache": { "status": "ok", "size": 5 }
  },
  "uptime": 3600,
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 20000000
  }
}
```

---

### GET /ready
Kubernetes readiness probe.

**Response:**
```json
{ "ready": true }
```

---

### GET /live
Kubernetes liveness probe.

**Response:**
```json
{ "live": true }
```

---

## Webhook Endpoints

### GET /webhook
WhatsApp webhook verification (no auth required).

**Query Parameters:**
- `hub.mode`: Must be "subscribe"
- `hub.verify_token`: Must match `VERIFY_TOKEN`
- `hub.challenge`: Challenge string to return

---

### POST /webhook
Incoming WhatsApp messages (no auth required, signature verified in production).

---

## WebSocket Events

Connect to `ws://localhost:3001` with authentication.

### Events Emitted by Server:

**new_message**
```json
{
  "from": "5511999998888",
  "message": {
    "sender": "user",
    "text": "Olá!",
    "timestamp": 1699999999000
  },
  "mode": "AI",
  "suggestions": ["Olá! Como posso ajudar?"]
}
```

**mode_change**
```json
{
  "from": "5511999998888",
  "mode": "OPERATOR"
}
```

**suggestions_update**
```json
{
  "phoneNumber": "5511999998888",
  "suggestions": ["Sugestão 1", "Sugestão 2"]
}
```

### Events to Emit:

**request_suggestions**
```json
{
  "phoneNumber": "5511999998888",
  "message": "Quanto custa?"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Descrição do erro em português",
  "code": "ERROR_CODE",
  "requestId": "uuid-request-id"
}
```

### Common Error Codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_ACCOUNT_DISABLED` | 401 | Account is disabled |
| `AUTH_INVALID_TOKEN` | 401 | Invalid or expired token |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_UNAVAILABLE` | 503 | OpenAI not configured |
| `REQUEST_TIMEOUT` | 408 | Request took too long |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

In production mode, API endpoints are rate-limited:
- 100 requests per minute per IP
- Returns `429 Too Many Requests` when exceeded

---

## CORS

Allowed origins are configured via `CORS_ORIGINS` environment variable.

Default: `http://localhost:5173,http://localhost:5174,http://localhost:3000`
