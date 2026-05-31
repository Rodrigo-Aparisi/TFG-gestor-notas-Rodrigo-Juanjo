import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export interface SettingsState {
  defaultNoteSort: 'date' | 'title' | 'lastModified';
  theme: 'light' | 'dark';
  defaultPage: 'notes' | 'calendar' | 'home';
  confirmDelete: boolean;
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  resetSettings: () => void;
}

const defaultSettings: SettingsState = {
  defaultNoteSort: 'date',
  theme: 'dark',
  defaultPage: 'notes',
  confirmDelete: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const { isAuthenticated } = useAuth();

  // Load settings from server when authenticated; reset to defaults when not
  useEffect(() => {
    if (!isAuthenticated) {
      setSettings(defaultSettings);
      return;
    }
    const loadFromServer = async () => {
      try {
        const response = await api.get('/account/settings');
        if (response.data) {
          const serverSettings = response.data as Partial<SettingsState>;
          setSettings(prev => ({ ...prev, ...serverSettings }));
        }
      } catch {
        // Silently keep defaults if the request fails (unauthenticated or network error)
      }
    };
    loadFromServer();
  }, [isAuthenticated]); // Reload when auth state changes

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

// Custom hook to use the SettingsContext
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
