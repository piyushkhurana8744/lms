import { Router } from 'express';
import { OrganizationBrandingController } from '../../controllers/organizationBranding.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Organization Branding Routes
router.get('/', requirePermission(PERMISSIONS.ORGANIZATION_BRANDING_VIEW), OrganizationBrandingController.getBranding);
router.patch('/', requirePermission(PERMISSIONS.ORGANIZATION_BRANDING_UPDATE), OrganizationBrandingController.updateBranding);
router.post('/reset', requirePermission(PERMISSIONS.ORGANIZATION_BRANDING_UPDATE), OrganizationBrandingController.resetBranding);

export default router;
