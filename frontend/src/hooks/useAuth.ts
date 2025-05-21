import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useState, useEffect } from 'react';
import { User } from '../types';

export const useAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());

  useEffect(() => {
    const updateUserFromStorage = () => {
      setUser(authService.getCurrentUser());
    };

    // Escuchar cambios en el localStorage
    window.addEventListener('storage', updateUserFromStorage);

    return () => {
      window.removeEventListener('storage', updateUserFromStorage);
    };
  }, []);

  return {
    error,
    user,
    login: async (credentials: { email: string; password: string }) => {
      try {
        setError('');
        const response = await authService.login(credentials);
        setUser(authService.getCurrentUser());
        navigate('/notes');
        return response;
      } catch (error: any) {
        setError(error.message);
        throw error;
      }
    },

    register: async (userData: { username: string; email: string; password: string }) => {
      try {
        setError('');
        const response = await authService.register(userData);
        return response;
      } catch (error: any) {
        setError(error.message);
        throw error;
      }
    },

    logout: () => {
      authService.logout();
      setUser(null);
      navigate('/login');
    },

    clearError: () => setError(''),
    isAuthenticated: authService.isAuthenticated,
  };
};