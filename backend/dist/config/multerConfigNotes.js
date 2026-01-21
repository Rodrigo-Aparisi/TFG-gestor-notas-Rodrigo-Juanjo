"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMulterError = exports.deleteImage = exports.getImageUrl = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configuración de directorios
const uploadDir = path_1.default.join(__dirname, '..', 'uploads');
const noteImagesDir = path_1.default.join(uploadDir, 'note-images');
// Crear directorios si no existen
[uploadDir, noteImagesDir].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Configuración de almacenamiento para imágenes de notas
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, noteImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path_1.default.extname(file.originalname);
        cb(null, `note-${uniqueSuffix}${ext}`);
    }
});
// Configuración de multer
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB límite
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
        }
    }
});
// Función helper para obtener la URL de la imagen
const getImageUrl = (filename) => {
    return `/note-images/${filename}`;
};
exports.getImageUrl = getImageUrl;
// Función para eliminar una imagen
const deleteImage = async (imageUrl) => {
    try {
        const filePath = path_1.default.join(__dirname, '..', 'uploads', imageUrl);
        if (fs_1.default.existsSync(filePath)) {
            await fs_1.default.promises.unlink(filePath);
        }
    }
    catch (error) {
        console.error('Error deleting image:', error);
        throw new Error('Error al eliminar la imagen');
    }
};
exports.deleteImage = deleteImage;
// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'El archivo es demasiado grande. Máximo 5MB'
            });
        }
        return res.status(400).json({
            error: 'Error al subir el archivo'
        });
    }
    if (err) {
        return res.status(400).json({
            error: err.message
        });
    }
    next();
};
exports.handleMulterError = handleMulterError;
