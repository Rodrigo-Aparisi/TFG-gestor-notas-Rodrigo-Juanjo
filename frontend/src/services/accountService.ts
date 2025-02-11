import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

interface UserSettings {
  theme?: string;
  notifications_enabled?: boolean;
  language?: string;
}

interface UpdateUserData {
  username: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
}

interface UpdateResponse {
  user: any;
  message?: string;
}

export const accountService = {
  getUserSettings: async (userId: string): Promise<UserSettings> => {
    try {
      // Cambiado para coincidir con la ruta del backend
      const response = await api.get('/account/settings');
      
      if (!response.data) {
        throw new Error('No se encontró la configuración');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener la configuración:', error);
      
      if (error.response?.status === 404) {
        try {
          const defaultSettings: UserSettings = {
            theme: 'dark',
            notifications_enabled: true,
            language: 'es'
          };
          
          const newSettings = await accountService.updateUserSettings(userId, defaultSettings);
          return newSettings;
        } catch (createError) {
          console.error('Error al crear configuración por defecto:', createError);
          return { theme: 'dark' };
        }
      }
      
      return { theme: 'dark' };
    }
  },

  updateUserSettings: async (userId: string, settings: UserSettings): Promise<UserSettings> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Cambiado para coincidir con la ruta del backend
      const response = await api.put('/account/settings', settings);

      if (!response.data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar la configuración:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar la configuración del usuario');
    }
  },

  updateUser: async (userData: UpdateUserData): Promise<UpdateResponse> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await api.put<UpdateResponse>('/auth/update', userData);

      if (!response.data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar el usuario:', error);
      throw new Error(error.response?.data?.message || 'Error al actualizar el usuario');
    }
  }
};

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default accountService;
