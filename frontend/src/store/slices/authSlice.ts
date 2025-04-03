import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// Obtener usuario del localStorage si existe
const savedUser = localStorage.getItem('user');
const parsedUser = savedUser ? JSON.parse(savedUser) : null;

const initialState: AuthState = {
  user: parsedUser, // Esto incluirá profile_image si existe
  token: localStorage.getItem('token'),
  loading: false,
  isAuthenticated: Boolean(localStorage.getItem('token')),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload; // Esto incluirá profile_image
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload);
    },
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { setUser, setToken, updateUserProfile, logout } = authSlice.actions;
export default authSlice.reducer;
