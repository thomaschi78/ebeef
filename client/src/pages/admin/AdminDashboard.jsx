import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';

function AdminDashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    aiResponses: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const statCards = [
    { label: 'Conversas Totais', value: stats.totalConversations, icon: '💬', color: '#25d366' },
    { label: 'Conversas Ativas', value: stats.activeConversations, icon: '🟢', color: '#128c7e' },
    { label: 'Mensagens Totais', value: stats.totalMessages, icon: '📨', color: '#4a90a4' },
    { label: 'Respostas IA', value: stats.aiResponses, icon: '🤖', color: '#9b59b6' },
  ];

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>Dashboard</h2>
        <p style={styles.subtitle}>Visão geral do sistema</p>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <div key={index} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${stat.color}20` }}>
              <span style={{ fontSize: '24px' }}>{stat.icon}</span>
            </div>
            <div style={styles.statInfo}>
              <span style={styles.statValue}>
                {loading ? '...' : stat.value.toLocaleString('pt-BR')}
              </span>
              <span style={styles.statLabel}>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Ações Rápidas</h3>
        <div style={styles.actionsGrid}>
          <a href="/admin/operadores" style={styles.actionCard}>
            <span style={styles.actionIcon}>👥</span>
            <span style={styles.actionLabel}>Gerenciar Operadores</span>
          </a>
          <a href="/admin/produtos" style={styles.actionCard}>
            <span style={styles.actionIcon}>🥩</span>
            <span style={styles.actionLabel}>Gerenciar Produtos</span>
          </a>
          <a href="/admin/promocoes" style={styles.actionCard}>
            <span style={styles.actionIcon}>🏷️</span>
            <span style={styles.actionLabel}>Gerenciar Promoções</span>
          </a>
          <a href="/operador" style={styles.actionCard}>
            <span style={styles.actionIcon}>💬</span>
            <span style={styles.actionLabel}>Painel do Operador</span>
          </a>
        </div>
      </div>

      {/* System Status */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Status do Sistema</h3>
        <div style={styles.statusCard}>
          <div style={styles.statusItem}>
            <span style={styles.statusDot}></span>
            <span>Servidor API: Online</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusDot}></span>
            <span>Banco de Dados: Conectado</span>
          </div>
          <div style={styles.statusItem}>
            <span style={{ ...styles.statusDot, background: stats.aiAvailable ? '#25d366' : '#ffc107' }}></span>
            <span>IA OpenAI: {stats.aiAvailable ? 'Ativo' : 'Desativado'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
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
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: '13px',
    color: '#666',
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
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  actionCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: '#1a1a2e',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  actionIcon: {
    fontSize: '24px',
  },
  actionLabel: {
    fontSize: '14px',
    fontWeight: '500',
  },
  statusCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    fontSize: '14px',
    color: '#333',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#25d366',
  },
};

export default AdminDashboard;
