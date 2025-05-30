import express from 'express';
import { passwordController } from '../controllers/passwordController';

const router = express.Router();

// Ruta para solicitar recuperación de contraseña
router.post('/request-reset', passwordController.requestReset);

// Ruta para validar token
router.get('/validate-token/:token', passwordController.validateToken);

// Ruta para cambiar contraseña con token
router.post('/reset', passwordController.resetPassword);

export default router;
