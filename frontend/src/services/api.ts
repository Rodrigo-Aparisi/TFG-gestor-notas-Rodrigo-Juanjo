import axios from 'axios';
import { authService } from './auth';

// Crear instancia de axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir el token
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de notas
export const noteService = {
  getNotes: async () => {
    try {
      const response = await api.get('/notes');
      return response.data;
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  },

  createNote: async (noteData: { title: string; content: string }) => {
    try {
      const response = await api.post('/notes', noteData);
      return response.data;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  updateNote: async (id: string, noteData: { title?: string; content?: string }) => {
    try {
      // Asegurarse de que los datos no sean undefined
      const sanitizedData = {
        title: noteData.title || '',
        content: noteData.content || ''
      };
  
      const response = await api.put(`/notes/${id}`, sanitizedData);
      if (!response.data) {
        throw new Error('No se recibieron datos del servidor');
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Nota no encontrada');
        } else if (error.response?.status === 500) {
          throw new Error('Error del servidor al actualizar la nota');
        }
        throw new Error(error.response?.data?.error || 'Error al actualizar la nota');
      }
      throw new Error('Error inesperado al actualizar la nota');
    }
  },
  

  deleteNote: async (id: string) => {
    try {
      await api.delete(`/notes/${id}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }
};

export default api;
