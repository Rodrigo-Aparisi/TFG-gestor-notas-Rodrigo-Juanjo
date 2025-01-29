import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useState } from 'react';

export const useAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  return {
    error,
    login: async (credentials: { email: string; password: string }) => {
      try {
        setError('');
        const response = await authService.login(credentials);
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
      navigate('/login');
    },

    clearError: () => setError(''),
    isAuthenticated: authService.isAuthenticated,
    //getCurrentUser: authService.getCurrentUser,
  };
};
