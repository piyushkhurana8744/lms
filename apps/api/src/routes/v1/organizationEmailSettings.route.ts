import { Router } from 'express';
import { OrganizationEmailSettingsController } from '../../controllers/organizationEmailSettings.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Email Configuration Routes
router.get('/email', requirePermission(PERMISSIONS.ORGANIZATION_EMAIL_VIEW), OrganizationEmailSettingsController.getEmailSettings);
router.patch('/email', requirePermission(PERMISSIONS.ORGANIZATION_EMAIL_UPDATE), OrganizationEmailSettingsController.updateEmailSettings);
router.post('/email/verify', requirePermission(PERMISSIONS.ORGANIZATION_EMAIL_TEST), OrganizationEmailSettingsController.verifyEmailSettings);
router.post('/email/test', requirePermission(PERMISSIONS.ORGANIZATION_EMAIL_TEST), OrganizationEmailSettingsController.sendTestEmail);
router.delete('/email', requirePermission(PERMISSIONS.ORGANIZATION_EMAIL_DELETE), OrganizationEmailSettingsController.deleteEmailSettings);

// Protected Notification Preferences Routes
router.get('/notifications', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_VIEW), OrganizationEmailSettingsController.getNotificationPreferences);
router.patch('/notifications', requirePermission(PERMISSIONS.ORGANIZATION_NOTIFICATIONS_UPDATE), OrganizationEmailSettingsController.updateNotificationPreferences);

export default router;
