import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LoginPage from './components/LoginPage';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOperators from './pages/admin/AdminOperators';
import AdminProducts from './pages/admin/AdminProducts';
import AdminPromotions from './pages/admin/AdminPromotions';
import AdminAnalytics from './pages/admin/AdminAnalytics';

// Loading component
function LoadingScreen() {
  return (
    <div style={styles.loading}>
      <img
        src="https://cdn.awsli.com.br/1572/1572983/logo/939b02027c.png"
        alt="ebeef"
        style={styles.loadingLogo}
      />
      <p style={styles.loadingText}>Carregando...</p>
    </div>
  );
}

// Protected route wrapper for authenticated routes
function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, loading, isDemo, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated && !isDemo) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/operador" replace />;
  }

  return children;
}

// Public route (redirect to dashboard if already authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated, loading, isDemo } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated || isDemo) {
    return <Navigate to="/operador" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Operator routes */}
      <Route
        path="/operador"
        element={
          <ProtectedRoute>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="operadores" element={<AdminOperators />} />
        <Route path="produtos" element={<AdminProducts />} />
        <Route path="promocoes" element={<AdminPromotions />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/operador" replace />} />
      <Route path="*" element={<Navigate to="/operador" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <div className="App">
            <AppRoutes />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

const styles = {
  loading: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
  },
  loadingLogo: {
    width: '80px',
    height: '80px',
    objectFit: 'contain',
    borderRadius: '16px',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '16px',
    color: '#667781',
  },
};

export default App;
