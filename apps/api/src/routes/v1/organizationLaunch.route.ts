import { Router } from 'express';
import { OrganizationLaunchController } from '../../controllers/organizationLaunch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Organization Launch Readiness & Launch Endpoints (STEP 4J)
router.get(
  '/readiness',
  requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE),
  OrganizationLaunchController.getReadiness
);

router.post(
  '/',
  requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE),
  OrganizationLaunchController.launch
);

export default router;
