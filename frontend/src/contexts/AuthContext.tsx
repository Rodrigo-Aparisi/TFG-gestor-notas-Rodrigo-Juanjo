import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // user es el marcador de sesión persistente; sobrevive a recargas.
  const [user, setUserState] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // El access token vive solo en memoria (tokenStore) + este estado React.
  const [token, setTokenState] = useState<string | null>(() => tokenStore.get());

  // loading = true mientras corre el bootstrap silent refresh al arrancar.
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem('user')));

  // isAuthenticated se deriva del marcador de sesión, no del token (que en
  // una recarga aún no se ha repoblado en memoria).
  const isAuthenticated = Boolean(user);

  // setUser function
  const setUser = (newUser: User) => {
    setUserState(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // setToken function: memoria + estado React (NO localStorage)
  const setToken = (newToken: string) => {
    setTokenState(newToken);
    tokenStore.set(newToken);
  };

  // updateUserProfile function
  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUserState(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // logout function
  const logout = () => {
    setUserState(null);
    setTokenState(null);
    tokenStore.clear();
    localStorage.removeItem('user');
  };

  // Bootstrap silent refresh: al arrancar, si hay sesión previa (user en
  // localStorage) repuebla el access token en memoria usando la cookie HttpOnly.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!localStorage.getItem('user')) {
        setLoading(false);
        return;
      }
      try {
        const newToken = await authService.refreshAccessToken();
        if (!cancelled) setTokenState(newToken);
      } catch {
        if (!cancelled) {
          // Refresh inválido/expirado: limpiar sesión.
          setUserState(null);
          tokenStore.clear();
          localStorage.removeItem('user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated,
    setUser,
    setToken,
    updateUserProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
