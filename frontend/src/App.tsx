import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/index';
import { RootState } from './store';
import { accountService } from './services/accountService';
import themeService from './services/themeService';
import themeConfig from './config/themeConfig.json';
import Header from './components/Layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Notes from './pages/Notes';
import Settings from './pages/settings';
import Reminders from './pages/Reminders';
import ChatbotPage from './pages/ChatbotPage';
import ChatbotFloatingButton from './components/Chatbot/ChatbotFloatingButton';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

type ThemeType = keyof typeof themeConfig.themes;

const ThemeLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);

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

// Componente para controlar la visibilidad del botón flotante
const FloatingButtonController: React.FC = () => {
  const location = useLocation();
  
  // No mostrar el botón flotante en la página de login o en la página del chatbot
  if (location.pathname === '/login' || location.pathname === '/chatbot') {
    return null;
  }
  
  return <ChatbotFloatingButton />;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <ThemeLoader>
          <div className="app">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={
                  <PrivateRoute>
                    <Home />
                  </PrivateRoute>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/notes" element={
                  <PrivateRoute>
                    <Notes />
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
                <Route path="/chatbot" element={
                  <PrivateRoute>
                    <ChatbotPage />
                  </PrivateRoute>
                } />

                {/* Ruta por defecto */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            
            {/* Añade el componente FloatingButtonController aquí */}
            <FloatingButtonController />
          </div>
        </ThemeLoader>
      </Router>
    </Provider>
  );
}

export default App;
