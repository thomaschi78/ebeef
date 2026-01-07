# ebeef - Especificações de API

## 1. API Bling ERP

**URL Base:** `https://api.bling.com.br/Api/v3`

**Autenticação:** OAuth 2.0

### Endpoints Necessários

#### Produtos

```http
GET /produtos
# Listar todos os produtos com paginação

GET /produtos/{idProduto}
# Obter detalhes de um produto específico

GET /produtos/{idProduto}/variacoes
# Obter variações do produto (cortes, pesos)
```

#### Estoque

```http
GET /estoques/saldos
# Obter saldos de estoque

GET /depositos
# Listar depósitos
```

#### Pedidos de Venda

```http
POST /pedidos/vendas
# Criar novo pedido de venda

Corpo da Requisição:
{
  "contato": {
    "id": "id_cliente_bling"
  },
  "itens": [
    {
      "produto": { "id": "id_produto" },
      "quantidade": 2,
      "valor": 50.00
    }
  ],
  "transporte": {
    "frete": 15.00,
    "volumes": 1
  },
  "observacoes": "Observações de entrega"
}

GET /pedidos/vendas/{idPedidoVenda}
# Obter detalhes do pedido

PUT /pedidos/vendas/{idPedidoVenda}
# Atualizar status do pedido
```

#### Contatos (Clientes)

```http
POST /contatos
# Criar contato de cliente

GET /contatos/{idContato}
# Obter detalhes do cliente

GET /contatos?telefone={telefone}
# Buscar por número de telefone
```

#### Notas Fiscais (NF-e)

```http
POST /nfe
# Gerar nota fiscal

GET /nfe/{idNotaFiscal}
# Obter detalhes da nota fiscal
```

---

## 2. API de Pagamentos Pagar.me

**URL Base:** `https://api.pagar.me/core/v5`

**Autenticação:** Basic Auth (API Key como usuário)

### Endpoints Necessários

#### Clientes

```http
POST /customers
# Criar cliente

Corpo da Requisição:
{
  "name": "Nome do Cliente",
  "email": "cliente@email.com",
  "type": "individual",
  "document": "12345678900",
  "phones": {
    "mobile_phone": {
      "country_code": "55",
      "area_code": "11",
      "number": "999999999"
    }
  }
}

GET /customers/{customer_id}
# Obter detalhes do cliente

GET /customers?document={cpf}
# Buscar por documento
```

#### Pedidos

```http
POST /orders
# Criar pedido com pagamento

Corpo da Requisição:
{
  "customer_id": "cus_xxxx",
  "items": [
    {
      "amount": 5000,
      "description": "Picanha 1kg",
      "quantity": 2,
      "code": "SKU123"
    }
  ],
  "payments": [
    {
      "payment_method": "pix",
      "pix": {
        "expires_in": 3600
      }
    }
  ]
}

Resposta:
{
  "id": "or_xxxx",
  "charges": [
    {
      "id": "ch_xxxx",
      "status": "pending",
      "last_transaction": {
        "qr_code": "00020126...",
        "qr_code_url": "https://..."
      }
    }
  ]
}

GET /orders/{order_id}
# Obter status do pedido
```

#### Cobranças

```http
GET /charges/{charge_id}
# Obter detalhes da cobrança

POST /charges/{charge_id}/cancel
# Cancelar/estornar cobrança
```

### Webhooks

```http
POST /webhooks
# Criar assinatura de webhook

Corpo da Requisição:
{
  "url": "https://ebeef.com/webhooks/pagarme",
  "events": [
    "charge.paid",
    "charge.payment_failed",
    "charge.refunded",
    "order.paid",
    "order.closed"
  ]
}
```

**Exemplo de Payload Webhook (charge.paid):**

```json
{
  "id": "hook_xxx",
  "type": "charge.paid",
  "created_at": "2026-01-07T12:00:00Z",
  "data": {
    "id": "ch_xxxx",
    "status": "paid",
    "amount": 5000,
    "paid_at": "2026-01-07T12:00:00Z",
    "order": {
      "id": "or_xxxx"
    }
  }
}
```

---

## 3. API de Entregas Lalamove

**URL Base:** `https://rest.lalamove.com` (Produção)
**Sandbox:** `https://rest.sandbox.lalamove.com`

