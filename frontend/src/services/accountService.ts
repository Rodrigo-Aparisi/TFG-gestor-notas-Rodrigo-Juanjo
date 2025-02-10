import api from './api';
import { User } from '../types';

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

interface UserSettings {
  id: string;
  user_id: string;
  theme: string;
  notifications_enabled: boolean;
  language: string;
}


export const accountService = {
  updateUser: async (userData: UpdateUserData): Promise<UpdateResponse> => {
    try {
      const response = await api.put<UpdateResponse>('/account/update', userData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Contraseña actual incorrecta');
      } else if (error.response?.status === 404) {
        throw new Error('Usuario no encontrado');
      }
      throw new Error(error.response?.data?.error || 'Error al actualizar el usuario');
    }
  },

  getUserSettings: async (userId: string): Promise<UserSettings> => {
    try {
      const response = await api.get<UserSettings>(`/api/settings/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener la configuración');
    }
  },

  updateUserSettings: async (userId: string, settings: Partial<UserSettings>): Promise<UserSettings> => {
    try {
      const response = await api.put<UserSettings>(`/api/settings/${userId}`, settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al actualizar la configuración');
    }
  },

  getProfile: async (): Promise<User> => {
    try {
      const response = await api.get<{ user: User }>('/account/profile');
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al obtener el perfil');
    }
  },

  deleteAccount: async (password: string): Promise<void> => {
    try {
      await api.delete('/account/delete', {
        data: { password }
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error al eliminar la cuenta');
    }
  }
};

export default accountService;
