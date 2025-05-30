// chatbotRoutes.ts
import express from 'express';
import { chatbotController } from '../controllers/chatbotController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Crear directorio si no existe
const uploadDir = 'uploads/chatbot-images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chatbot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB límite
});

// Middleware de autenticación
router.use(authenticateToken);

// Rutas del chatbot - limitadas a las funcionalidades requeridas
router.post('/process', chatbotController.processMessage);

export default router;