**Autenticação:** Assinatura HMAC-SHA256

### Endpoints Necessários

#### Cotações

```http
POST /v3/quotations
# Obter cotação de entrega

Corpo da Requisição:
{
  "serviceType": "MOTORCYCLE",
  "language": "pt_BR",
  "stops": [
    {
      "coordinates": {
        "lat": "-23.550520",
        "lng": "-46.633308"
      },
      "address": "Rua Augusta, 123 - São Paulo"
    },
    {
      "coordinates": {
        "lat": "-23.564987",
        "lng": "-46.652319"
      },
      "address": "Av. Paulista, 1000 - São Paulo"
    }
  ]
}

Resposta:
{
  "quotationId": "qt_xxxx",
  "stops": [...],
  "priceBreakdown": {
    "base": "15.00",
    "totalFee": "18.50",
    "currency": "BRL"
  },
  "distance": {
    "value": 5.2,
    "unit": "km"
  }
}
```

#### Pedidos

```http
POST /v3/orders
# Criar pedido de entrega

Corpo da Requisição:
{
  "quotationId": "qt_xxxx",
  "sender": {
    "stopId": "stop_1",
    "name": "ebeef",
    "phone": "+5511999999999"
  },
  "recipients": [
    {
      "stopId": "stop_2",
      "name": "Nome do Cliente",
      "phone": "+5511888888888",
      "remarks": "Apto 101"
    }
  ],
  "metadata": {
    "internalOrderId": "ebeef_pedido_123"
  }
}

Resposta:
{
  "orderId": "ord_xxxx",
  "status": "ASSIGNING_DRIVER",
  "shareLink": "https://..."
}

GET /v3/orders/{orderId}
# Obter status do pedido

Resposta:
{
  "orderId": "ord_xxxx",
  "status": "PICKED_UP",
  "driver": {
    "name": "Nome do Motorista",
    "phone": "+5511777777777",
    "plateNumber": "ABC1234"
  }
}

PUT /v3/orders/{orderId}/cancel
# Cancelar pedido
```

### Tipos de Serviço Disponíveis

- `MOTORCYCLE` - Moto
- `CAR` - Carro
- `VAN` - Van

### Fluxo de Status do Pedido

```
ASSIGNING_DRIVER → PICKED_UP → IN_TRANSIT → COMPLETED
        ↓
    CANCELLED / EXPIRED
```

### Webhooks

Registrar URL do webhook no Painel Lalamove.

**Eventos Webhook:**
- `DRIVER_ASSIGNED`
- `PICKED_UP`
- `COMPLETED`
- `CANCELLED`

---

## 4. API WhatsApp Business (Meta)

**URL Base:** `https://graph.facebook.com/v18.0`

**Autenticação:** Bearer Token

### Endpoints Necessários

#### Enviar Mensagem

```http
POST /{phone_number_id}/messages
# Enviar mensagem de texto

Corpo da Requisição:
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": {
    "body": "Olá, aqui é o ebeef!"
  }
}
```

#### Enviar Mensagem de Template

```http
POST /{phone_number_id}/messages
# Enviar mensagem template (confirmação de pedido, CSAT, etc.)

Corpo da Requisição:
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "confirmacao_pedido",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "PEDIDO123" },
          { "type": "text", "text": "R$ 150,00" }
        ]
      }
    ]
  }
}
```

#### Enviar Mensagem Interativa

```http
POST /{phone_number_id}/messages
# Enviar mensagem com botões

Corpo da Requisição:
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Avalie sua experiência:"
    },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "5_estrelas", "title": "Excelente" }},
        { "type": "reply", "reply": { "id": "3_estrelas", "title": "Bom" }},
        { "type": "reply", "reply": { "id": "1_estrela", "title": "Ruim" }}
      ]
    }
  }
}
```

#### Enviar para Grupo

```http
POST /{phone_number_id}/messages
# Enviar mensagem para grupo (para entregadores terceiros)

Corpo da Requisição:
{
  "messaging_product": "whatsapp",
  "to": "GROUP_JID",
  "type": "text",
  "text": {
    "body": "Nova entrega disponível!\n\nOrigem: Rua Augusta\nDestino: Av. Paulista\nValor: R$ 18,50\n\nResponda SIM para aceitar"
  }
}
```

### Configuração de Webhook

