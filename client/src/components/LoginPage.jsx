/**
 * Login Page Component
 * Handles operator authentication
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, register, isDemo } = useAuth();
  const [mode, setMode] = useState('login'); // login or register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        result = await register(email, password, name);
      }

      if (!result.success) {
        setError(result.error);
      }
    } catch {
      setError('Erro ao conectar com o servidor');
    }

    setLoading(false);
  };

  // Demo mode notice
  if (isDemo) {
    return null; // Will be handled by App.jsx
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img
            src="https://cdn.awsli.com.br/1572/1572983/logo/939b02027c.png"
            alt="ebeef"
            style={styles.logo}
          />
          <h1 style={styles.brand}>ebeef</h1>
          <p style={styles.subtitle}>WhatsApp Operator Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                style={styles.input}
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operador@ebeef.com.br"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Sua senha'}
              style={styles.input}
              required
              minLength={mode === 'register' ? 8 : undefined}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading
              ? 'Carregando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Criar Conta'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={styles.toggleContainer}>
          {mode === 'login' ? (
            <span>
              Não tem conta?{' '}
              <button
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
                style={styles.toggleButton}
              >
                Criar conta
              </button>
            </span>
          ) : (
            <span>
              Já tem conta?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                style={styles.toggleButton}
              >
                Fazer login
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #128c7e 0%, #25d366 100%)',
  },
  loginBox: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    borderRadius: '16px',
    marginBottom: '16px',
  },
  brand: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#111b21',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#667781',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111b21',
  },
  input: {
    padding: '12px 16px',
    fontSize: '15px',
    border: '1px solid #e9edef',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: '#25d366',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  toggleContainer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: '#667781',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#25d366',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
};
