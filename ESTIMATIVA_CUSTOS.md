# ebeef - Estimativa de Custos, Recursos e Tempo

## Resumo Executivo

| Item | Estimativa |
|------|------------|
| **Duração Total** | 16-20 semanas (4-5 meses) |
| **Equipe Mínima** | 2-3 desenvolvedores |
| **Custo Desenvolvimento** | R$ 180.000 - R$ 280.000 |
| **Custo Infraestrutura (mensal)** | R$ 1.500 - R$ 3.500 |
| **Custo APIs (mensal)** | R$ 500 - R$ 2.000 |

---

## 1. Escopo por Módulo

### Complexidade e Esforço Estimado

| Módulo | Complexidade | Pontos de Função | Semanas (1 dev) |
|--------|--------------|------------------|-----------------|
| **Autenticação e Sessões** | Média | 40 | 2-3 |
| **Cliente + CRM** | Alta | 120 | 5-6 |
| **Pedido** | Alta | 100 | 4-5 |
| **Pagamento** | Média | 60 | 2-3 |
| **Entrega** | Alta | 80 | 3-4 |
| **Analytics** | Média-Alta | 70 | 3-4 |
| **Base de Conhecimento** | Média | 50 | 2-3 |
| **Infraestrutura/DevOps** | Média | 40 | 2-3 |
| **Integrações (Bling, Pagar.me, Lalamove, WhatsApp)** | Alta | 100 | 4-5 |
| **Portal Vendedor (Frontend)** | Alta | 80 | 4-5 |
| **Painel Admin (Frontend)** | Média | 50 | 2-3 |
| **Testes e QA** | - | - | 3-4 |
| **TOTAL** | - | ~790 | **36-48 semanas** |

**Com equipe de 2-3 devs paralelos:** 16-20 semanas

---

## 2. Faseamento Detalhado

### Fase 1: Fundação e MVP (Semanas 1-6)

**Objetivo:** Sistema funcional básico de pedidos

| Entrega | Descrição | Esforço |
|---------|-----------|---------|
| Setup Infraestrutura | Docker, PostgreSQL, Redis, CI/CD | 1 semana |
| Autenticação | Login, JWT, perfis básicos | 1.5 semanas |
| Integração Bling | Produtos, estoque, pedidos | 2 semanas |
| Integração Pagar.me | PIX, webhooks de pagamento | 1.5 semanas |
| WhatsApp Básico | Receber/enviar mensagens | 1 semana |

**Recursos:** 2 desenvolvedores backend
**Custo Fase 1:** R$ 40.000 - R$ 55.000

---

### Fase 2: Fluxo Completo + CRM (Semanas 7-12)

**Objetivo:** Ciclo completo do pedido + visão do cliente

| Entrega | Descrição | Esforço |
|---------|-----------|---------|
| Portal Vendedor (Frontend) | Interface unificada de atendimento | 2.5 semanas |
| CRM Integrado | Perfil 360°, segmentação, LTV | 2 semanas |
| Motor de Sugestões | Cross-sell, upsell, promoções | 1.5 semanas |
| Gestão de Promoções | Descontos por validade | 1 semana |
| Recompra Inteligente | Histórico + matching de peso | 1 semana |

**Recursos:** 2 desenvolvedores (1 backend, 1 fullstack)
**Custo Fase 2:** R$ 50.000 - R$ 70.000

---

### Fase 3: Entregas + Automação (Semanas 13-16)

**Objetivo:** Automação de entregas e handover

| Entrega | Descrição | Esforço |
|---------|-----------|---------|
| Integração Lalamove | Cotação, criação de pedidos | 1.5 semanas |
| Grupo Terceiros WhatsApp | Notificações, aceite de entregas | 1 semana |
| Handover Automático | Pagamento → Entrega sem intervenção | 1 semana |
| Rastreamento | Status em tempo real para cliente | 1 semana |
| CSAT Automático | Pesquisa pós-entrega | 0.5 semana |

**Recursos:** 2 desenvolvedores
**Custo Fase 3:** R$ 35.000 - R$ 50.000

---

### Fase 4: Analytics + IA (Semanas 17-20)

**Objetivo:** Métricas operacionais e atendimento inteligente

| Entrega | Descrição | Esforço |
|---------|-----------|---------|
| Analytics Dashboard | TAT, handover, ticket médio | 2 semanas |
| Alertas Operacionais | Fila, SLA, anomalias | 1 semana |
| Agente IA | Atendimento automatizado básico | 2 semanas |
| Base de Conhecimento | Receitas, dicas, harmonizações | 1.5 semanas |
| Painel Admin | Gestão de conteúdo, configurações | 1.5 semanas |

**Recursos:** 2-3 desenvolvedores
**Custo Fase 4:** R$ 55.000 - R$ 75.000

---

## 3. Equipe Necessária

### Composição Recomendada

