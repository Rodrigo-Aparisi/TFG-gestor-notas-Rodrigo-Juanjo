import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuración de directorios
const uploadDir = path.join(__dirname, '..', 'uploads');
const noteImagesDir = path.join(uploadDir, 'note-images');

// Crear directorios si no existen
[uploadDir, noteImagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuración de almacenamiento para imágenes de notas
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, noteImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `note-${uniqueSuffix}${ext}`);
    }
});

// Configuración de multer
export const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB límite
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
        }
    }
});

// Función helper para obtener la URL de la imagen
export const getImageUrl = (filename: string): string => {
    return `/note-images/${filename}`;
};

// Función para eliminar una imagen
export const deleteImage = async (imageUrl: string): Promise<void> => {
    try {
        const filePath = path.join(__dirname, '..', 'uploads', imageUrl);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        throw new Error('Error al eliminar la imagen');
    }
};

// Interface para tipado
export interface UploadedFile extends Express.Multer.File {
    filename: string;
}

// Middleware para manejar errores de multer
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
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
