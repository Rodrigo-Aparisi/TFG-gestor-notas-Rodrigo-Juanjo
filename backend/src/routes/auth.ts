import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validateRegister } from '../middleware/validation';

const router = Router();

// Define los tipos correctamente
router.post('/register', validateRegister, register);
router.post('/login', login);

export default router;
