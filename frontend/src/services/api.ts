import axios from 'axios';
import { authService } from './auth';
import { User, Reminder, ReminderRecurrence } from '../types';

// Interfaces para el servicio de cuenta
interface UpdateUserData {
  username: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
}

interface UpdateResponse {
  user: User;
  message: string;
}

// Crear instancia de axios
const api = axios.create({
  baseURL: process.env.REACT_APP_api || 'http://localhost:3001/api',
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


interface CreateReminderData {
  title: string;
  description: string;
  dateTime: Date;
  statusId: number;
  hasTime: boolean;
}

export const calendarService = {
  getReminders: async ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    try {
      const response = await api.get('/reminders', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error en getReminders:', error);
      throw error;
    }
  },

  createReminder: async (data: CreateReminderData) => {
    try {
      const reminderData = {
        ...data,
        dateTime: data.dateTime.toISOString(),
        hasTime: data.hasTime
      };
      
      console.log('Sending reminder data:', reminderData);
      const response = await api.post('/reminders', reminderData);
      return response.data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  },

  updateReminderStatus: async (id: string, statusId: number) => {
    try {
      const response = await api.put(`/reminders/${id}/status`, { statusId });
      return response.data;
    } catch (error) {
      console.error('Error updating reminder status:', error);
      throw error;
    }
  },

  updateReminder: async (id: string, data: Partial<Reminder>) => {
    try {
      const response = await api.put(`/reminders/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }
};


// Servicios de cuenta
export const accountService = {
  updateUser: async (userData: UpdateUserData): Promise<UpdateResponse> => {
    try {
      const response = await api.put<UpdateResponse>('/account/update', userData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Contraseña actual incorrecta');
        } else if (error.response?.status === 404) {
          throw new Error('Usuario no encontrado');
        } else if (error.response?.status === 500) {
          throw new Error('Error del servidor al actualizar el usuario');
        }
        throw new Error(error.response?.data?.error || 'Error al actualizar el usuario');
      }
      throw new Error('Error inesperado al actualizar el usuario');
    }
  },

  getProfile: async (): Promise<User> => {
    try {
      const response = await api.get('/account/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  deleteAccount: async (password: string): Promise<void> => {
    try {
      await api.delete('/account/delete', { data: { password } });
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
};

export default api;
