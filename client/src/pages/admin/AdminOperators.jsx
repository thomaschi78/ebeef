import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';

function AdminOperators() {
  const { authFetch } = useAuth();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
  });
  const [error, setError] = useState('');

  const loadOperators = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/operators');
      if (response.ok) {
        const data = await response.json();
        setOperators(data);
      }
    } catch (err) {
      console.error('Erro ao carregar operadores:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingOperator
        ? `/api/admin/operators/${editingOperator.id}`
        : '/api/auth/register';
      const method = editingOperator ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadOperators();
        closeModal();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao salvar operador');
      }
    } catch {
      setError('Erro ao salvar operador');
    }
  };

  const handleToggleStatus = async (operator) => {
    try {
      const response = await authFetch(`/api/admin/operators/${operator.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !operator.isActive }),
      });

      if (response.ok) {
        await loadOperators();
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const openModal = (operator = null) => {
    if (operator) {
      setEditingOperator(operator);
      setFormData({
        name: operator.name,
        email: operator.email,
        password: '',
        role: operator.role,
      });
    } else {
      setEditingOperator(null);
      setFormData({ name: '', email: '', password: '', role: 'operator' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOperator(null);
    setFormData({ name: '', email: '', password: '', role: 'operator' });
    setError('');
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Operadores</h2>
          <p style={styles.subtitle}>Gerenciar operadores do sistema</p>
        </div>
        <button onClick={() => openModal()} style={styles.addBtn}>
          + Novo Operador
        </button>
      </div>

      {/* Operators Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Função</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Último Login</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={styles.tdCenter}>Carregando...</td>
              </tr>
            ) : operators.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.tdCenter}>Nenhum operador encontrado</td>
              </tr>
            ) : (
              operators.map((operator) => (
                <tr key={operator.id}>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <div style={styles.avatar}>
                        {operator.name.charAt(0).toUpperCase()}
                      </div>
                      {operator.name}
                    </div>
                  </td>
                  <td style={styles.td}>{operator.email}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: operator.role === 'admin' ? '#9b59b620' : '#25d36620',
                      color: operator.role === 'admin' ? '#9b59b6' : '#25d366',
                    }}>
                      {operator.role === 'admin' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      background: operator.isActive ? '#25d36620' : '#ff475720',
                      color: operator.isActive ? '#25d366' : '#ff4757',
                    }}>
                      {operator.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {operator.lastLoginAt
                      ? new Date(operator.lastLoginAt).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => openModal(operator)}
                        style={styles.actionBtn}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleStatus(operator)}
                        style={styles.actionBtn}
                        title={operator.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {operator.isActive ? '🔒' : '🔓'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingOperator ? 'Editar Operador' : 'Novo Operador'}
            </h3>

            <form onSubmit={handleSubmit}>
              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.formGroup}>
                <label style={styles.label}>Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Senha {editingOperator && '(deixe vazio para manter)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={styles.input}
                  {...(!editingOperator && { required: true, minLength: 8 })}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Função</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={styles.input}
                >
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingOperator ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  addBtn: {
    background: '#25d366',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  tableContainer: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    background: '#f8f9fa',
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
  },
  tdCenter: {
    padding: '40px',
    textAlign: 'center',
    color: '#666',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#25d36620',
    color: '#25d366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '400px',
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1a1a2e',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  error: {
    background: '#ff475720',
    color: '#ff4757',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  cancelBtn: {
    background: '#f0f0f0',
    color: '#666',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitBtn: {
    background: '#25d366',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default AdminOperators;
