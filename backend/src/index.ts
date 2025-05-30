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
import chatbotRoutes from './routes/chatbotRoutes';
import contactRoutes from './routes/contact';
import passwordRoutes from './routes/passwordRoutes';
import { setupTrashCleanup } from './utils/cleanupTasks';
import { setupEmailScheduler } from './utils/emailTasks'; // Importa el programador de correos
import fs from 'fs';

// Configurar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

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

app.use('/note-images', express.static(path.join(__dirname, 'uploads/note-images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    fileSize: 5 * 1024 * 1024 // 5MB límite
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


// Middleware básico
app.use(cors({
  origin: process.env.APP_URL,
  credentials: true
}));

app.use(express.json());

app.use('/uploads', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.code === 'EACCES') {
    console.error('Error de permisos en el sistema de archivos:', err);
    return res.status(500).json({
      error: 'Error de permisos al acceder a los archivos'
    });
  }
  next(err);
});

app.use('/uploads', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error serving image:', err);
  if (err.code === 'ENOENT') {
    res.status(404).json({ error: 'Imagen no encontrada' });
  } else {
    res.status(500).json({ error: 'Error al cargar la imagen' });
  }
});

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
    return res.status(400).json({
      error: 'Error al subir el archivo: ' + err.message
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
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/password', passwordRoutes);

// Añadir un middleware de logging para depuración
app.use((req, res, next) => {
    console.log('Ruta solicitada:', req.method, req.url);
    next();
});

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

async function cleanupExpiredTokens() {
  try {
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE'
    );
    console.log('Tokens expirados o usados eliminados');
  } catch (error) {
    console.error('Error al limpiar tokens:', error);
  }
}

// Ejecutar cada día
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  console.log(`Directorio de uploads: ${uploadsDir}`);
  
  // Iniciar tareas programadas
  setupTrashCleanup();
  setupEmailScheduler();
});

// Exportar pool para uso en otros archivos
export { pool };
