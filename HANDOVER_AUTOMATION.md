# ebeef - Estratégia de Automação do Handover

## Problema Atual

O handover de pedidos da confirmação de pagamento para a equipe de entrega é feito **manualmente**. Isso gera:

- **Atrasos** no processamento de pedidos
- **Erros humanos** na comunicação
- **Falta de visibilidade** no status do pedido
- **Dependência** de membros específicos da equipe
- **Experiência inconsistente** do cliente

---

## Opções de Automação

### Opção A: Arquitetura Orientada a Eventos (Recomendada para MVP)

Uma abordagem leve e confiável usando webhooks e filas de mensagens.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HANDOVER ORIENTADO A EVENTOS                          │
└─────────────────────────────────────────────────────────────────────────┘

  Pagar.me              Fila de Mensagens           Serviço de Entrega
      │                         │                             │
      │  webhook charge.paid    │                             │
      │────────────────────────▶│                             │
      │                         │                             │
      │                         │  evento PAGAMENTO_CONFIRMADO│
      │                         │────────────────────────────▶│
      │                         │                             │
      │                         │                             │ 1. Atualizar status Bling
      │                         │                             │ 2. Adicionar à fila separação
      │                         │                             │ 3. Calcular cotação Lalamove
      │                         │                             │ 4. Notificar grupo terceiros
      │                         │                             │
      │                         │  PEDIDO_PRONTO_COLETA       │
      │                         │◀────────────────────────────│
      │                         │                             │
```

**Componentes:**

1. **Receptor de Webhooks**
   - Recebe eventos `charge.paid` do Pagar.me
   - Valida assinatura do webhook
   - Publica na fila de mensagens

2. **Fila de Mensagens (Redis/BullMQ)**
   - Garante entrega confiável de eventos
   - Trata retentativas e dead-letter queue
   - Fornece visibilidade do status da fila

3. **Worker de Entrega**
   - Consome eventos de pagamento
   - Orquestra o workflow de entrega
   - Atualiza status do pedido no Bling

**Implementação:**

```typescript
// tratador-webhooks.ts
async function tratarWebhookPagamento(payload: WebhookPagarme) {
  if (payload.type !== 'charge.paid') return;

  await filaPagamentos.add('pagamento-confirmado', {
    pedidoId: payload.data.order.id,
    cobrancaId: payload.data.id,
    valor: payload.data.amount,
    pagoEm: payload.data.paid_at,
  });
}

// worker-entrega.ts
filaPagamentos.process('pagamento-confirmado', async (job) => {
  const { pedidoId } = job.data;

  // 1. Obter detalhes do pedido
  const pedido = await servicoPedido.obterPorPagamentoId(pedidoId);

  // 2. Atualizar status no Bling
  await servicoBling.atualizarStatusPedido(pedido.blingPedidoId, 'PAGO');

  // 3. Adicionar à fila de separação
  await filaSeparacao.add('separar-pedido', {
    pedidoId: pedido.id,
    prioridade: pedido.ehExpresso ? 1 : 5
  });

  // 4. Obter cotação de entrega
  const cotacao = await servicoLalamove.obterCotacao(
    pedido.origem,
    pedido.entrega.endereco
  );

  // 5. PRINCIPAL: Notificar grupo de entregadores terceiros via WhatsApp
  await servicoWhatsapp.enviarParaGrupo(
    ID_GRUPO_ENTREGA,
    formatarOfertaEntrega(pedido, cotacao)
  );

  // 6. Iniciar timeout - se terceiro não aceitar, usar Lalamove como FALLBACK
  await filaTimeoutEntrega.add(
    'verificar-aceite-entrega',
    { pedidoId: pedido.id, cotacaoId: cotacao.quotationId },
    { delay: 15 * 60 * 1000 } // 15 minutos para terceiro aceitar
  );

  // Se timeout expirar sem aceite de terceiro:
  // → servicoLalamove.criarPedido(cotacao.quotationId) // FALLBACK
});
```

**Prós:**
- Simples de implementar
- Confiável com fila de mensagens
- Fácil de monitorar e debugar
- Pode começar com automação básica

**Contras:**
- Workflow linear
- Adaptabilidade limitada
- Requer tratamento manual de exceções

---

### Opção B: Orquestração por Agente IA (Estado Futuro)

Um agente inteligente que gerencia o processo de entrega com consciência de contexto.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ORQUESTRAÇÃO POR AGENTE IA                            │
└─────────────────────────────────────────────────────────────────────────┘

  Evento Pagamento           Agente IA                   Sistemas Externos
      │                         │                              │
      │  Pagamento confirmado   │                              │
      │────────────────────────▶│                              │
      │                         │                              │
      │                         │ Analisar contexto do pedido  │
      │                         │ - Histórico do cliente       │
      │                         │ - Local de entrega           │
      │                         │ - Horário                    │
      │                         │ - Fila atual                 │
      │                         │                              │
      │                         │ Tomar decisões inteligentes  │
      │                         │ - Atribuição de prioridade   │
      │                         │ - Seleção método entrega     │
      │                         │ - Comunicação proativa       │
      │                         │                              │
      │                         │────────────────────────────▶ │
      │                         │        Executar tarefas      │
      │                         │◀──────────────────────────── │
      │                         │                              │
      │                         │ Tratar exceções              │
      │                         │ - Escalar se necessário      │
      │                         │ - Ajustar estratégia         │
      │                         │                              │
```

