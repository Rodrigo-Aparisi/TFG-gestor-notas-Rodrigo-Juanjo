import axios from 'axios';
import { Note } from '../types';
import { authService } from '../services/auth';


const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

interface NoteInput {
  title: string;
  content: string;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export const noteService = {
  getNotes: () => {
    return api.get<ApiResponse<Note[]>>('/notes');
  },
  
  createNote: (noteData: NoteInput) => {
    return api.post<ApiResponse<Note>>('/notes', noteData);
  },
  
  updateNote: (id: string, noteData: Partial<NoteInput>) => {
    return api.put<ApiResponse<Note>>(`/notes/${id}`, noteData);
  },
  
  deleteNote: (id: string) => {
    return api.delete<ApiResponse<void>>(`/notes/${id}`);
  }
};

export default api;
