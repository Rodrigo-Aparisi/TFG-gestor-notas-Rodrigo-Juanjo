import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import themeService from './services/themeService';
import themeConfig from './config/themeConfig.json';

// Cargar el tema guardado al iniciar la aplicación
const savedTheme = localStorage.getItem('userTheme');
if (savedTheme && savedTheme in themeConfig.themes) {
  themeService.setTheme(savedTheme as keyof typeof themeConfig.themes);
} else {
  themeService.resetToDefault();
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
