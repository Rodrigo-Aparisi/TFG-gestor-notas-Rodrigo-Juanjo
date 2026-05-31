import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticateToken } from '../middleware/auth';
import { profileImageUpload } from '../middleware/upload';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../validation/schemas/user.schema';

interface RequestWithFileAndUser extends Request {
  file?: Express.Multer.File;
}

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de perfil y cuenta
router.put('/update', validate(updateUserSchema), (req: Request, res: Response, next: NextFunction) => {
  return accountController.updateUser(req, res, next);
});

router.get('/profile', (req: Request, res: Response, next: NextFunction) => {
  return accountController.getProfile(req, res, next);
});

router.delete('/delete', (req: Request, res: Response, next: NextFunction) => {
  return accountController.deleteAccount(req, res, next);
});

// Rutas de configuración
router.get('/settings', (req: Request, res: Response, next: NextFunction) => {
  return accountController.getUserSettings(req, res, next);
});

router.put('/settings', (req: Request, res: Response, next: NextFunction) => {
  return accountController.updateUserSettings(req, res, next);
});

// Ruta para subir imagen de perfil
router.post(
  '/upload-profile-image',
  profileImageUpload.single('image'),
  async (req: RequestWithFileAndUser, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
      }
      return accountController.uploadProfileImage(req as any, res, next);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
