import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Crear el directorio de uploads si no existe
const uploadDir = path.join(__dirname, '..','..','public', 'uploads');
const profileImagesDir = path.join('profile-images');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(profileImagesDir)) {
    fs.mkdirSync(profileImagesDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

export const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
