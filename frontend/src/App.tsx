import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { accountService } from './services/accountService';
import themeService from './services/themeService';
import themeConfig from './config/themeConfig.json';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Notes from './pages/Notes';
import Trash from './pages/Trash';
import Settings from './pages/settings';
import Reminders from './pages/Reminders';
import Groups from './pages/Groups';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

type ThemeType = keyof typeof themeConfig.themes;

const ThemeLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        if (user?.id) {
          const savedTheme = localStorage.getItem('userTheme');
          if (savedTheme && savedTheme in themeConfig.themes) {
            themeService.setTheme(savedTheme as ThemeType);
          } else {
            const userSettings = await accountService.getUserSettings(user.id);
            if (userSettings?.theme && userSettings.theme in themeConfig.themes) {
              themeService.setTheme(userSettings.theme as ThemeType);
            } else {
              themeService.resetToDefault();
            }
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

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <ThemeLoader>
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1a1a',
                  color: '#fff',
                  border: '1px solid rgba(255, 198, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '16px'
                },
                success: {
                  iconTheme: {
                    primary: '#ffc600',
                    secondary: '#000'
                  }
                },
                error: {
                  iconTheme: {
                    primary: '#ff4444',
                    secondary: '#fff'
                  },
                  duration: 5000
                }
              }}
            />
            <div className="app">
              <Header />
              <main className="main-content">
                <Routes>
                  {/* Ruta principal accesible sin autenticación */}
                  <Route path="/" element={<Home />} />

                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />

                  <Route path="/notes" element={
                    <PrivateRoute>
                      <Notes />
                    </PrivateRoute>
                  } />

                  <Route path="/trash" element={
                    <PrivateRoute>
                      <Trash />
                    </PrivateRoute>
                  } />

                  <Route path="/Reminders" element={
                    <PrivateRoute>
                      <Reminders />
                    </PrivateRoute>
                  } />

                  <Route path="/settings" element={
                    <PrivateRoute>
                      <Settings />
                    </PrivateRoute>
                  } />

                  <Route path="/groups" element={
                    <PrivateRoute>
                      <Groups />
                    </PrivateRoute>
                  } />

                  {/* Ruta por defecto */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </ThemeLoader>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
