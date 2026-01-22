"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPLOAD_DIRECTORIES = exports.handleMulterError = exports.deleteImage = exports.getImageUrl = exports.profileImageUpload = exports.groupNoteImageUpload = exports.noteImageUpload = exports.createUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Upload directories
const UPLOAD_DIR = path_1.default.join(__dirname, '..', 'uploads');
const NOTE_IMAGES_DIR = path_1.default.join(UPLOAD_DIR, 'note-images');
const GROUP_NOTE_IMAGES_DIR = path_1.default.join(UPLOAD_DIR, 'group-note-images');
const PROFILE_IMAGES_DIR = path_1.default.join(UPLOAD_DIR, 'profile-images');
// Create directories if they don't exist
[UPLOAD_DIR, NOTE_IMAGES_DIR, GROUP_NOTE_IMAGES_DIR, PROFILE_IMAGES_DIR].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Allowed MIME types for images
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// File size limit (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;
/**
 * Create multer storage configuration for a specific destination
 */
const createStorage = (destination) => {
    const destMap = {
        'note-images': NOTE_IMAGES_DIR,
        'group-note-images': GROUP_NOTE_IMAGES_DIR,
        'profile-images': PROFILE_IMAGES_DIR
    };
    return multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const dir = destMap[destination];
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path_1.default.extname(file.originalname);
            const prefix = destination === 'profile-images' ? 'profile' : 'img';
            cb(null, `${prefix}-${uniqueSuffix}${ext}`);
        }
    });
};
/**
 * Image file filter
 */
const imageFileFilter = (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
    }
};
/**
 * Create multer upload instance for a specific destination
 */
const createUpload = (destination) => {
    return (0, multer_1.default)({
        storage: createStorage(destination),
        limits: { fileSize: MAX_FILE_SIZE },
        fileFilter: imageFileFilter
    });
};
exports.createUpload = createUpload;
// Pre-configured upload instances
exports.noteImageUpload = (0, exports.createUpload)('note-images').single('image');
exports.groupNoteImageUpload = (0, exports.createUpload)('group-note-images').single('image');
exports.profileImageUpload = (0, exports.createUpload)('profile-images').single('image');
/**
 * Get URL for an uploaded image
 */
const getImageUrl = (filename, destination) => {
    return `/${destination}/${filename}`;
};
exports.getImageUrl = getImageUrl;
/**
 * Delete an uploaded image
 */
const deleteImage = async (imageUrl) => {
    try {
        // imageUrl format: /note-images/filename.jpg or /group-note-images/filename.jpg
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
/**
 * Middleware to handle multer errors
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                error: 'El archivo es demasiado grande. Máximo 25MB'
            });
            return;
        }
        res.status(400).json({
            error: 'Error al subir el archivo'
        });
        return;
    }
    if (err) {
        res.status(400).json({
            error: err.message
        });
        return;
    }
    next();
};
exports.handleMulterError = handleMulterError;
// Export directories for reference
exports.UPLOAD_DIRECTORIES = {
    UPLOAD_DIR,
    NOTE_IMAGES_DIR,
    GROUP_NOTE_IMAGES_DIR,
    PROFILE_IMAGES_DIR
};
