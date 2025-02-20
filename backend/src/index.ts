// Importaciones
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { Pool } from 'pg';
import authRoutes from './routes/auth';
import notesRoutes from './routes/noteRoutes';
import accountRoutes from './routes/accountRoutes';
import reminderRoutes from './routes/reminderRoutes';
import fs from 'fs';

// Configurar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Crear directorios necesarios si no existen
const uploadsDir = path.join(__dirname, '..', 'uploads');
const profileImagesDir = path.join(uploadsDir, 'profile-images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profileImagesDir)) {
  fs.mkdirSync(profileImagesDir, { recursive: true });
}

// Middleware básico
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Configurar servicio de archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));
// Configurar conexión a base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432')
});

// Middleware para manejar errores de archivos
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Archivo demasiado grande. Máximo 5MB'
      });
    }
  }
  next(err);
});

// Configurar rutas
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/reminders', reminderRoutes);

// Ruta de prueba para la base de datos
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      message: 'Conexión exitosa', 
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error conectando a la base de datos' 
    });
  }
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada'
  });
});

// Agregar manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Configurar puerto
const PORT = process.env.PORT || 3001;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`Directorio de uploads: ${uploadsDir}`);
});

// Exportar pool para uso en otros archivos
export { pool };
