import { Router } from 'express';
import { AccountController } from '../controllers/accountController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const accountController = new AccountController();

router.put('/update', authenticateToken, accountController.updateUser.bind(accountController));
router.get('/profile', authenticateToken, accountController.getProfile.bind(accountController));
router.delete('/delete', authenticateToken, accountController.deleteAccount.bind(accountController));

export default router;