**Capacidades:**

1. **Tomada de Decisão Consciente do Contexto**
   - Considerar histórico do cliente (cliente recorrente? VIP?)
   - Avaliar complexidade da entrega
   - Considerar capacidade operacional atual

2. **Roteamento Inteligente**
   - Prever disponibilidade de terceiros
   - Otimizar entre terceiros vs Lalamove
   - Considerar trade-offs custo vs velocidade

3. **Comunicação Proativa**
   - Antecipar perguntas do cliente
   - Enviar atualizações preventivas
   - Tratar atrasos com elegância

4. **Tratamento de Exceções**
   - Detectar anomalias
   - Auto-retry com estratégias diferentes
   - Escalar para humanos quando necessário

**Abordagem de Implementação:**

```typescript
// agente-entrega.ts
class AgenteEntrega {
  async tratarPagamentoConfirmado(evento: EventoPagamento) {
    const contexto = await this.construirContexto(evento);

    // IA decide a estratégia de entrega
    const estrategia = await this.decidirEstrategia(contexto);

    // Executar a estratégia
    const resultado = await this.executarEstrategia(estrategia, contexto);

    // Aprender com o resultado
    await this.registrarResultado(contexto, resultado);
  }

  private async construirContexto(evento: EventoPagamento): Promise<ContextoEntrega> {
    const [pedido, cliente, estoque, statusFila] = await Promise.all([
      this.servicoPedido.obter(evento.pedidoId),
      this.servicoCliente.obter(evento.clienteId),
      this.servicoEstoque.obterDisponibilidade(evento.pedidoId),
      this.servicoSeparacao.obterStatusFila(),
    ]);

    return {
      pedido,
      cliente,
      estoque,
      statusFila,
      horario: new Date().getHours(),
      diaSemana: new Date().getDay(),
    };
  }

  private async decidirEstrategia(contexto: ContextoEntrega): Promise<Estrategia> {
    // Tomada de decisão com IA
    // Pode usar Claude ou outro LLM para raciocínio complexo

    const fatores = {
      ehVIP: contexto.cliente.totalPedidos > 10,
      ehExpresso: contexto.pedido.ehExpresso,
      entregaComplexa: this.ehLocalComplexo(contexto.pedido.entrega),
      cargaFila: contexto.statusFila.pendentes > 20 ? 'alta' : 'normal',
      janelaHorario: this.obterJanelaHorario(contexto.horario),
    };

    return this.seletorEstrategia.selecionar(fatores);
  }
}
```

**Prós:**
- Inteligente e adaptável
- Trata bem casos extremos
- Melhora com o tempo
- Melhor experiência do cliente

**Contras:**
- Mais complexo de implementar
- Requer infraestrutura de IA
- Custo operacional mais alto

---

## Caminho de Implementação Recomendado

### Fase 1: Automação Básica (Semana 1-2)

```
Webhook Pagamento → Fila → Worker Entrega
```

- Implementar receptor de webhook Pagar.me
- Configurar Redis + BullMQ
- Criar worker básico de entrega
- Adicionar notificações WhatsApp para equipe

### Fase 2: Workflow Aprimorado (Semana 3-4)

```
Pagamento → Fila → Worker → Cotação Lalamove → Grupo WhatsApp Terceiros (PRINCIPAL)
                                                        │
                                                   Timeout?
                                                        │
                                                        ▼
                                                   Lalamove (FALLBACK)
```

- Integrar API de cotação Lalamove (para referência de preço)
- Implementar notificações grupo WhatsApp de terceiros (opção principal)
- Adicionar fallback para Lalamove quando não há terceiros disponíveis
- Construir painel admin para monitoramento

### Fase 3: Roteamento Inteligente (Semana 5-6)

```
Pagamento → Fila → Roteador Inteligente → Terceiros (PRINCIPAL)
                                                │
                                          Indisponível?
                                                │
                                                ▼
                                          Lalamove (FALLBACK)
```

- Adicionar lógica de decisão baseada em:
  - Horário do dia (terceiros mais disponíveis em certos horários)
  - Padrões históricos de disponibilidade de terceiros
  - Zona de entrega
  - Valor do pedido
- Implementar rastreamento de custos (terceiros vs Lalamove)

### Fase 4: Agente IA (Futuro)

```
Pagamento → Agente IA → Orquestração Inteligente
```

- Implementar agente baseado em Claude
- Treinar com dados históricos
- Adicionar aprendizado contínuo
- Habilitar exceções em linguagem natural