| Função | Quantidade | Senioridade | Custo Mensal (CLT) | Custo Mensal (PJ) |
|--------|------------|-------------|-------------------|-------------------|
| **Tech Lead / Backend Sênior** | 1 | Sênior | R$ 18.000 - R$ 25.000 | R$ 20.000 - R$ 30.000 |
| **Desenvolvedor Backend** | 1 | Pleno | R$ 10.000 - R$ 15.000 | R$ 12.000 - R$ 18.000 |
| **Desenvolvedor Fullstack** | 1 | Pleno | R$ 10.000 - R$ 15.000 | R$ 12.000 - R$ 18.000 |
| **DevOps (parcial)** | 0.5 | Pleno | R$ 6.000 - R$ 9.000 | R$ 7.000 - R$ 11.000 |
| **Product Owner (parcial)** | 0.25 | - | R$ 4.000 - R$ 6.000 | - |

**Custo Mensal Total da Equipe:** R$ 48.000 - R$ 70.000

### Habilidades Técnicas Necessárias

```
BACKEND (obrigatório):
├── Node.js + TypeScript
├── PostgreSQL
├── Redis
├── REST APIs
├── Webhooks
└── Integrações de terceiros

FRONTEND (obrigatório):
├── React ou Vue.js
├── TypeScript
├── Design responsivo
└── WebSockets (para tempo real)

DEVOPS (necessário):
├── Docker
├── CI/CD (GitHub Actions, etc.)
├── Cloud (AWS, GCP ou Azure)
└── Monitoramento (Grafana, etc.)

DESEJÁVEL:
├── Experiência com ERPs (Bling)
├── Gateways de pagamento (Pagar.me)
├── WhatsApp Business API
└── IA/LLM (para agente de atendimento)
```

---

## 4. Custos de Infraestrutura (Mensal)

### Ambiente de Produção

| Componente | Serviço Sugerido | Custo Mensal |
|------------|------------------|--------------|
| **Servidor de Aplicação** | AWS EC2 t3.medium ou equivalente | R$ 300 - R$ 500 |
| **Banco de Dados** | AWS RDS PostgreSQL ou DigitalOcean | R$ 200 - R$ 400 |
| **Cache (Redis)** | AWS ElastiCache ou Redis Cloud | R$ 100 - R$ 250 |
| **Fila de Mensagens** | Incluso no Redis ou SQS | R$ 50 - R$ 100 |
| **Storage (Backups, Mídias)** | AWS S3 | R$ 50 - R$ 150 |
| **CDN** | CloudFlare (grátis) ou AWS CloudFront | R$ 0 - R$ 100 |
| **Monitoramento** | Grafana Cloud, Datadog | R$ 100 - R$ 300 |
| **SSL/Domínio** | Let's Encrypt + Route53 | R$ 20 - R$ 50 |
| **Logs** | CloudWatch ou equivalente | R$ 50 - R$ 100 |

**Subtotal Infraestrutura:** R$ 870 - R$ 1.950/mês

### Ambiente de Desenvolvimento/Staging

| Componente | Custo Mensal |
|------------|--------------|
| Servidor menor (t3.small) | R$ 150 - R$ 250 |
| Banco de dados menor | R$ 100 - R$ 200 |
| Redis menor | R$ 50 - R$ 100 |

**Subtotal Dev/Staging:** R$ 300 - R$ 550/mês

**TOTAL INFRAESTRUTURA:** R$ 1.170 - R$ 2.500/mês

---

## 5. Custos de APIs e Serviços Externos (Mensal)

### APIs de Terceiros

| Serviço | Modelo de Cobrança | Estimativa Mensal |
|---------|-------------------|-------------------|
| **Pagar.me** | % por transação (1.99% - 3.99%) | R$ 0 (custo por venda) |
| **WhatsApp Business API** | Por conversa (~R$ 0.30 - 0.50/conversa) | R$ 300 - R$ 1.000 |
| **Lalamove** | Por entrega (variável) | R$ 0 (custo por entrega) |
| **Bling** | Plano mensal | R$ 100 - R$ 300 |
| **OpenAI/Claude API** (para IA) | Por tokens | R$ 100 - R$ 500 |
| **Twilio (backup WhatsApp)** | Por mensagem | R$ 0 - R$ 200 |

**TOTAL APIs:** R$ 500 - R$ 2.000/mês

*Nota: Pagar.me e Lalamove são custos por transação, repassados ao preço do produto*

---

## 6. Resumo de Custos

### Custos de Desenvolvimento (One-time)

| Fase | Duração | Custo |
|------|---------|-------|
| Fase 1: Fundação | 6 semanas | R$ 40.000 - R$ 55.000 |
| Fase 2: CRM + Portal | 6 semanas | R$ 50.000 - R$ 70.000 |
| Fase 3: Entregas | 4 semanas | R$ 35.000 - R$ 50.000 |
| Fase 4: Analytics + IA | 4 semanas | R$ 55.000 - R$ 75.000 |
| **TOTAL DESENVOLVIMENTO** | **20 semanas** | **R$ 180.000 - R$ 250.000** |

