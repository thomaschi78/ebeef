import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function OperatorDashboard() {
  const { token, authFetch } = useAuth();
  const [conversations, setConversations] = useState({});
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [inputText, setInputText] = useState('');
  const [copilotData, setCopilotData] = useState(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState('sugestoes');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize socket with auth token
  useEffect(() => {
    socketRef.current = io(API_BASE, {
      auth: { token: token || 'demo' },
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Use ref for selectedPhone to avoid dependency issues in socket listeners
  const selectedPhoneRef = useRef(selectedPhone);
  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  // Fetch copilot data
  const fetchCopilotData = useCallback(async (phone, message = '') => {
    setCopilotLoading(true);
    try {
      const response = await authFetch(
        `${API_BASE}/api/copilot/suggestions/${phone}?message=${encodeURIComponent(message)}`
      );
      const data = await response.json();
      setCopilotData(data);
      setCustomerNotes(data.customerInfo?.notes || '');
    } catch (err) {
      console.error('Erro ao buscar dados do copilot:', err);
    }
    setCopilotLoading(false);
  }, [authFetch]);

  // Fetch conversations on mount and setup socket listeners
  useEffect(() => {
    authFetch(`${API_BASE}/api/conversations`)
      .then((res) => res.json())
      .then((data) => setConversations(data))
      .catch((err) => console.error('Erro ao buscar conversas:', err));

    // Socket listeners
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('new_message', ({ from, message, mode, suggestions }) => {
      setConversations((prev) => {
        const newConvs = { ...prev };
        if (!newConvs[from]) newConvs[from] = { mode, messages: [] };
        newConvs[from].messages.push(message);
        newConvs[from].mode = mode;
        return newConvs;
      });

      if (suggestions) {
        setCopilotData((prev) => {
          if (prev && from === selectedPhoneRef.current) {
            return { ...prev, ...suggestions };
          }
          return prev;
        });
      }
    });

    socket.on('mode_change', ({ from, mode }) => {
      setConversations((prev) => {
        if (!prev[from]) return prev;
        return {
          ...prev,
          [from]: { ...prev[from], mode },
        };
      });
    });

    socket.on('suggestions_update', ({ phoneNumber, suggestions }) => {
      if (phoneNumber === selectedPhoneRef.current) {
        setCopilotData(suggestions);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('mode_change');
      socket.off('suggestions_update');
    };
  }, [authFetch]);

  // Fetch copilot data when phone changes
  const prevSelectedPhoneRef = useRef(null);
  useEffect(() => {
    if (selectedPhone && selectedPhone !== prevSelectedPhoneRef.current) {
      prevSelectedPhoneRef.current = selectedPhone;
      // Schedule the fetch for the next microtask to avoid setState cascade
      Promise.resolve().then(() => {
        if (selectedPhoneRef.current === selectedPhone) {
          fetchCopilotData(selectedPhone);
        }
      });
    }
  }, [selectedPhone, fetchCopilotData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedPhone, conversations]);

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedPhone) return;

    const messageText = inputText;
    setInputText('');

    // Add message to local state immediately for instant feedback
    const newMessage = {
      sender: 'operator',
      text: messageText,
      timestamp: Date.now(),
    };

    setConversations((prev) => {
      if (!prev[selectedPhone]) return prev;
      return {
        ...prev,
        [selectedPhone]: {
          ...prev[selectedPhone],
          messages: [...prev[selectedPhone].messages, newMessage],
        },
      };
    });

    try {
      await authFetch(`${API_BASE}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedPhone, text: messageText }),
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  const toggleMode = async (to, currentMode) => {
    const newMode = currentMode === 'AI' ? 'OPERATOR' : 'AI';
    try {
      const response = await authFetch(`${API_BASE}/api/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, mode: newMode }),
      });
      const data = await response.json();
      if (data.success) {
        // Update local state immediately
        setConversations((prev) => {
          if (!prev[to]) return prev;
          return {
            ...prev,
            [to]: { ...prev[to], mode: newMode },
          };
        });
      }
    } catch (err) {
      console.error('Erro ao trocar modo:', err);
    }
  };

  const applySuggestion = (text) => {
    setInputText(text);
  };

  const saveCustomerNotes = async () => {
    if (!selectedPhone) return;
    try {
      await authFetch(`${API_BASE}/api/copilot/customer/${selectedPhone}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: customerNotes }),
      });
      setEditingNotes(false);
      fetchCopilotData(selectedPhone);
    } catch (err) {
      console.error('Erro ao salvar anotações:', err);
    }
  };

  const refreshSuggestions = useCallback(() => {
    if (!selectedPhone) return;
    const conv = conversations[selectedPhone];
    const lastUserMessage = conv?.messages
      ?.filter((m) => m.sender === 'user')
      .pop();
    fetchCopilotData(selectedPhone, lastUserMessage?.text || '');
  }, [selectedPhone, conversations, fetchCopilotData]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const activeConv = selectedPhone ? conversations[selectedPhone] : null;

  const filteredConversations = Object.keys(conversations).filter((phone) => {
    const conv = conversations[phone];
    const name = conv.customer?.name || phone;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           phone.includes(searchTerm);
  });

  return (
    <div style={styles.container}>
      {/* Sidebar - WhatsApp Style */}
      <div style={styles.sidebar}>
        {/* Sidebar Header */}
        <div style={styles.sidebarHeader}>
          <div style={styles.headerLeft}>
            <img
              src="https://cdn.awsli.com.br/1572/1572983/logo/939b02027c.png"
              alt="ebeef"
              style={styles.logo}
            />
            <span style={styles.brandName}>ebeef</span>
          </div>
          <div style={styles.headerIcons}>
            <button style={styles.iconButton} title="Novo chat">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#54656f">
                <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <div style={styles.searchBox}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#54656f">
              <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 1 1 0-7.21 3.605 3.605 0 0 1 0 7.21z"/>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar ou começar uma nova conversa"
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div style={styles.conversationList}>
          {filteredConversations.length === 0 && (
            <p style={styles.emptyState}>Nenhuma conversa encontrada.</p>
          )}
          {filteredConversations.map((phone) => {
            const conv = conversations[phone];
            const lastMessage = conv.messages?.[conv.messages.length - 1];
            return (
              <div
                key={phone}
                onClick={() => setSelectedPhone(phone)}
                style={{
                  ...styles.conversationItem,
                  background: selectedPhone === phone ? '#f0f2f5' : 'white',
                }}
              >
                <div style={styles.convAvatar}>
                  <span style={styles.convAvatarText}>
                    {(conv.customer?.name || phone)[0].toUpperCase()}
                  </span>
                </div>
                <div style={styles.convContent}>
                  <div style={styles.convHeader}>
                    <span style={styles.convName}>
                      {conv.customer?.name || phone}
                    </span>
                    {lastMessage && (
                      <span style={styles.convTime}>
                        {formatTime(lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  <div style={styles.convPreview}>
                    <span style={styles.convLastMsg}>
                      {lastMessage?.sender !== 'user' && (
                        <svg viewBox="0 0 16 15" width="16" height="15" fill="#53bdeb" style={{ marginRight: 3 }}>
                          <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                        </svg>
                      )}
                      {lastMessage?.text.substring(0, 35)}
                      {lastMessage?.text.length > 35 ? '...' : ''}
                    </span>
                    <span
                      style={{
                        ...styles.modeBadge,
                        background: conv.mode === 'AI' ? '#25d366' : '#ff9800',
                      }}
                    >
                      {conv.mode === 'AI' ? 'IA' : 'Op'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area - WhatsApp Style */}
      <div style={styles.chatArea}>
        {selectedPhone ? (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}>
                <div style={styles.chatAvatar}>
                  <span style={styles.chatAvatarText}>
                    {(activeConv?.customer?.name || selectedPhone)[0].toUpperCase()}
                  </span>
                </div>
                <div style={styles.chatHeaderInfo}>
                  <h3 style={styles.chatTitle}>
                    {activeConv?.customer?.name || selectedPhone}
                  </h3>
                  <span style={styles.chatSubtitle}>
                    {activeConv?.customer?.name ? selectedPhone : 'online'}
                  </span>
                </div>
              </div>
              <div style={styles.chatHeaderRight}>
                <button
                  onClick={() => toggleMode(selectedPhone, activeConv?.mode)}
                  style={{
                    ...styles.modeToggle,
                    backgroundColor: activeConv?.mode === 'AI' ? '#25d366' : '#ff9800',
                  }}
                >
                  {activeConv?.mode === 'AI' ? 'Modo IA - Mudar para Operador' : 'Modo Operador - Mudar para IA'}
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div style={styles.messagesContainer}>
              {activeConv?.messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                const showDate = index === 0 ||
                  formatDate(activeConv.messages[index - 1]?.timestamp) !== formatDate(msg.timestamp);

                return (
                  <React.Fragment key={index}>
                    {showDate && (
                      <div style={styles.dateLabel}>
                        <span style={styles.dateLabelText}>{formatDate(msg.timestamp)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        ...styles.messageWrapper,
                        justifyContent: isUser ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageBubble,
                          background: isUser ? '#ffffff' : '#d9fdd3',
                          borderTopLeftRadius: isUser ? 0 : 8,
                          borderTopRightRadius: isUser ? 8 : 0,
                        }}
                      >
                        {!isUser && (
                          <div style={styles.senderLabel}>
                            {msg.sender === 'ai' ? 'IA' : msg.sender === 'operator' ? 'OPERADOR' : 'SISTEMA'}
                          </div>
                        )}
                        <span style={styles.messageText}>{msg.text}</span>
                        <span style={styles.messageTime}>
                          {formatTime(msg.timestamp)}
                          {!isUser && (
                            <svg viewBox="0 0 16 15" width="16" height="15" fill="#53bdeb" style={{ marginLeft: 3 }}>
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                            </svg>
                          )}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={styles.inputArea}>
              {activeConv?.mode === 'AI' && (
                <div style={styles.aiModeWarning}>
                  Modo IA ativo - Mude para Operador para responder manualmente
                </div>
              )}
              <div style={styles.inputContainer}>
                <button style={styles.emojiButton}>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#54656f">
                    <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026-.307-.131 5.218 6.063 5.551 6.066-.25 6.066-5.551 6.066-5.551-6.078 1.416-12.129 0-12.129 0zm11.363 1.108s-.669 1.959-5.051 1.959c-3.505 0-5.388-1.164-5.607-1.959 0 0 5.912 1.055 10.658 0zM11.804 1.011C5.609 1.011.978 6.033.978 12.228s4.826 10.761 11.021 10.761S23.02 18.423 23.02 12.228c.001-6.195-5.021-11.217-11.216-11.217zM12 21.354c-5.273 0-9.381-3.886-9.381-9.159s3.942-9.548 9.215-9.548 9.548 4.275 9.548 9.548c-.001 5.272-4.109 9.159-9.382 9.159zm3.108-9.751c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962z"/>
                  </svg>
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={
                    activeConv?.mode === 'AI'
                      ? 'Mude para modo Operador para responder...'
                      : 'Digite uma mensagem'
                  }
                  style={styles.messageInput}
                  disabled={activeConv?.mode === 'AI'}
                />
                <button
                  onClick={sendMessage}
                  disabled={activeConv?.mode === 'AI' || !inputText.trim()}
                  style={{
                    ...styles.sendButton,
                    opacity: activeConv?.mode === 'AI' || !inputText.trim() ? 0.5 : 1,
                  }}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
                    <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.noSelection}>
            <div style={styles.noSelectionContent}>
              <svg viewBox="0 0 303 172" width="250" fill="#dfe5e7">
                <path d="M229.565 160.229c32.647-12.996 56.263-44.201 57.313-81.674 1.328-47.391-36.013-88.084-83.404-89.413-3.476-.097-6.903.035-10.271.391-33.39 3.531-60.763 24.719-73.322 53.836-1.349 3.132-2.519 6.362-3.502 9.673a64.056 64.056 0 0 0-2.593 18.107c-.181 6.333.483 12.561 1.93 18.592-3.992 18.103-16.203 29.161-34.473 38.485-2.091 1.065-4.232 2.105-6.414 3.122-.125.058-.249.116-.374.174l6.793 4.553a177.536 177.536 0 0 0 10.611-4.801c1.869-.921 3.696-1.852 5.479-2.792 10.283 12.081 24.066 20.978 39.841 25.479 17.752 5.065 35.627 4.779 51.76 1.073a95.76 95.76 0 0 0 40.626-14.805z"/>
                <path d="M 184.053 106.503 c -7.12 -7.615 -10.106 -19.112 -8.462 -30.752 c 1.962 -13.908 10.783 -25.327 23.045 -31.725 z" opacity=".08"/>
              </svg>
              <img
                src="https://cdn.awsli.com.br/1572/1572983/logo/939b02027c.png"
                alt="ebeef"
                style={{ width: '120px', height: 'auto', marginBottom: '20px' }}
              />
              <h2 style={styles.noSelectionTitle}>ebeef WhatsApp</h2>
              <p style={styles.noSelectionText}>
                Selecione uma conversa para começar a atender
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Churrasqueiro Indica Panel */}
      <div style={styles.copilotPanel}>
        <div style={styles.copilotHeader}>
          <h3 style={styles.copilotTitle}>Churrasqueiro Indica</h3>
          {selectedPhone && (
            <button onClick={refreshSuggestions} style={styles.refreshButton} title="Atualizar sugestões">
              ↻
            </button>
          )}
        </div>

        {!selectedPhone ? (
          <div style={styles.copilotEmpty}>
            Selecione uma conversa para ver as indicações do churrasqueiro
          </div>
        ) : copilotLoading ? (
          <div style={styles.copilotLoading}>Carregando indicações...</div>
        ) : copilotData ? (
          <>
            {/* Tabs */}
            <div style={styles.tabContainer}>
              {[
                { id: 'sugestoes', label: 'Sugestões' },
                { id: 'cliente', label: 'Cliente' },
                { id: 'produtos', label: 'Produtos' },
                { id: 'promos', label: 'Promoções' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...styles.tab,
                    borderBottom: activeTab === tab.id ? '2px solid #25d366' : '2px solid transparent',
                    color: activeTab === tab.id ? '#25d366' : '#666',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={styles.tabContent}>
              {/* Sugestões Tab */}
              {activeTab === 'sugestoes' && (
                <div>
                  {/* Ações Rápidas */}
                  {copilotData.quickActions?.length > 0 && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>Ações Rápidas</h4>
                      {copilotData.quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => applySuggestion(action.action)}
                          style={styles.quickAction}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sugestões de Resposta */}
                  {copilotData.suggestions?.length > 0 && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>Respostas Sugeridas</h4>
                      {copilotData.suggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          style={styles.suggestionCard}
                          onClick={() => applySuggestion(suggestion.text)}
                        >
                          <div style={styles.suggestionBadge}>
                            {suggestion.type === 'ai' ? '🤖 IA' : `📝 ${suggestion.category}`}
                          </div>
                          <p style={styles.suggestionText}>{suggestion.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recomendações */}
                  {copilotData.recommendations?.length > 0 && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>Produtos Recomendados</h4>
                      {copilotData.recommendations.map((rec, idx) => (
                        <div key={idx} style={styles.recommendationCard}>
                          <div style={styles.recHeader}>
                            <span style={styles.recName}>{rec.name}</span>
                            <span style={styles.recPrice}>R${rec.price}</span>
                          </div>
                          <div style={styles.recReason}>{rec.reason}</div>
                          <button
                            onClick={() =>
                              applySuggestion(
                                `Eu recomendo nosso ${rec.name} por R$${rec.price}. ${rec.reason}`
                              )
                            }
                            style={styles.useRecButton}
                          >
                            Sugerir ao Cliente
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cliente Tab */}
              {activeTab === 'cliente' && (
                <div>
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Informações do Cliente</h4>
                    <div style={styles.customerInfo}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Nome:</span>
                        <span>{copilotData.customerInfo?.name || 'Desconhecido'}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Telefone:</span>
                        <span>{copilotData.customerInfo?.phone}</span>
                      </div>
                      {copilotData.customerInfo?.email && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Email:</span>
                          <span>{copilotData.customerInfo.email}</span>
                        </div>
                      )}
                      {copilotData.customerInfo?.birthdate && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Aniversário:</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {new Date(copilotData.customerInfo.birthdate).toLocaleDateString('pt-BR')}
                            {(() => {
                              const bday = new Date(copilotData.customerInfo.birthdate);
                              const today = new Date();
                              const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
                              const diffDays = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));
                              if (diffDays >= 0 && diffDays <= 7) {
                                return <span style={{ background: '#fff3e0', color: '#e65100', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>Aniversário em {diffDays === 0 ? 'HOJE!' : `${diffDays} dias`}</span>;
                              }
                              return null;
                            })()}
                          </span>
                        </div>
                      )}
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Status:</span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            background: copilotData.customerInfo?.isNew ? '#e3f2fd' : '#e8f5e9',
                          }}
                        >
                          {copilotData.customerInfo?.isNew ? 'Cliente Novo' : 'Cliente Fiel'}
                        </span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Total de Pedidos:</span>
                        <span>{copilotData.customerInfo?.totalOrders || 0}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Total Gasto:</span>
                        <span>R${copilotData.customerInfo?.totalSpent || '0,00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Endereços */}
                  {copilotData.customerInfo?.billingAddress && (() => {
                    const billing = copilotData.customerInfo.billingAddress;
                    const delivery = copilotData.customerInfo.deliveryAddress;
                    const sameAddress = delivery &&
                      billing.street === delivery.street &&
                      billing.number === delivery.number &&
                      billing.complement === delivery.complement &&
                      billing.neighborhood === delivery.neighborhood &&
                      billing.city === delivery.city &&
                      billing.state === delivery.state &&
                      billing.zipCode === delivery.zipCode;

                    return (
                      <>
                        <div style={styles.section}>
                          <h4 style={styles.sectionTitle}>
                            {sameAddress ? 'Endereço (Cobrança e Entrega)' : 'Endereço de Cobrança'}
                            {sameAddress && (
                              <span style={styles.sameAddressBadge}>Mesmo endereço</span>
                            )}
                          </h4>
                          <div style={styles.addressBox}>
                            <div>{billing.street}, {billing.number}</div>
                            {billing.complement && <div>{billing.complement}</div>}
                            <div>{billing.neighborhood}</div>
                            <div>{billing.city} - {billing.state}</div>
                            <div>CEP: {billing.zipCode}</div>
                          </div>
                        </div>

                        {/* Só mostra endereço de entrega se for diferente */}
                        {delivery && !sameAddress && (
                          <div style={styles.section}>
                            <h4 style={styles.sectionTitle}>Último Endereço de Entrega</h4>
                            <div style={styles.addressBox}>
                              <div>{delivery.street}, {delivery.number}</div>
                              {delivery.complement && <div>{delivery.complement}</div>}
                              <div>{delivery.neighborhood}</div>
                              <div>{delivery.city} - {delivery.state}</div>
                              <div>CEP: {delivery.zipCode}</div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Último Pedido */}
                  {copilotData.lastOrder && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>Último Pedido</h4>
                      <div style={styles.lastOrderBox}>
                        <div style={styles.orderHeader}>
                          <span style={styles.orderNumber}>{copilotData.lastOrder.orderNumber}</span>
                          <span style={{
                            ...styles.orderStatus,
                            background: copilotData.lastOrder.status === 'completed' ? '#e8f5e9' : '#fff3e0',
                            color: copilotData.lastOrder.status === 'completed' ? '#2e7d32' : '#e65100',
                          }}>
                            {copilotData.lastOrder.status === 'completed' ? 'Entregue' : copilotData.lastOrder.status}
                          </span>
                        </div>
                        <div style={styles.orderDate}>
                          {new Date(copilotData.lastOrder.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                        <div style={styles.orderItems}>
                          {copilotData.lastOrder.items?.map((item, idx) => (
                            <div key={idx} style={styles.orderItem}>
                              <span>{item.quantity}x {item.productName}</span>
                              <span>R${parseFloat(item.totalPrice).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div style={styles.orderTotal}>
                          <span>Total:</span>
                          <span>R${parseFloat(copilotData.lastOrder.amount).toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => {
                            const itemsList = copilotData.lastOrder.items?.map(i => `${i.quantity}x ${i.productName}`).join(', ');
                            applySuggestion(`Gostaria de repetir seu último pedido? ${itemsList} - Total: R$${parseFloat(copilotData.lastOrder.amount).toFixed(2)}`);
                          }}
                          style={styles.repeatOrderButton}
                        >
                          Repetir Pedido
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Anotações */}
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>
                      Anotações
                      <button
                        onClick={() => setEditingNotes(!editingNotes)}
                        style={styles.editButton}
                      >
                        {editingNotes ? 'Cancelar' : 'Editar'}
                      </button>
                    </h4>
                    {editingNotes ? (
                      <div>
                        <textarea
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          style={styles.notesTextarea}
                          placeholder="Adicione anotações sobre este cliente..."
                        />
                        <button onClick={saveCustomerNotes} style={styles.saveButton}>
                          Salvar Anotações
                        </button>
                      </div>
                    ) : (
                      <p style={styles.notesText}>
                        {copilotData.customerInfo?.notes || 'Nenhuma anotação ainda'}
                      </p>
                    )}
                  </div>

                  {/* Histórico de Compras */}
                  {copilotData.purchaseHistory?.length > 0 && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>Compras Frequentes</h4>
                      {copilotData.purchaseHistory.map((item, idx) => (
                        <div key={idx} style={styles.historyItem}>
                          <span>{item.productName}</span>
                          <span style={styles.historyCount}>
                            x{item.totalQuantity} ({item.timesOrdered} pedidos)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Produtos Tab */}
              {activeTab === 'produtos' && (
                <div>
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Produtos Disponíveis</h4>
                    <p style={styles.hint}>
                      Clique em um produto para inserir na mensagem
                    </p>
                    {copilotData.recommendations?.map((product, idx) => (
                      <div key={idx} style={styles.productCard}>
                        <div style={styles.productName}>{product.name}</div>
                        <div style={styles.productPrice}>R${product.price}</div>
                        <button
                          onClick={() =>
                            applySuggestion(
                              `Nosso ${product.name} está disponível por R$${product.price}. Gostaria de fazer um pedido?`
                            )
                          }
                          style={styles.insertButton}
                        >
                          Inserir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Promoções Tab */}
              {activeTab === 'promos' && (
                <div>
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Promoções Ativas</h4>
                    {copilotData.promotions?.length > 0 ? (
                      copilotData.promotions.map((promo, idx) => (
                        <div key={idx} style={styles.promoCard}>
                          <div style={styles.promoHeader}>
                            <span style={styles.promoName}>{promo.name}</span>
                            <span style={styles.promoCode}>{promo.code}</span>
                          </div>
                          <p style={styles.promoDesc}>{promo.description}</p>
                          <div style={styles.promoDiscount}>
                            {promo.discountType === 'porcentagem'
                              ? `${promo.discountValue}% de desconto`
                              : `R$${promo.discountValue} de desconto`}
                          </div>
                          <button
                            onClick={() =>
                              applySuggestion(
                                `Ótima notícia! ${promo.description} Use o código ${promo.code} no checkout!`
                              )
                            }
                            style={styles.sharePromoButton}
                          >
                            Compartilhar Promoção
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={styles.emptyState}>Nenhuma promoção ativa</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    background: '#f0f2f5',
    overflow: 'hidden',
  },
  // Sidebar styles - WhatsApp Style
  sidebar: {
    flex: '0 0 30%',
    minWidth: '280px',
    maxWidth: '420px',
    background: 'white',
    borderRight: '1px solid #e9edef',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '10px 16px',
    background: '#f0f2f5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '59px',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  brandName: {
    fontWeight: '600',
    fontSize: '18px',
    color: '#111b21',
    letterSpacing: '-0.5px',
  },
  headerIcons: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  searchContainer: {
    padding: '8px 12px',
    background: '#f0f2f5',
    flexShrink: 0,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    borderRadius: '8px',
    padding: '0 12px',
    height: '35px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    marginLeft: '20px',
    fontSize: '14px',
    color: '#111b21',
  },
  conversationList: {
    flex: '1 1 auto',
    overflowY: 'auto',
    minHeight: 0,
  },
  conversationItem: {
    display: 'flex',
    padding: '10px 15px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f2f5',
    transition: 'background 0.1s',
  },
  convAvatar: {
    width: '49px',
    height: '49px',
    borderRadius: '50%',
    background: '#dfe5e7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '15px',
    flexShrink: 0,
  },
  convAvatarText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: '20px',
  },
  convContent: {
    flex: 1,
    minWidth: 0,
  },
  convHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  convName: {
    fontWeight: '400',
    fontSize: '17px',
    color: '#111b21',
  },
  convTime: {
    fontSize: '12px',
    color: '#667781',
  },
  convPreview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convLastMsg: {
    fontSize: '14px',
    color: '#667781',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
  },
  modeBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    color: 'white',
    fontWeight: '500',
    flexShrink: 0,
  },
  emptyState: {
    padding: '20px',
    color: '#667781',
    textAlign: 'center',
    fontSize: '14px',
  },
  // Chat area styles - WhatsApp Style
  chatArea: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    background: '#efeae2',
    backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAG1BMVEXMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMyknDlFAAAACXRSTlMNDQ0NDQ0NDQ2l1vEOAAAASklEQVQ4y2NgGAVDFQgJMXFBAQMDAwMTJ5qYM5OoqAAjkMHExIomJsTExMgIYzAyMKKJMQGFGJCFQAwmBjQxJiYuBiYGZJMGqYkDAEJ3BhVTUqV1AAAAAElFTkSuQmCC")',
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '10px 16px',
    background: '#f0f2f5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '59px',
    borderLeft: '1px solid #e9edef',
    flexShrink: 0,
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  chatAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#dfe5e7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '15px',
  },
  chatAvatarText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: '18px',
  },
  chatHeaderInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  chatTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '400',
    color: '#111b21',
  },
  chatSubtitle: {
    fontSize: '13px',
    color: '#667781',
  },
  chatHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  modeToggle: {
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: '1 1 auto',
    padding: '20px clamp(20px, 5%, 60px)',
    overflowY: 'auto',
    minHeight: 0,
  },
  dateLabel: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  dateLabelText: {
    background: '#fff',
    padding: '5px 12px',
    borderRadius: '7px',
    fontSize: '12px',
    color: '#54656f',
    boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
  },
  messageWrapper: {
    display: 'flex',
    marginBottom: '2px',
  },
  messageBubble: {
    maxWidth: '65%',
    padding: '6px 7px 8px 9px',
    borderRadius: '8px',
    fontSize: '14.2px',
    lineHeight: '19px',
    color: '#111b21',
    boxShadow: '0 1px 0.5px rgba(0,0,0,.13)',
    position: 'relative',
  },
  senderLabel: {
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '2px',
    color: '#25d366',
  },
  messageText: {
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: '11px',
    color: '#667781',
    float: 'right',
    marginLeft: '10px',
    marginTop: '5px',
    display: 'flex',
    alignItems: 'center',
  },
  inputArea: {
    background: '#f0f2f5',
    padding: '10px 16px',
    borderLeft: '1px solid #e9edef',
    flexShrink: 0,
  },
  aiModeWarning: {
    background: '#fff3cd',
    color: '#856404',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '10px',
    textAlign: 'center',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  emojiButton: {
    background: 'none',
    border: 'none',
    padding: '5px',
    cursor: 'pointer',
  },
  messageInput: {
    flex: 1,
    padding: '9px 12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '15px',
    outline: 'none',
    background: 'white',
  },
  sendButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#25d366',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
    borderBottom: '6px solid #25d366',
  },
  noSelectionContent: {
    textAlign: 'center',
  },
  noSelectionTitle: {
    fontSize: '32px',
    fontWeight: '300',
    color: '#41525d',
    marginBottom: '10px',
  },
  noSelectionText: {
    fontSize: '14px',
    color: '#667781',
  },
  // Copilot panel styles
  copilotPanel: {
    flex: '0 0 25%',
    minWidth: '260px',
    maxWidth: '380px',
    background: 'white',
    borderLeft: '1px solid #e9edef',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  copilotHeader: {
    padding: '16px 20px',
    background: '#f0f2f5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '59px',
    flexShrink: 0,
  },
  copilotTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '500',
    color: '#25d366',
  },
  refreshButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#54656f',
    padding: '5px',
  },
  copilotEmpty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#667781',
    fontSize: '14px',
  },
  copilotLoading: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#667781',
    fontSize: '14px',
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e9edef',
    background: '#f0f2f5',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '14px 8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  tabContent: {
    flex: '1 1 auto',
    overflowY: 'auto',
    padding: '15px',
    minHeight: 0,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#111b21',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAction: {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    marginBottom: '8px',
    background: '#dcf8c6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    color: '#111b21',
    fontWeight: '400',
  },
  suggestionCard: {
    padding: '12px',
    marginBottom: '8px',
    background: '#f0f2f5',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  suggestionBadge: {
    fontSize: '11px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#667781',
  },
  suggestionText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '1.4',
    color: '#111b21',
  },
  recommendationCard: {
    padding: '12px',
    marginBottom: '8px',
    background: '#fff8e1',
    borderRadius: '8px',
    border: '1px solid #ffe082',
  },
  recHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  recName: {
    fontWeight: '500',
    fontSize: '14px',
    color: '#111b21',
  },
  recPrice: {
    fontWeight: '600',
    color: '#25d366',
  },
  recReason: {
    fontSize: '12px',
    color: '#667781',
    marginBottom: '8px',
  },
  useRecButton: {
    width: '100%',
    padding: '8px',
    background: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  customerInfo: {
    background: '#f0f2f5',
    borderRadius: '8px',
    padding: '12px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e9edef',
    fontSize: '13px',
    color: '#111b21',
  },
  infoLabel: {
    fontWeight: '500',
    color: '#667781',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
  },
  editButton: {
    background: 'none',
    border: 'none',
    color: '#25d366',
    cursor: 'pointer',
    fontSize: '12px',
  },
  notesTextarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e9edef',
    fontSize: '13px',
    resize: 'vertical',
    marginBottom: '8px',
    boxSizing: 'border-box',
  },
  saveButton: {
    width: '100%',
    padding: '10px',
    background: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  notesText: {
    fontSize: '13px',
    color: '#667781',
    fontStyle: 'italic',
    margin: 0,
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#f0f2f5',
    borderRadius: '6px',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#111b21',
  },
  historyCount: {
    color: '#667781',
    fontSize: '12px',
  },
  addressBox: {
    background: '#f0f2f5',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    color: '#111b21',
    lineHeight: '1.5',
  },
  sameAddressBadge: {
    background: '#e8f5e9',
    color: '#2e7d32',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '500',
    marginLeft: '8px',
  },
  lastOrderBox: {
    background: '#f0f2f5',
    borderRadius: '8px',
    padding: '12px',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  orderNumber: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111b21',
  },
  orderStatus: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
  },
  orderDate: {
    fontSize: '12px',
    color: '#667781',
    marginBottom: '10px',
  },
  orderItems: {
    borderTop: '1px solid #e9edef',
    borderBottom: '1px solid #e9edef',
    padding: '8px 0',
    marginBottom: '8px',
  },
  orderItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#111b21',
    padding: '4px 0',
  },
  orderTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: '600',
    color: '#111b21',
    marginBottom: '12px',
  },
  repeatOrderButton: {
    width: '100%',
    padding: '10px',
    background: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  hint: {
    fontSize: '12px',
    color: '#667781',
    marginBottom: '12px',
  },
  productCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#f0f2f5',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  productName: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#111b21',
  },
  productPrice: {
    fontSize: '13px',
    color: '#25d366',
    fontWeight: '600',
  },
  insertButton: {
    padding: '6px 12px',
    background: '#25d366',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
  },
  promoCard: {
    padding: '12px',
    marginBottom: '10px',
    background: '#dcf8c6',
    borderRadius: '8px',
  },
  promoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  promoName: {
    fontWeight: '500',
    fontSize: '14px',
    color: '#111b21',
  },
  promoCode: {
    background: '#25d366',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  promoDesc: {
    fontSize: '12px',
    color: '#667781',
    margin: '0 0 8px 0',
  },
  promoDiscount: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#25d366',
    marginBottom: '10px',
  },
  sharePromoButton: {
    width: '100%',
    padding: '8px',
    background: '#128c7e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
};

export default OperatorDashboard;
