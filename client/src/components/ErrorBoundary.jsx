/**
 * React Error Boundary
 * Catches JavaScript errors in child components and displays fallback UI
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });

    // Log error to console (in production, send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error tracking service like Sentry
    // if (window.Sentry) {
    //   Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <img
              src="https://cdn.awsli.com.br/1572/1572983/logo/939b02027c.png"
              alt="ebeef"
              style={styles.logo}
            />
            <h1 style={styles.title}>Ops! Algo deu errado</h1>
            <p style={styles.message}>
              Ocorreu um erro inesperado. Por favor, tente recarregar a página.
            </p>

            <div style={styles.buttons}>
              <button onClick={this.handleReload} style={styles.primaryButton}>
                Recarregar Página
              </button>
              <button onClick={this.handleReset} style={styles.secondaryButton}>
                Tentar Novamente
              </button>
            </div>

            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Detalhes do erro (desenvolvimento)</summary>
                <pre style={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
    padding: '20px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '500px',
  },
  logo: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    borderRadius: '16px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111b21',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '16px',
    color: '#667781',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: 'white',
    background: '#25d366',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#667781',
    background: 'white',
    border: '1px solid #e9edef',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  details: {
    marginTop: '32px',
    textAlign: 'left',
    background: '#fff5f5',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #fed7d7',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '500',
    color: '#c53030',
    marginBottom: '8px',
  },
  errorStack: {
    fontSize: '12px',
    color: '#742a2a',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

export default ErrorBoundary;
