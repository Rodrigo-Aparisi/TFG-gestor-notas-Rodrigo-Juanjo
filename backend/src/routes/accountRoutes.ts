import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../config/multerConfigPFP';
import { Request, Response, NextFunction } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

interface RequestWithFileAndUser extends RequestWithUser {
  file?: Express.Multer.File;
}

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de perfil y cuenta
router.put('/update', authenticateToken, (req: Request, res: Response) => {
  return accountController.updateUser(req, res);
});


router.get('/profile', (req: Request, res: Response) => {
  return accountController.getProfile(req, res);
});

router.delete('/delete', (req: Request, res: Response) => {
  return accountController.deleteAccount(req, res);
});

// Rutas de configuración
router.get('/settings', (req: Request, res: Response) => {
  return accountController.getUserSettings(req, res);
});

router.put('/settings', (req: Request, res: Response) => {
  return accountController.updateUserSettings(req, res);
});

// Ruta para subir imagen de perfil
router.post(
  '/upload-profile-image',
  upload.single('image'),
  async (req: RequestWithFileAndUser, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
      }
      return accountController.uploadProfileImage(req as any, res);
    } catch (error) {
      console.error('Error en la ruta de subida de imagen:', error);
      return res.status(500).json({ 
        error: 'Error al procesar la imagen',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

// Middleware para manejar errores
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error en las rutas de cuenta:', err);
  return res.status(500).json({ 
    error: 'Error interno del servidor',
    details: err instanceof Error ? err.message : 'Error desconocido'
  });
});

export default router;
