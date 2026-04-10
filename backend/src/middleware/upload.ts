// middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Allowed MIME types and their corresponding safe extensions
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

// Configurar el almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar la carpeta de destino según la ruta
    let uploadDir;

    if (req.originalUrl.includes('/user-groups')) {
      uploadDir = path.join(__dirname, '..', 'uploads', 'group-note-images');
    } else {
      uploadDir = path.join(__dirname, '..', 'uploads', 'note-images');
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use only the validated extension derived from MIME type — never trust file.originalname
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configurar multer
export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = Object.keys(ALLOWED_MIME_TO_EXT);
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
    }
    cb(null, true);
  }
});