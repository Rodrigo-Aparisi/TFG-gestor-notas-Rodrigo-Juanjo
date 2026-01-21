import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { accountService } from '../services/accountService';
import themeService from '../services/themeService';
import themeConfig from '../config/themeConfig.json';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        if (user?.id) {
          const userSettings = await accountService.getUserSettings(user.id);
          // Verificar que el tema sea válido usando el themeConfig
          const theme = userSettings?.theme;
          if (theme && theme in themeConfig.themes) {
            themeService.setTheme(theme as keyof typeof themeConfig.themes);
          } else {
            themeService.resetToDefault();
          }
        } else {
          themeService.resetToDefault();
        }
      } catch (error) {
        console.error('Error al cargar el tema:', error);
        themeService.resetToDefault();
      }
    };

    loadUserTheme();
  }, [user]);

  return <>{children}</>;
};

export default ThemeProvider;
