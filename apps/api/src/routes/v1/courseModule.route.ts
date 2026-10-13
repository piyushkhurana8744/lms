import { Router } from 'express';
import { CourseModuleController } from '../../controllers/courseModule.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(tenantResolverMiddleware);

// Course Module Routing & Permission Protection (STEP 3B)
router.get('/', requirePermission(PERMISSIONS.COURSE_MODULE_VIEW), CourseModuleController.listModules);
router.get('/:moduleId', requirePermission(PERMISSIONS.COURSE_MODULE_VIEW), CourseModuleController.getModuleById);
router.post('/', requirePermission(PERMISSIONS.COURSE_MODULE_CREATE), CourseModuleController.createModule);
router.patch('/reorder', requirePermission(PERMISSIONS.COURSE_MODULE_UPDATE), CourseModuleController.reorderModules);
router.patch('/:moduleId', requirePermission(PERMISSIONS.COURSE_MODULE_UPDATE), CourseModuleController.updateModule);
router.delete('/:moduleId', requirePermission(PERMISSIONS.COURSE_MODULE_ARCHIVE), CourseModuleController.archiveModule);

export default router;
