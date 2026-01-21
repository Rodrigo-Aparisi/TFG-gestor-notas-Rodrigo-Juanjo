"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
// middleware/upload.ts
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configurar el almacenamiento
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Determinar la carpeta de destino según la ruta
        let uploadDir;
        if (req.originalUrl.includes('/user-groups')) {
            uploadDir = path_1.default.join(__dirname, '..', 'uploads', 'group-note-images');
        }
        else {
            uploadDir = path_1.default.join(__dirname, '..', 'uploads', 'note-images');
        }
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});
// Configurar multer
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB límite
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
        }
        cb(null, true);
    }
});
