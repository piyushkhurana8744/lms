import { Router } from 'express';
import { OrganizationStorageController } from '../../controllers/organizationStorage.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Storage Configuration Routes
router.get('/', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_VIEW), OrganizationStorageController.getStorageConfiguration);
router.put('/', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE), OrganizationStorageController.saveStorageConfiguration);
router.post('/test', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_VIEW), OrganizationStorageController.testStorageConnection);
router.post('/enable', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE), OrganizationStorageController.enableStorage);
router.post('/disable', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE), OrganizationStorageController.disableStorage);
router.delete('/', requirePermission(PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE), OrganizationStorageController.deleteStorageConfiguration);

export default router;
