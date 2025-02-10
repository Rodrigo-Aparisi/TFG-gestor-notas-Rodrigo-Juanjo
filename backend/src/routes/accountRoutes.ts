import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas de cuenta requieren autenticación
router.use(authenticateToken);

// Actualizar usuario
router.put('/update', accountController.updateUser);

// Obtener perfil
router.get('/profile', accountController.getProfile);

// Eliminar cuenta
router.delete('/delete', accountController.deleteAccount);

export default router;
