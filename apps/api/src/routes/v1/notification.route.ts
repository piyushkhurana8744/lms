import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { NotificationController } from '../../controllers/notification.controller';
const router: Router = Router(); router.use(authenticate, ensureWorkspaceContext);
router.get('/', NotificationController.list); router.get('/unread-count', NotificationController.unreadCount);
router.get('/preferences', NotificationController.preferences); router.put('/preferences', NotificationController.updatePreferences);
router.post('/mark-all-read', NotificationController.markAllRead); router.post('/:id/read', NotificationController.read); router.post('/:id/unread', NotificationController.unread);
export default router;
