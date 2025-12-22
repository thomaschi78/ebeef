/**
 * Authentication Context
 * Manages user authentication state and token handling
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Use ref to avoid circular dependencies in useEffect
  const refreshTokenRef = useRef(refreshToken);
  const tokenRef = useRef(token);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
    tokenRef.current = token;
  }, [refreshToken, token]);

  // Clear auth state (no API call)
  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setIsDemo(false);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

  // Logout with API call
  const logout = useCallback(async () => {
    try {
      const currentToken = tokenRef.current;
      const currentRefreshToken = refreshTokenRef.current;
      if (currentToken && currentRefreshToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearAuth();
  }, [clearAuth]);

  // Refresh token
  const refreshAuthToken = useCallback(async () => {
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken) {
      clearAuth();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        localStorage.setItem('token', data.token);
        return data.token;
      } else {
        clearAuth();
        return null;
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const currentToken = tokenRef.current;

      if (!currentToken) {
        // Try demo login automatically
        try {
          const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: '', password: '' }),
          });
          const data = await response.json();

          if (data.mode === 'demo') {
            setUser(data.user);
            setIsDemo(true);
            setToken(data.token);
          }
        } catch (err) {
          console.error('Failed to check demo mode:', err);
        }
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setIsDemo(data.isDemo);
        } else {
          // Token invalid, try refresh
          await refreshAuthToken();
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        clearAuth();
      }
      setLoading(false);
    };

    verifyAuth();
  }, [refreshAuthToken, clearAuth]);

  // Login
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha no login');
      }

      setUser(data.user);
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      setIsDemo(data.mode === 'demo');

      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Register
  const register = async (email, password, name) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha no cadastro');
      }

      setUser(data.user);
      setToken(data.token);
      setRefreshToken(data.refreshToken);

      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Get auth header for API requests
  const getAuthHeader = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  // Authenticated fetch wrapper
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...options.headers,
        ...getAuthHeader(),
      };

      let response = await fetch(url, { ...options, headers });

      // If unauthorized, try to refresh token
      if (response.status === 401 && refreshTokenRef.current) {
        const newToken = await refreshAuthToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, { ...options, headers });
        }
      }

      return response;
    },
    [getAuthHeader, refreshAuthToken]
  );

  const value = {
    user,
    token,
    isDemo,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    getAuthHeader,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
