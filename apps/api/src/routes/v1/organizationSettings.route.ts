import { Router } from 'express';
import { OrganizationSettingsController } from '../../controllers/organizationSettings.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

import organizationStorageRouter from './organizationStorage.route';
import organizationBrandingRouter from './organizationBranding.route';
import organizationWebsiteRouter from './organizationWebsite.route';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Organization Settings Subrouters
router.use('/storage', organizationStorageRouter);
router.use('/branding', organizationBrandingRouter);
router.use('/website', organizationWebsiteRouter);

// Organization Settings & Setup Progress Routes
router.get('/', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_VIEW), OrganizationSettingsController.getSettings);
router.patch('/profile', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE), OrganizationSettingsController.updateProfile);
router.patch('/preferences', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE), OrganizationSettingsController.updatePreferences);
router.get('/setup-progress', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_VIEW), OrganizationSettingsController.getSetupProgress);

export default router;


