import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';

function AdminPromotions() {
  const { authFetch } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    maxDiscount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    isActive: true,
  });
  const [error, setError] = useState('');

  const loadPromotions = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/promotions');
      if (response.ok) {
        const data = await response.json();
        setPromotions(data);
      }
    } catch (err) {
      console.error('Erro ao carregar promoções:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingPromotion
        ? `/api/admin/promotions/${editingPromotion.id}`
        : '/api/admin/promotions';
      const method = editingPromotion ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discountValue: parseFloat(formData.discountValue),
          minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        }),
      });

      if (response.ok) {
        await loadPromotions();
        closeModal();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao salvar promoção');
      }
    } catch {
      setError('Erro ao salvar promoção');
    }
  };

  const handleDelete = async (promotion) => {
    if (!confirm(`Tem certeza que deseja excluir "${promotion.name}"?`)) return;

    try {
      const response = await authFetch(`/api/admin/promotions/${promotion.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPromotions();
      }
    } catch (err) {
      console.error('Erro ao excluir promoção:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const isExpired = (promotion) => {
    return new Date(promotion.validUntil) < new Date();
  };

  const openModal = (promotion = null) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setFormData({
        code: promotion.code,
        name: promotion.name,
        description: promotion.description,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue.toString(),
        minPurchase: promotion.minPurchase?.toString() || '',
        maxDiscount: promotion.maxDiscount?.toString() || '',
        validFrom: formatDateInput(promotion.validFrom),
        validUntil: formatDateInput(promotion.validUntil),
        usageLimit: promotion.usageLimit?.toString() || '',
        isActive: promotion.isActive,
      });
    } else {
      setEditingPromotion(null);
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minPurchase: '',
        maxDiscount: '',
        validFrom: today,
        validUntil: nextMonth,
        usageLimit: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    setError('');
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Promoções</h2>
          <p style={styles.subtitle}>Gerenciar cupons e ofertas</p>
        </div>
        <button onClick={() => openModal()} style={styles.addBtn}>
          + Nova Promoção
        </button>
      </div>

      {/* Promotions List */}
      <div style={styles.promotionsList}>
        {loading ? (
          <div style={styles.emptyState}>Carregando...</div>
        ) : promotions.length === 0 ? (
          <div style={styles.emptyState}>Nenhuma promoção cadastrada</div>
        ) : (
          promotions.map((promotion) => (
            <div
              key={promotion.id}
              style={{
                ...styles.promotionCard,
                opacity: isExpired(promotion) ? 0.6 : 1,
              }}
            >
              <div style={styles.promotionHeader}>
                <div style={styles.codeContainer}>
                  <span style={styles.code}>{promotion.code}</span>
                  <span style={{
                    ...styles.badge,
                    background: promotion.isActive && !isExpired(promotion) ? '#25d36620' : '#ff475720',
                    color: promotion.isActive && !isExpired(promotion) ? '#25d366' : '#ff4757',
                  }}>
                    {isExpired(promotion) ? 'Expirado' : promotion.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div style={styles.actions}>
                  <button onClick={() => openModal(promotion)} style={styles.actionBtn} title="Editar">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(promotion)} style={styles.actionBtn} title="Excluir">
                    🗑️
                  </button>
                </div>
              </div>

              <h3 style={styles.promotionName}>{promotion.name}</h3>
              <p style={styles.promotionDescription}>{promotion.description}</p>

              <div style={styles.promotionDetails}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Desconto</span>
                  <span style={styles.detailValue}>
                    {promotion.discountType === 'percentage'
                      ? `${promotion.discountValue}%`
                      : `R$ ${parseFloat(promotion.discountValue).toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Validade</span>
                  <span style={styles.detailValue}>
                    {formatDate(promotion.validFrom)} - {formatDate(promotion.validUntil)}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Uso</span>
                  <span style={styles.detailValue}>
                    {promotion.usageCount} / {promotion.usageLimit || '∞'}
                  </span>
                </div>
              </div>

              {promotion.minPurchase && (
                <div style={styles.minPurchase}>
                  Mínimo: R$ {parseFloat(promotion.minPurchase).toFixed(2).replace('.', ',')}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingPromotion ? 'Editar Promoção' : 'Nova Promoção'}
            </h3>

            <form onSubmit={handleSubmit}>
              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Código do Cupom</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={styles.input}
                    placeholder="Ex: BEMVINDO10"
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    style={styles.input}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nome da Promoção</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Desconto</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    style={styles.input}
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Valor {formData.discountType === 'percentage' ? '(%)' : '(R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Compra Mínima (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                    style={styles.input}
                    placeholder="Opcional"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Desconto Máximo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    style={styles.input}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Válido De</label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Válido Até</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Limite de Uso</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  style={styles.input}
                  placeholder="Deixe vazio para ilimitado"
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editingPromotion ? 'Salvar' : 'Criar'}
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
  promotionsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
    background: '#fff',
    borderRadius: '12px',
  },
  promotionCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  promotionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  codeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  code: {
    background: '#f0f0f0',
    padding: '6px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
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
  promotionName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  promotionDescription: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 16px 0',
    lineHeight: '1.4',
  },
  promotionDetails: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '11px',
    color: '#999',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  minPurchase: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0',
    fontSize: '12px',
    color: '#666',
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
    width: '500px',
    maxWidth: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1a1a2e',
  },
  formGroup: {
    marginBottom: '16px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '16px',
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

export default AdminPromotions;