---

## Máquina de Estados do Workflow

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
              ┌──────────┐                                    │
              │AGUARDANDO│                                    │
              │PAGAMENTO │                                    │
              └────┬─────┘                                    │
                   │                                          │
                   │ pagamento.confirmado                     │
                   ▼                                          │
              ┌──────────┐                                    │
              │   PAGO   │                                    │
              └────┬─────┘                                    │
                   │                                          │
                   │ auto-disparo (sem etapa manual!)         │
                   ▼                                          │
              ┌──────────┐                                    │
              │SEPARANDO │──────────────────────────────┐     │
              └────┬─────┘                              │     │
                   │                                    │     │
                   │ separacao.completa                 │     │
                   ▼                                    │     │
              ┌──────────┐                              │     │
              │  PRONTO  │                              │     │
              │   PARA   │                              │     │
              │ ENTREGA  │                              │     │
              └────┬─────┘                              │     │
                   │                                    │     │
     ┌─────────────┴─────────────┐                     │     │
     ▼                           ▼                     │     │
┌──────────┐              ┌──────────┐                │     │
│ TERCEIRO │              │ LALAMOVE │                │     │
│DESIGNADO │◀─PRINCIPAL   │DESIGNADO │◀─FALLBACK     │     │
└────┬─────┘              └────┬─────┘                │     │
     │                         │                       │     │
     └──────────┬──────────────┘                       │     │
                │                                      │     │
                │ coleta.confirmada                    │     │
                ▼                                      │     │
           ┌──────────┐                               │     │
           │ EM ROTA  │                               │     │
           │   DE     │                               │     │
           │ ENTREGA  │                               │     │
           └────┬─────┘                               │     │
                │                                      │     │
                │ entrega.completa                     │     │
                ▼                                      │     │
           ┌──────────┐                               │     │
           │ ENTREGUE │                               │     │
           └────┬─────┘                               │     │
                │                                      │     │
                │ auto-disparo                         │     │
                ▼                                      │     │
           ┌──────────┐                               │     │
           │ PESQUISA │                               │     │
           │   CSAT   │                               │     │
           │ ENVIADA  │                               │     │
           └──────────┘                               │     │
                                                       │     │
                                    exceção/cancelar   │     │
                                         ┌─────────────┘     │
                                         ▼                   │
                                    ┌──────────┐             │
                                    │ EXCEÇÃO  │─────────────┘
                                    └──────────┘   retry
```

---

## Pontos de Integração

### Mapeamento de Status Bling

| Status ebeef | Código Bling | Nome Status Bling |
|--------------|--------------|-------------------|
| AGUARDANDO_PAGAMENTO | 6 | Em aberto |
| PAGO | 9 | Em andamento |
| SEPARANDO | 9 | Em andamento |
| PRONTO_PARA_ENTREGA | 15 | Pronto para envio |
| EM_ROTA | 15 | Pronto para envio |
| ENTREGUE | 9 | Atendido |
| CANCELADO | 12 | Cancelado |

### Schema do Banco para Rastreamento de Handover

```sql
CREATE TABLE handovers_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  status_origem VARCHAR(50) NOT NULL,
  status_destino VARCHAR(50) NOT NULL,
  disparado_por VARCHAR(50) NOT NULL, -- 'webhook', 'manual', 'agente', 'timeout'
  evento_disparo JSONB,
  executado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duracao_ms INTEGER,
  sucesso BOOLEAN NOT NULL,
  mensagem_erro TEXT,
  metadados JSONB
);

CREATE INDEX idx_handovers_pedido ON handovers_pedido(pedido_id);
CREATE INDEX idx_handovers_status ON handovers_pedido(status_origem, status_destino);
CREATE INDEX idx_handovers_tempo ON handovers_pedido(executado_em);
```

---

## Monitoramento e Alertas

### Métricas Chave

| Métrica | Meta | Limite para Alerta |
|---------|------|-------------------|
| Latência do handover | < 30s | > 2min |
| Profundidade da fila | < 50 | > 100 |
| Handovers com falha | 0 | > 3/hora |
| Taxa aceite terceiros | > 70% | < 50% |
| Uso do Lalamove (fallback) | < 30% | > 50% |

### Componentes do Dashboard

1. **Visão em Tempo Real da Fila**
   - Pedidos aguardando separação
   - Pedidos aguardando designação de entrega
   - Pedidos em trânsito

2. **Performance do Handover**
   - Tempo médio por estágio
   - Identificação de gargalos
   - Tendências de taxa de erro

3. **Analytics de Entrega**
   - Divisão terceiros (principal) vs Lalamove (fallback)
   - Custo por entrega: terceiros vs Lalamove
   - Tempos de resposta de aceite dos terceiros
   - Taxa de uso do fallback Lalamove

---

*Versão do Documento: 1.0*
*Última Atualização: 07/01/2026*