Registrar URL do webhook no Portal de Desenvolvedores Meta.

**Eventos Webhook:**
- `messages` - Mensagens recebidas
- `message_status` - Confirmações de entrega/leitura

**Exemplo de Payload Webhook:**

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "5511999999999",
                "type": "text",
                "text": { "body": "Quero fazer um pedido" },
                "timestamp": "1704628800"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## Diagramas de Sequência de Integração

### Fluxo de Criação de Pedido

```
Cliente          API WhatsApp       ebeef          API Bling
    │                  │               │                │
    │  Envia mensagem  │               │                │
    │─────────────────▶│               │                │
    │                  │  Webhook      │                │
    │                  │──────────────▶│                │
    │                  │               │ Buscar/Criar   │
    │                  │               │ Cliente        │
    │                  │               │───────────────▶│
    │                  │               │◀───────────────│
    │                  │               │                │
    │                  │               │ Criar Pedido   │
    │                  │               │───────────────▶│
    │                  │               │◀───────────────│
    │                  │ Enviar confirm│                │
    │                  │◀──────────────│                │
    │◀─────────────────│               │                │
```

### Fluxo de Pagamento

```
Cliente          ebeef          Pagar.me         Bling
    │               │               │               │
    │ Confirma ped  │               │               │
    │──────────────▶│               │               │
    │               │ Criar pedido  │               │
    │               │──────────────▶│               │
    │               │ QR Code PIX   │               │
    │               │◀──────────────│               │
    │ QR Code       │               │               │
    │◀──────────────│               │               │
    │               │               │               │
    │ Paga via banco│               │               │
    │──────────────────────────────▶│               │
    │               │               │               │
    │               │ charge.paid   │               │
    │               │◀──────────────│               │
    │               │               │               │
    │               │ Atualiza ped  │               │
    │               │──────────────────────────────▶│
    │               │               │               │
    │ Confirmação   │               │               │
    │◀──────────────│               │               │
```

### Fluxo de Entrega

```
ebeef         Lalamove       Grupo WhatsApp      Cliente
   │              │               │                 │
   │ Obter cotação│               │                 │
   │─────────────▶│               │                 │
   │ Cotação + ETA│               │                 │
   │◀─────────────│               │                 │
   │              │               │                 │
   │ Notificar grp│               │                 │
   │─────────────────────────────▶│                 │
   │              │               │                 │
   │              │   (aguarda terceiro)            │
   │              │               │                 │
   │  [Se não houver resposta no timeout]          │
   │              │               │                 │
   │ Criar pedido │               │                 │
   │─────────────▶│               │                 │
   │ Pedido criado│               │                 │
   │◀─────────────│               │                 │
   │              │               │                 │
   │   [Webhook motorista designado]               │
   │◀─────────────│               │                 │
   │              │               │                 │
   │ Info rastreio│               │                 │
   │───────────────────────────────────────────────▶│
   │              │               │                 │
   │   [Webhook entrega completa] │                 │
   │◀─────────────│               │                 │
   │              │               │                 │
   │ Pesquisa CSAT│               │                 │
   │───────────────────────────────────────────────▶│
```

---

## Tratamento de Erros

### Formato Padrão de Resposta de Erro

```typescript
interface ErroAPI {
  codigo: string;
  mensagem: string;
  servico: 'bling' | 'pagarme' | 'lalamove' | 'whatsapp';
  erroOriginal?: any;
  tentarNovamente: boolean;
}
```

### Estratégia de Retry

| Serviço | Max Tentativas | Backoff | Circuit Breaker |
|---------|----------------|---------|-----------------|
| Bling | 3 | Exponencial | 5 falhas / 60s |
| Pagar.me | 3 | Exponencial | 5 falhas / 60s |
| Lalamove | 3 | Exponencial | 5 falhas / 60s |
| WhatsApp | 5 | Linear | 10 falhas / 60s |

---

## Limites de Taxa (Rate Limits)

| Serviço | Limite | Janela |
|---------|--------|--------|
| Bling | 3 req/s | Por API key |
| Pagar.me | 100 req/s | Por API key |
| Lalamove | 100 req/s | Por conta |
| WhatsApp | 80 msg/s | Por número |

---

*Versão do Documento: 1.0*
*Última Atualização: 07/01/2026*
