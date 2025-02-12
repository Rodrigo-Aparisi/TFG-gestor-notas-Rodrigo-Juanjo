import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SettingsState {
  defaultNoteSort: 'date' | 'title' | 'lastModified';
  theme: 'light' | 'dark';
  defaultPage: 'notes' | 'calendar' | 'home';
  confirmDelete: boolean;
}

const initialState: SettingsState = {
  defaultNoteSort: 'date',
  theme: 'dark',
  defaultPage: 'notes',
  confirmDelete: true
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    resetSettings: () => initialState,
  },
});

export const { updateSettings, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
