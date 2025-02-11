import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas existentes
router.put('/update', accountController.updateUser);
router.get('/profile', accountController.getProfile);
router.delete('/delete', accountController.deleteAccount);

// Nuevas rutas para la configuración
router.get('/settings', accountController.getUserSettings);
router.put('/settings', accountController.updateUserSettings);

export default router;
