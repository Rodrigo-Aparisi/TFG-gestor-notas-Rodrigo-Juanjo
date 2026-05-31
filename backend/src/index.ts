// Importaciones existentes
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './database';
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

// Validate environment variables before starting the server
if (process.env.NODE_ENV !== 'test') {
  const { validateEnv } = require('./config/env');
  try {
    validateEnv();
  } catch (err) {
    logger.error('[STARTUP] Configuración de entorno inválida', {
      error: err instanceof Error ? err.message : err,
    });
    process.exit(1);
  }
}

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

// CORS: always active; allowed origins controlled via ALLOWED_ORIGINS env var
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o: string) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests without Origin header (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not in allowed list`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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

