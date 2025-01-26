import { useNavigate } from 'react-router-dom';
import { Process } from '@types/node';

// Tipos para los datos
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

// Clase para manejar errores de la API
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Servicio de autenticación
export const authService = {
  // Login
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Error en el inicio de sesión');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Error en el servidor');
    }
  },

  // Registro
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Error en el registro');
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Error en el servidor');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  updateToken: (token: string) => {
    localStorage.setItem('token', token);
  }
};

// Hook personalizado
export const useAuth = () => {
  const navigate = useNavigate();

  return {
    login: async (credentials: LoginCredentials) => {
      try {
        const response = await authService.login(credentials);
        navigate('/notes');
        return response;
      } catch (error) {
        throw error;
      }
    },

    register: async (userData: RegisterData) => {
      try {
        const response = await authService.register(userData);
        return response;
      } catch (error) {
        throw error;
      }
    },

    logout: () => {
      authService.logout();
      navigate('/login');
    },

    isAuthenticated: authService.isAuthenticated,
    getCurrentUser: authService.getCurrentUser,
  };
};
