import { Router } from 'express';
import { UserController } from '../../controllers/user.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.get('/me', UserController.getProfile);
router.patch('/me', UserController.updateProfile);
router.get('/sessions', UserController.getActiveSessions);
router.delete('/sessions/:sessionId', UserController.revokeSession);

// Workspace Context Switching API
router.post('/workspace/switch', UserController.switchWorkspace);

export default router;
