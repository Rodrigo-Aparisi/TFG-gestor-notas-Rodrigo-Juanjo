"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadDir = path_1.default.join(__dirname, '..', 'uploads');
const profileImagesDir = path_1.default.join(__dirname, '..', 'uploads', 'profile-images');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
if (!fs_1.default.existsSync(profileImagesDir)) {
    fs_1.default.mkdirSync(profileImagesDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `profile-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    },
    limits: {
        fileSize: 25 * 1024 * 1024
    }
});
