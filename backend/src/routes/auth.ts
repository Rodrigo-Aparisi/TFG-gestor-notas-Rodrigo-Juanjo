import { Router } from 'express';
import { register, login, refreshAccessToken, logout } from '../controllers/auth.controller';
import { validateRegister } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes with rate limiting
router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshAccessToken);

// Protected routes
router.post('/logout', authenticateToken, logout);

export default router;
