// middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

// Configurar multer
export const upload = multer({
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