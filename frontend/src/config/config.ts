// src/config/config.ts

// Determinar el entorno actual
const isProduction = process.env.NODE_ENV === 'production';

// Configuración base
const config = {
  // API URLs
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  BASE_URL: process.env.API_URL || 'http://localhost:3001',
  
  // Rutas para imágenes
  UPLOAD_PATH: '/uploads/profile-images/',
  
  // Configuraciones específicas por entorno
  ENABLE_LOGS: !isProduction,
  
  // Nombre de la aplicación
  APP_NAME: 'Olympus Scribe',
  
  // Versión de la aplicación
  VERSION: '1.0.0',
  
};

export default config;
