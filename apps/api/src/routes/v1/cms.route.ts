import { Router } from 'express';
import { CmsController } from '../../controllers/cms.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(tenantResolverMiddleware);

// Protected Tenant Admin CMS Routes
router.get('/', requirePermission(PERMISSIONS.COURSE_VIEW), CmsController.getCmsConfig);
router.patch('/', requirePermission(PERMISSIONS.COURSE_UPDATE), CmsController.updateCmsConfig);

export default router;
