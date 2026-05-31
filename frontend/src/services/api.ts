import axios from 'axios';
import { authService } from './auth';
import { User, UpdateReminderData, CreateReminderData } from '../types';

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

interface ProfileImageResponse {
  profile_image: string;
  message: string;
}

interface ShareNoteOptions {
  includeImages?: boolean;
  canEdit?: boolean;
}

// Crear instancia de axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Envía cookies automáticamente (incluye refresh_token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el token
api.interceptors.request.use(config => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cola de requests pendientes durante el refresco
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

// Interceptor para manejar errores y refresco automático de token
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Si ya hay un refresco en curso, encolar esta request
      if (isRefreshing) {
        return new Promise(resolve => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await authService.refreshAccessToken();
        onTokenRefreshed(newToken);
        isRefreshing = false;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Servicios de notas
export const noteService = {
  getNotes: async () => {
    try {
      const response = await api.get('notes');
      return response.data;
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  },

  // Obtener notas de la papelera
  getTrashNotes: async () => {
    try {
      const response = await api.get('notes/trash');
      return response.data;
    } catch (error) {
      console.error('Error fetching trash notes:', error);
      throw error;
    }
  },

  restoreNote: async (id: string) => {
    try {
      const response = await api.post(`notes/trash/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error('Error restoring note:', error);
      throw error;
    }
  },

  emptyTrash: async () => {
    try {
      const response = await api.delete('/trash/empty');
      return response.data;
    } catch (error) {
      console.error('Error emptying trash:', error);
      throw error;
    }
  },

  createNote: async (noteData: { title: string; content: string; images?: string[] }) => {
    try {
      const response = await api.post('notes', noteData);
      return response.data;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  shareNote: async (noteId: string, username: string, options: ShareNoteOptions | boolean = {}) => {
    const shareOptions: ShareNoteOptions =
      typeof options === 'boolean'
        ? { includeImages: options, canEdit: false }
        : { includeImages: true, canEdit: false, ...options };

    const response = await api.post('notes/share', {
      noteId,
      username,
      includeImages: shareOptions.includeImages,
      canEdit: shareOptions.canEdit,
    });

    return response.data;
  },

  updateSharedNotePermissions: async (
    noteId: string,
    username: string,
    options: ShareNoteOptions
  ) => {
    const response = await api.put(`notes/${noteId}/share-permissions`, {
      username,
      ...options,
    });
    return response.data;
  },

  getSharedNotes: async () => {
    try {
      const response = await api.get('notes/shared-notes');

      return response.data;
    } catch (error) {
      console.error('Error fetching shared notes:', error);
      throw error;
    }
  },

  updateNote: async (id: string, noteData: { title?: string; content?: string }) => {
    try {
      const response = await api.put(`notes/${id}`, noteData);
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

  updateSharedNote: async (id: string, noteData: { title?: string; content?: string }) => {
    try {
      const response = await api.put(`notes/shared-notes/${id}`, noteData);
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

  updateSharedNoteImages: async (id: string, images: string[]) => {
    try {
      const response = await api.put(`notes/shared-notes/${id}`, { images });
      if (!response.data) {
        throw new Error('No se recibieron datos del servidor');
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Nota no encontrada');
        } else if (error.response?.status === 500) {
          throw new Error('Error del servidor al actualizar imágenes');
        }
        throw new Error(error.response?.data?.error || 'Error al actualizar imágenes de la nota');
      }
      throw new Error('Error inesperado al actualizar imágenes de la nota');
    }
  },

  searchUsers: async (query: string) => {
    try {
      const response = await api.get(`notes/users?query=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error al buscar usuarios:', error);
      return { users: [] };
    }
  },

  searchGroupUsers: async (groupId: string, query: string) => {
    try {
      const response = await api.get(`/groups/${groupId}/search-users?q=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error al buscar usuarios para el grupo:', error);
      return { users: [] };
    }
  },

  uploadNoteImage: async (formData: FormData) => {
    try {
      const response = await api.post('notes/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  deleteNote: async (id: string) => {
    try {
      await api.delete(`notes/${id}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },

  togglePin: async (id: string) => {
    const response = await api.patch(`notes/${id}/pin`);
    return response.data;
  },

  toggleMark: async (id: string) => {
    const response = await api.patch(`notes/${id}/mark`);
    return response.data;
  },

  unmarkAllNotes: async () => {
    const response = await api.post('notes/unmark-all');
    return response.data;
  },

  createGroup: async (groupData: { name: string; color: string; noteIds: string[] }) => {
    try {
      const response = await api.post('/groups', groupData);
      return response.data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  getGroups: async () => {
    try {
      const response = await api.get('/groups');
      return response.data;
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  },

  updateGroup: async (groupId: string, groupData: { name: string; color: string }) => {
    try {
      const response = await api.put(`/groups/${groupId}`, groupData);
      return response.data;
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  },

  reorderGroups: async (groupIds: string[]) => {
    try {
      const response = await api.put('/groups/reorder', { groupIds });
      return response.data;
    } catch (error) {
      console.error('Error reordering groups:', error);
      throw error;
    }
  },

  addNoteToGroup: async (groupId: string, noteId: string) => {
    try {
      const response = await api.post('/groups/add-note', { groupId, noteId });
      return response.data;
    } catch (error) {
      console.error('Error adding note to group:', error);
      throw error;
    }
  },

  removeNoteFromGroup: async (groupId: string, noteId: string) => {
    try {
      const response = await api.delete(`/groups/${groupId}/notes/${noteId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing note from group:', error);
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      const response = await api.delete(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  },

  getUserSortPreferences: async () => {
    try {
      const response = await api.get('notes/sort-preferences');
      return response.data;
    } catch (error) {
      console.error('Error al obtener preferencias de ordenación:', error);

      // Crear un objeto de respuesta de respaldo con valores por defecto
      const savedType = localStorage.getItem('notesSortType') || 'date';
      const savedDirection = localStorage.getItem('notesSortDirection') || 'desc';

      return {
        success: true,
        preferences: {
          sortType: savedType,
          sortDirection: savedDirection,
        },
      };
    }
  },

  saveUserSortPreferences: async (sortType: string, sortDirection: string) => {
    try {
      const response = await api.post('notes/sort-preferences', {
        sortType,
        sortDirection,
      });
      return response.data;
    } catch (error) {
      console.error('Error al guardar preferencias de ordenación:', error);
      throw error;
    }
  },
};

// Servicios de calendario
export const calendarService = {
  getReminders: async ({ startDate, endDate }: { startDate: Date; endDate: Date }) => {
    try {
      const response = await api.get('/reminders', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
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
        hasTime: data.hasTime,
        sendEmail: data.sendEmail,
      };

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

  updateReminder: async (id: string, data: UpdateReminderData) => {
    try {
      const response = await api.put(`/reminders/${id}`, {
        title: data.title,
        description: data.description,
        date_time: data.date_time,
        status_id: data.status_id,
        has_time: data.has_time,
        send_email: data.send_email,
      });

      if (response.data?.reminder) {
        return {
          reminder: {
            ...response.data.reminder,
            dateTime: new Date(response.data.reminder.date_time),
            statusId: response.data.reminder.status_id,
            hasTime: response.data.reminder.has_time,
            sendEmail: response.data.reminder.send_email,
          },
        };
      }
      return response.data;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  },

  deleteReminder: async (id: string) => {
    try {
      const response = await api.delete(`/reminders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  },
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

  updateUserProfileImage: async (formData: FormData): Promise<string> => {
    try {
      const response = await api.post<ProfileImageResponse>(
        '/account/upload-profile-image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.data || !response.data.profile_image) {
        throw new Error('No se recibió la URL de la imagen');
      }

      return response.data.profile_image;
    } catch (error) {
      console.error('Error en updateUserProfileImage:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Error al subir la imagen');
      }
      throw new Error('Error inesperado al subir la imagen');
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
  },

  getUserSettings: async (userId: string) => {
    try {
      const response = await api.get('/account/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  },

  updateUserSettings: async (
    userId: string,
    settings: Record<string, string | boolean | number>
  ) => {
    try {
      const response = await api.put('/account/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  },
};

export default api;
