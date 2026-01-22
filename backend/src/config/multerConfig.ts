import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Upload directories
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const NOTE_IMAGES_DIR = path.join(UPLOAD_DIR, 'note-images');
const GROUP_NOTE_IMAGES_DIR = path.join(UPLOAD_DIR, 'group-note-images');
const PROFILE_IMAGES_DIR = path.join(UPLOAD_DIR, 'profile-images');

// Create directories if they don't exist
[UPLOAD_DIR, NOTE_IMAGES_DIR, GROUP_NOTE_IMAGES_DIR, PROFILE_IMAGES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed MIME types for images
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File size limit (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Types for upload destinations
export type UploadDestination = 'note-images' | 'group-note-images' | 'profile-images';

// Interface for uploaded file
export interface UploadedFile extends Express.Multer.File {
  filename: string;
}

// Interface for request with file
export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

/**
 * Create multer storage configuration for a specific destination
 */
const createStorage = (destination: UploadDestination) => {
  const destMap: Record<UploadDestination, string> = {
    'note-images': NOTE_IMAGES_DIR,
    'group-note-images': GROUP_NOTE_IMAGES_DIR,
    'profile-images': PROFILE_IMAGES_DIR
  };

  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = destMap[destination];
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const prefix = destination === 'profile-images' ? 'profile' : 'img';
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });
};

/**
 * Image file filter
 */
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
  }
};

/**
 * Create multer upload instance for a specific destination
 */
export const createUpload = (destination: UploadDestination) => {
  return multer({
    storage: createStorage(destination),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: imageFileFilter
  });
};

// Pre-configured upload instances
export const noteImageUpload = createUpload('note-images').single('image');
export const groupNoteImageUpload = createUpload('group-note-images').single('image');
export const profileImageUpload = createUpload('profile-images').single('image');

/**
 * Get URL for an uploaded image
 */
export const getImageUrl = (filename: string, destination: UploadDestination): string => {
  return `/${destination}/${filename}`;
};

/**
 * Delete an uploaded image
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // imageUrl format: /note-images/filename.jpg or /group-note-images/filename.jpg
    const filePath = path.join(__dirname, '..', 'uploads', imageUrl);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Error al eliminar la imagen');
  }
};

/**
 * Middleware to handle multer errors
 */
export const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
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

// Export directories for reference
export const UPLOAD_DIRECTORIES = {
  UPLOAD_DIR,
  NOTE_IMAGES_DIR,
  GROUP_NOTE_IMAGES_DIR,
  PROFILE_IMAGES_DIR
};
