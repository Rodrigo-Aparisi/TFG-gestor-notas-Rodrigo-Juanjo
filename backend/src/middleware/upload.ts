import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { safeDeleteFile } from '../utils/pathHelpers';
import { logger } from '../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (Object.keys(ALLOWED_MIME_TO_EXT).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
  }
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Storage: notes and group notes (routed by request URL) ───────────────────

const noteStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = req.originalUrl.includes('/user-groups')
      ? path.join(UPLOADS_DIR, 'group-note-images')
      : path.join(UPLOADS_DIR, 'note-images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/** Multer instance for note images and group note images. */
export const upload = multer({
  storage: noteStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

// ─── Storage: profile images ──────────────────────────────────────────────────

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'profile-images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

/** Multer instance for profile images. */
export const profileImageUpload = multer({
  storage: profileStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

// ─── Middleware: error handler ────────────────────────────────────────────────

export const handleMulterError = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 25MB' });
      return;
    }
    res.status(400).json({ error: 'Error al subir el archivo' });
    return;
  }
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  next();
};

// ─── Utility: safe image deletion ─────────────────────────────────────────────

/**
 * Safely deletes an uploaded image using path traversal prevention.
 * imageUrl is the value stored in the DB, e.g. "/note-images/abc.jpg".
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const relativePath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const deleted = await safeDeleteFile(relativePath, UPLOADS_DIR);
    if (!deleted) {
      logger.warn('No se pudo eliminar imagen (ruta insegura o archivo no encontrado)', { imageUrl });
    }
  } catch (err) {
    logger.error('Error inesperado al eliminar imagen', { imageUrl, err });
  }
};
