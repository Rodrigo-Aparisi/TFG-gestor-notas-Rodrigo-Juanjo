import axios from 'axios';
import { User } from '../types';
import { themeService } from './themeService';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Send HttpOnly cookies (refresh_token) automatically
});

// Interfaces
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface UpdateUserData {
  username: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
}

interface AuthResponse {
  token: string;
  // refreshToken eliminado — ahora en cookie HttpOnly gestionada por el servidor
  user: User;
}

interface UpdateResponse {
  user: User;
  message?: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      if (response.data && response.data.token) {
        const { token, user } = response.data;

        // Guardar datos en localStorage (refreshToken va en cookie HttpOnly — no se accede desde JS)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as any).response?.data?.error || 'Error en el inicio de sesión'
          : 'Error en el inicio de sesión';
      throw new Error(errorMessage);
    }
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', userData);
      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as any).response?.data?.error || 'Error en el registro'
          : 'Error en el registro';
      throw new Error(errorMessage);
    }
  },

  updateUser: async (userData: UpdateUserData): Promise<UpdateResponse> => {
    try {
      const response = await api.put<UpdateResponse>('/auth/update', userData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.user) {
        // Actualizar localStorage (Context API actualizará el estado)
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as any).response?.data?.error || 'Error al actualizar el usuario'
          : 'Error al actualizar el usuario';
      throw new Error(errorMessage);
    }
  },

  updateUserProfile: async (profileData: Partial<User>): Promise<void> => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const currentUser = JSON.parse(userStr) as User;
        const updatedUser = { ...currentUser, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  logout: () => {
    themeService.resetToDefault();
    localStorage.removeItem('token');
    // refreshToken ya no está en localStorage — se limpia con clearCookie en el backend
    localStorage.removeItem('user');
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        JSON.parse(userStr) as User; // Validate JSON
        return true;
      } catch (error) {
        console.error('Error parsing user data:', error);
        themeService.resetToDefault();
        return false;
      }
    }
    themeService.resetToDefault();
    return false;
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  getRefreshToken: (): string | null => {
    // Refresh token ahora está en cookie HttpOnly gestionada por el servidor
    return null;
  },

  refreshAccessToken: async (): Promise<string> => {
    // No necesita leer refreshToken de localStorage — la cookie se envía automáticamente
    const response = await api.post<{ token: string }>('/auth/refresh', {});
    const newToken = response.data.token;
    localStorage.setItem('token', newToken);
    return newToken;
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  initializeAuth: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      themeService.resetToDefault();
    }
  },
};

export default authService;
