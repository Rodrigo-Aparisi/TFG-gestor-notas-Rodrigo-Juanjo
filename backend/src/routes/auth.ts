import { Router } from 'express';
import { register, login, refreshAccessToken, logout } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validation/schemas/user.schema';

const router = Router();

// Public routes with rate limiting and Zod validation
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/refresh', refreshAccessToken);

// Protected routes
router.post('/logout', authenticateToken, logout);

export default router;
