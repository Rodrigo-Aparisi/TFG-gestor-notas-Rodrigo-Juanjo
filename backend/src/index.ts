// Importaciones existentes
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { Pool } from 'pg';
import authRoutes from './routes/auth';
import notesRoutes from './routes/noteRoutes';
import groupRoutes from './routes/noteGroupRoutes';
import userGroupRoutes from './routes/userGroupsRoutes';
import accountRoutes from './routes/accountRoutes';
import reminderRoutes from './routes/reminderRoutes';
import contactRoutes from './routes/contact';
import passwordRoutes from './routes/passwordRoutes';
import { setupTrashCleanup } from './utils/cleanupTasks';
import { setupEmailScheduler } from './utils/emailTasks';
import { generalApiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import helmet from 'helmet';
import fs from 'fs';

// Configurar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding images
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// Crear directorios necesarios si no existen
const uploadsDir = path.join(__dirname, 'uploads');
const profileImagesDir = path.join(uploadsDir, 'profile-images');
const noteImagesDir = path.join(uploadsDir, 'note-images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profileImagesDir)) {
  fs.mkdirSync(profileImagesDir, { recursive: true });
}
if (!fs.existsSync(noteImagesDir)) {
  fs.mkdirSync(noteImagesDir, { recursive: true });
}

const groupNoteImagesDir = path.join(uploadsDir, 'group-note-images');
if (!fs.existsSync(groupNoteImagesDir)) {
  fs.mkdirSync(groupNoteImagesDir, { recursive: true });
}

app.use('/note-images', express.static(path.join(__dirname, 'uploads/note-images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/group-note-images', express.static(path.join(__dirname, 'uploads/group-note-images')));

// Configurar multer para las imágenes de las notas
const noteImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, noteImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

export const uploadNoteImage = multer({
  storage: noteImageStorage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB límite
  },
  fileFilter: (req, file, cb) => {
    // Lista de tipos MIME permitidos
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
    }
    cb(null, true);
  }
}).single('image');

// CORS: activo en desarrollo, en producción lo gestiona Nginx
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
}

app.use(express.json());

// Apply rate limiting to all API routes
app.use('/api', generalApiLimiter);

app.use('/uploads', (err: Error & { code?: string }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.code === 'EACCES') {
    logger.error('Error de permisos en el sistema de archivos', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { message: 'Error de permisos al acceder a los archivos' }
    });
  }
  if (err && err.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: { message: 'Imagen no encontrada' }
    });
  }
  next(err);
});

// Configurar conexión a base de datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432')
});

// Middleware para manejar errores de archivos (Multer)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { message: 'Archivo demasiado grande. Máximo 5MB', code: 'FILE_TOO_LARGE' }
      });
    }
    return res.status(400).json({
      success: false,
      error: { message: 'Error al subir el archivo: ' + err.message, code: 'UPLOAD_ERROR' }
    });
  }
  next(err);
});

// Configurar rutas
app.use('/api/auth', authRoutes);     // Rutas de autenticación
app.use('/api/notes', notesRoutes);   // Rutas de notas
app.use('/api/groups', groupRoutes);
app.use('/api/user-groups', userGroupRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/password', passwordRoutes);

// Middleware de logging para depuración (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });
}

// Ruta de prueba para la base de datos
app.get('/test-db', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      success: true,
      message: 'Conexión exitosa',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    next(error);
  }
});

// Middleware para manejar rutas no encontradas (404)
app.use(notFoundHandler);

// Centralized error handler (MUST be last middleware)
app.use(errorHandler);

// Configurar puerto
const PORT = process.env.PORT || 3001;

async function cleanupExpiredTokens() {
  try {
    const result = await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE'
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Tokens expirados eliminados: ${result.rowCount}`);
    }
  } catch (error) {
    logger.error('Error al limpiar tokens', { error: error instanceof Error ? error.message : 'Unknown' });
  }
}

// Ejecutar cada día
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
  logger.info(`Directorio de uploads: ${uploadsDir}`);
  logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);

  // Iniciar tareas programadas
  setupTrashCleanup();
  setupEmailScheduler();
});

// Exportar pool para uso en otros archivos
export { pool };
