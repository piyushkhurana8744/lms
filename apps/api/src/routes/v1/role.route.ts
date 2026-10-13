import { Router } from 'express';
import { RoleController } from '../../controllers/role.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(tenantResolverMiddleware);

router.get('/permissions', RoleController.getPermissions);
router.get('/', requirePermission(PERMISSIONS.ROLE_VIEW), RoleController.getRoles);
router.post('/', requirePermission(PERMISSIONS.ROLE_MANAGE), RoleController.createRole);
router.patch('/:id', requirePermission(PERMISSIONS.ROLE_MANAGE), RoleController.updateRole);
router.delete('/:id', requirePermission(PERMISSIONS.ROLE_MANAGE), RoleController.deleteRole);

export default router;
