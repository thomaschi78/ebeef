import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';

function AdminAnalytics() {
  const { authFetch } = useAuth();
  const [analytics, setAnalytics] = useState({
    conversations: {
      total: 0,
      byStatus: {},
      byMode: {},
    },
    messages: {
      total: 0,
      bySender: {},
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    },
    customers: {
      total: 0,
      withPurchases: 0,
      newThisMonth: 0,
    },
    products: {
      total: 0,
      active: 0,
      lowStock: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await authFetch(`/api/admin/analytics?range=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Erro ao carregar analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}20` }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <div style={styles.statInfo}>
        <span style={styles.statValue}>{loading ? '...' : value.toLocaleString('pt-BR')}</span>
        <span style={styles.statTitle}>{title}</span>
        {subtitle && <span style={styles.statSubtitle}>{subtitle}</span>}
      </div>
    </div>
  );

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Analytics</h2>
          <p style={styles.subtitle}>Métricas e estatísticas do sistema</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={styles.rangeSelect}
        >
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mês</option>
          <option value="year">Este ano</option>
          <option value="all">Todo período</option>
        </select>
      </div>

      {/* Conversations Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Conversas</h3>
        <div style={styles.statsGrid}>
          <StatCard
            title="Total de Conversas"
            value={analytics.conversations.total}
            icon="💬"
            color="#25d366"
          />
          <StatCard
            title="Conversas Ativas"
            value={analytics.conversations.byStatus?.active || 0}
            icon="🟢"
            color="#128c7e"
          />
          <StatCard
            title="Modo IA"
            value={analytics.conversations.byMode?.AI || 0}
            icon="🤖"
            color="#9b59b6"
          />
          <StatCard
            title="Modo Operador"
            value={analytics.conversations.byMode?.OPERATOR || 0}
            icon="👤"
            color="#3498db"
          />
        </div>
      </div>

      {/* Messages Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Mensagens</h3>
        <div style={styles.statsGrid}>
          <StatCard
            title="Total de Mensagens"
            value={analytics.messages.total}
            icon="📨"
            color="#4a90a4"
          />
          <StatCard
            title="Mensagens Hoje"
            value={analytics.messages.today}
            icon="📅"
            color="#e74c3c"
          />
          <StatCard
            title="Esta Semana"
            value={analytics.messages.thisWeek}
            icon="📆"
            color="#f39c12"
          />
          <StatCard
            title="Este Mês"
            value={analytics.messages.thisMonth}
            icon="🗓️"
            color="#1abc9c"
          />
        </div>
      </div>

      {/* Message Distribution */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Distribuição de Mensagens por Origem</h3>
        <div style={styles.distributionCard}>
          <div style={styles.barChart}>
            {Object.entries(analytics.messages.bySender || {}).map(([sender, count]) => {
              const total = analytics.messages.total || 1;
              const percentage = Math.round((count / total) * 100);
              const colors = {
                user: '#3498db',
                ai: '#9b59b6',
                operator: '#25d366',
                system: '#95a5a6',
              };
              const labels = {
                user: 'Cliente',
                ai: 'IA',
                operator: 'Operador',
                system: 'Sistema',
              };
              return (
                <div key={sender} style={styles.barItem}>
                  <div style={styles.barLabel}>
                    <span>{labels[sender] || sender}</span>
                    <span>{count.toLocaleString('pt-BR')} ({percentage}%)</span>
                  </div>
                  <div style={styles.barBg}>
                    <div
                      style={{
                        ...styles.barFill,
                        width: `${percentage}%`,
                        background: colors[sender] || '#666',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customers & Products */}
      <div style={styles.twoColumns}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Clientes</h3>
          <div style={styles.miniStatsGrid}>
            <StatCard
              title="Total de Clientes"
              value={analytics.customers.total}
              icon="👥"
              color="#3498db"
            />
            <StatCard
              title="Com Compras"
              value={analytics.customers.withPurchases}
              icon="🛒"
              color="#25d366"
            />
            <StatCard
              title="Novos Este Mês"
              value={analytics.customers.newThisMonth}
              icon="🆕"
              color="#e74c3c"
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Produtos</h3>
          <div style={styles.miniStatsGrid}>
            <StatCard
              title="Total de Produtos"
              value={analytics.products.total}
              icon="🥩"
              color="#9b59b6"
            />
            <StatCard
              title="Produtos Ativos"
              value={analytics.products.active}
              icon="✅"
              color="#25d366"
            />
            <StatCard
              title="Estoque Baixo"
              value={analytics.products.lowStock}
              subtitle="< 10 unidades"
              icon="⚠️"
              color="#f39c12"
            />
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Indicadores de Performance</h3>
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <span style={styles.kpiValue}>
              {analytics.messages.total > 0
                ? Math.round((analytics.messages.bySender?.ai || 0) / analytics.messages.total * 100)
                : 0}%
            </span>
            <span style={styles.kpiLabel}>Taxa de Automação IA</span>
            <span style={styles.kpiDescription}>Mensagens respondidas pela IA</span>
          </div>
          <div style={styles.kpiCard}>
            <span style={styles.kpiValue}>
              {analytics.customers.total > 0
                ? Math.round(analytics.customers.withPurchases / analytics.customers.total * 100)
                : 0}%
            </span>
            <span style={styles.kpiLabel}>Taxa de Conversão</span>
            <span style={styles.kpiDescription}>Clientes que realizaram compras</span>
          </div>
          <div style={styles.kpiCard}>
            <span style={styles.kpiValue}>
              {analytics.conversations.total > 0
                ? Math.round(analytics.messages.total / analytics.conversations.total)
                : 0}
            </span>
            <span style={styles.kpiLabel}>Média Msgs/Conversa</span>
            <span style={styles.kpiDescription}>Mensagens por conversa</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  rangeSelect: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    background: '#fff',
    minWidth: '150px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  miniStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  statCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statTitle: {
    fontSize: '13px',
    color: '#666',
  },
  statSubtitle: {
    fontSize: '11px',
    color: '#999',
  },
  distributionCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  barItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  barLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#333',
  },
  barBg: {
    height: '12px',
    background: '#f0f0f0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  kpiCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  kpiValue: {
    display: 'block',
    fontSize: '36px',
    fontWeight: '700',
    color: '#25d366',
    marginBottom: '8px',
  },
  kpiLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '4px',
  },
  kpiDescription: {
    fontSize: '12px',
    color: '#999',
  },
};

export default AdminAnalytics;
