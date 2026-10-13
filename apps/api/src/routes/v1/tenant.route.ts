import { Router } from 'express';
import { TenantController } from '../../controllers/tenant.controller';
import { authenticate, requireSuperAdmin } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

// Public Tenant Branding Resolution
router.get('/branding', TenantController.getTenantBranding);

// Protected Tenant Management Operations
router.use(authenticate);
router.get('/', requireSuperAdmin, requirePermission(PERMISSIONS.TENANT_VIEW), TenantController.getAllTenants);
router.post('/', requireSuperAdmin, requirePermission(PERMISSIONS.TENANT_MANAGE), TenantController.createTenant);
router.get('/:id', requireSuperAdmin, requirePermission(PERMISSIONS.TENANT_VIEW), TenantController.getTenantById);
router.patch('/:id/status', requireSuperAdmin, requirePermission(PERMISSIONS.TENANT_MANAGE), TenantController.updateTenantStatus);

export default router;