*Adicionar 10-20% para contingências:* **R$ 200.000 - R$ 300.000**

### Custos Recorrentes (Mensal)

| Item | Custo Mensal |
|------|--------------|
| Infraestrutura | R$ 1.170 - R$ 2.500 |
| APIs e serviços | R$ 500 - R$ 2.000 |
| Manutenção (0.5 dev) | R$ 6.000 - R$ 9.000 |
| **TOTAL RECORRENTE** | **R$ 7.670 - R$ 13.500/mês** |

---

## 7. Cronograma Visual

```
                    MÊS 1         MÊS 2         MÊS 3         MÊS 4         MÊS 5
                    ─────         ─────         ─────         ─────         ─────
FASE 1              ████████████████████████
Fundação            Setup │ Auth │ Bling │ Pagar.me │ WhatsApp

FASE 2                            ████████████████████████████
CRM + Portal                      Portal Vendedor │ CRM │ Sugestões │ Promoções

FASE 3                                                  ████████████████
Entregas                                                Lalamove │ Handover │ CSAT

FASE 4                                                              ████████████████
Analytics + IA                                                      Analytics │ IA │ Admin

                    ─────────────────────────────────────────────────────────────────
MARCOS              │         │              │                   │              │
                    v         v              v                   v              v
                  Setup    MVP básico    Portal Vendedor        Automação      Sistema
                  Infra    funcional     + CRM             completa       completo
```

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Integração Bling complexa** | Média | Alto | Começar integração cedo, ter alternativas |
| **WhatsApp API limitações** | Média | Alto | Testar early, ter Twilio como backup |
| **Escopo creep** | Alta | Médio | Product Owner dedicado, sprints fechados |
| **Dependência de terceiros** | Média | Alto | Circuit breakers, fallbacks |
| **Performance com volume** | Baixa | Alto | Load testing desde Fase 2 |
| **Turnover de equipe** | Média | Alto | Documentação, pair programming |

---

## 9. Alternativas de Contratação

### Opção A: Equipe Interna (CLT)

```
Prós:                              Contras:
✓ Conhecimento retido              ✗ Custo fixo alto
✓ Comprometimento                  ✗ Tempo de contratação
✓ Flexibilidade de escopo          ✗ Encargos trabalhistas
```

**Custo total (5 meses):** R$ 240.000 - R$ 350.000

### Opção B: Squad Terceirizado (Software House)

```
Prós:                              Contras:
✓ Início imediato                  ✗ Custo por hora alto
✓ Experiência prévia               ✗ Menos flexibilidade
✓ Sem encargos trabalhistas        ✗ Conhecimento não fica
```

**Custo total (5 meses):** R$ 200.000 - R$ 350.000

### Opção C: Híbrido (1 interno + terceiros)

```
Prós:                              Contras:
✓ Conhecimento interno             ✗ Coordenação complexa
✓ Flexibilidade                    ✗ Comunicação
✓ Custo balanceado
```

**Custo total (5 meses):** R$ 180.000 - R$ 280.000 *(Recomendado)*

---

## 10. ROI Estimado

### Ganhos Esperados

| Benefício | Economia/Ganho Mensal |
|-----------|----------------------|
| **Redução tempo Vendedor** (20 min/pedido × 50 pedidos/dia) | R$ 5.000 - R$ 8.000 |
| **Aumento ticket médio** (+15% com upselling) | R$ 8.000 - R$ 15.000 |
| **Redução perdas validade** (-50% produtos vencidos) | R$ 2.000 - R$ 5.000 |
| **Capacidade adicional** (+50% pedidos sem aumentar equipe) | R$ 10.000 - R$ 20.000 |
| **TOTAL GANHO MENSAL** | **R$ 25.000 - R$ 48.000** |

### Payback

```
Investimento inicial:     R$ 200.000 - R$ 280.000
Ganho mensal:             R$ 25.000 - R$ 48.000
Custo mensal operação:    R$ 7.670 - R$ 13.500
Ganho líquido mensal:     R$ 17.330 - R$ 34.500

PAYBACK ESTIMADO:         6 - 12 meses
```

---

## 11. Próximos Passos para Iniciar

1. [ ] **Definir modelo de contratação** (interno, terceiro, híbrido)
2. [ ] **Obter credenciais de API** (Bling, Pagar.me, WhatsApp, Lalamove)
3. [ ] **Configurar ambiente de desenvolvimento**
4. [ ] **Definir prioridades do MVP** (quais features são essenciais?)
5. [ ] **Contratar/alocar equipe**
6. [ ] **Kickoff do projeto**

---

*Documento: Estimativa de Custos e Recursos*
*Versão: 1.0*
*Data: 07/01/2026*
