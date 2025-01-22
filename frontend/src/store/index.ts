import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.ts';
import notesReducer from './slices/notesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notes: notesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
