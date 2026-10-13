import { Router } from 'express';
import { ClassController } from '../../controllers/class.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Class Management Routes
router.get('/', requirePermission(PERMISSIONS.CLASS_VIEW), ClassController.listClasses);
router.post('/', requirePermission(PERMISSIONS.CLASS_CREATE), ClassController.createClass);
router.get('/:id', requirePermission(PERMISSIONS.CLASS_VIEW), ClassController.getClass);
router.put('/:id', requirePermission(PERMISSIONS.CLASS_UPDATE), ClassController.updateClass);
router.delete('/:id', requirePermission(PERMISSIONS.CLASS_DELETE), ClassController.deleteClass);

// Student Enrollment Routes with Seat Cap Checking
router.post('/:id/enroll', requirePermission(PERMISSIONS.CLASS_ENROLL), ClassController.enrollStudent);
router.post('/:id/unenroll', requirePermission(PERMISSIONS.CLASS_ENROLL), ClassController.unenrollStudent);
router.delete('/:id/students/:studentId', requirePermission(PERMISSIONS.CLASS_ENROLL), ClassController.unenrollStudent);

export default router;
