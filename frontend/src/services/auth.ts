import axios from 'axios';
import { store } from '../store';
import { setUser, setToken, logout as logoutAction } from '../store/slices/authSlice';
import { User } from '../types'; // Asegúrate de que este tipo existe

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

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
  user: User; // Usar el tipo User de tu aplicación
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      if (response.data && response.data.token) {
        // Guardar en localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Actualizar Redux - asegurarnos de que user cumple con el tipo User
        store.dispatch(setUser(response.data.user));
        store.dispatch(setToken(response.data.token));
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error en el inicio de sesión');
    }
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error en el registro');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    store.dispatch(logoutAction());
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        const state = store.getState();
        if (!state.auth.user) {
          store.dispatch(setUser(user));
          store.dispatch(setToken(token));
        }
        return true;
      } catch (error) {
        console.error('Error parsing user data:', error);
        return false;
      }
    }
    return false;
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  initializeAuth: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        store.dispatch(setUser(user));
        store.dispatch(setToken(token));
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    }
  }
};

// Interceptor para añadir el token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default authService;
