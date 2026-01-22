"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.uploadNoteImage = void 0;
// Importaciones existentes
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const pg_1 = require("pg");
const auth_1 = __importDefault(require("./routes/auth"));
const noteRoutes_1 = __importDefault(require("./routes/noteRoutes"));
const noteGroupRoutes_1 = __importDefault(require("./routes/noteGroupRoutes"));
const userGroupsRoutes_1 = __importDefault(require("./routes/userGroupsRoutes"));
const accountRoutes_1 = __importDefault(require("./routes/accountRoutes"));
const reminderRoutes_1 = __importDefault(require("./routes/reminderRoutes"));
const contact_1 = __importDefault(require("./routes/contact"));
const passwordRoutes_1 = __importDefault(require("./routes/passwordRoutes"));
const cleanupTasks_1 = require("./utils/cleanupTasks");
const emailTasks_1 = require("./utils/emailTasks");
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./config/logger");
const helmet_1 = __importDefault(require("helmet"));
const fs_1 = __importDefault(require("fs"));
// Configurar variables de entorno
dotenv_1.default.config();
// Crear aplicación Express
const app = (0, express_1.default)();
// Security headers with Helmet
app.use((0, helmet_1.default)({
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
const uploadsDir = path_1.default.join(__dirname, 'uploads');
const profileImagesDir = path_1.default.join(uploadsDir, 'profile-images');
const noteImagesDir = path_1.default.join(uploadsDir, 'note-images');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs_1.default.existsSync(profileImagesDir)) {
    fs_1.default.mkdirSync(profileImagesDir, { recursive: true });
}
if (!fs_1.default.existsSync(noteImagesDir)) {
    fs_1.default.mkdirSync(noteImagesDir, { recursive: true });
}
const groupNoteImagesDir = path_1.default.join(uploadsDir, 'group-note-images');
if (!fs_1.default.existsSync(groupNoteImagesDir)) {
    fs_1.default.mkdirSync(groupNoteImagesDir, { recursive: true });
}
app.use('/note-images', express_1.default.static(path_1.default.join(__dirname, 'uploads/note-images')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
app.use('/uploads/group-note-images', express_1.default.static(path_1.default.join(__dirname, 'uploads/group-note-images')));
// Configurar multer para las imágenes de las notas
const noteImageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, noteImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
exports.uploadNoteImage = (0, multer_1.default)({
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
// Desactivar CORS en Express (lo manejará Nginx) COMENTADO ESTO EN EL SERVER, DESCOMENTADO EN LOCAL
/**
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
/**/
app.use(express_1.default.json());
// Apply rate limiting to all API routes
app.use('/api', rateLimiter_1.generalApiLimiter);
app.use('/uploads', (err, req, res, next) => {
    if (err && err.code === 'EACCES') {
        logger_1.logger.error('Error de permisos en el sistema de archivos', { error: err.message });
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
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432')
});
exports.pool = pool;
// Middleware para manejar errores de archivos (Multer)
app.use((err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
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
app.use('/api/auth', auth_1.default); // Rutas de autenticación
app.use('/api/notes', noteRoutes_1.default); // Rutas de notas
app.use('/api/groups', noteGroupRoutes_1.default);
app.use('/api/user-groups', userGroupsRoutes_1.default);
app.use('/api/account', accountRoutes_1.default);
app.use('/api/reminders', reminderRoutes_1.default);
app.use('/api/contact', contact_1.default);
app.use('/api/password', passwordRoutes_1.default);
// Middleware de logging para depuración (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        logger_1.logger.debug(`${req.method} ${req.url}`);
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
    }
    catch (error) {
        next(error);
    }
});
// Middleware para manejar rutas no encontradas (404)
app.use(errorHandler_1.notFoundHandler);
// Centralized error handler (MUST be last middleware)
app.use(errorHandler_1.errorHandler);
// Configurar puerto
const PORT = process.env.PORT || 3001;
async function cleanupExpiredTokens() {
    try {
        const result = await pool.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE');
        if (result.rowCount && result.rowCount > 0) {
            logger_1.logger.info(`Tokens expirados eliminados: ${result.rowCount}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error al limpiar tokens', { error: error instanceof Error ? error.message : 'Unknown' });
    }
}
// Ejecutar cada día
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);
// Iniciar servidor
app.listen(PORT, () => {
    logger_1.logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
    logger_1.logger.info(`Directorio de uploads: ${uploadsDir}`);
    logger_1.logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    // Iniciar tareas programadas
    (0, cleanupTasks_1.setupTrashCleanup)();
    (0, emailTasks_1.setupEmailScheduler)();
});
