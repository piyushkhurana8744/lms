import { Router } from 'express';
import { StudentLifecycleController } from '../../controllers/studentLifecycle.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Student Self-Service Routes (Derived from Auth Token)
router.get('/self/profile', StudentLifecycleController.getOwnProfile);
router.get('/self/timeline', StudentLifecycleController.getOwnTimeline);

// Admin Student Directory & Lifecycle Inspection
router.get('/', requirePermission(PERMISSIONS.STUDENT_DIRECTORY_VIEW), StudentLifecycleController.list);
router.get('/:id', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_VIEW), StudentLifecycleController.getById);
router.get('/profile/:studentUserId', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_VIEW), StudentLifecycleController.getProfile);
router.get('/timeline/:studentUserId', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_VIEW), StudentLifecycleController.getTimeline);

// Context-Valid Lifecycle State Machine Transitions
router.post('/:id/activate', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_ACTIVATE), StudentLifecycleController.activate);
router.post('/:id/transfer', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_TRANSFER), StudentLifecycleController.transfer);
router.post('/:id/branch-transfer', requirePermission(PERMISSIONS.STUDENT_BRANCH_TRANSFER), StudentLifecycleController.transferBranch);
router.post('/:id/hold', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_HOLD), StudentLifecycleController.hold);
router.post('/:id/resume', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_RESUME), StudentLifecycleController.resume);
router.post('/:id/withdraw', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_WITHDRAW), StudentLifecycleController.withdraw);
router.post('/:id/drop', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_DROP), StudentLifecycleController.drop);
router.post('/:id/complete', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_COMPLETE), StudentLifecycleController.complete);
router.post('/:id/reactivate', requirePermission(PERMISSIONS.STUDENT_LIFECYCLE_REACTIVATE), StudentLifecycleController.reactivate);

export default router;
