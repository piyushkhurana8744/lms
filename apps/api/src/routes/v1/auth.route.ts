import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router: Router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.get('/me', authenticate, AuthController.getMe);

export default router;
