import { Router } from 'express';
import { PERMISSIONS } from '@edtech/permissions';
import { BranchController } from '../../controllers/branch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router: Router = Router();
router.use(authenticate, ensureWorkspaceContext);
router.get('/accessible', requirePermission(PERMISSIONS.BRANCH_VIEW), BranchController.accessible);
router.get('/', requirePermission(PERMISSIONS.BRANCH_VIEW), BranchController.list);
router.post('/', requirePermission(PERMISSIONS.BRANCH_MANAGE), BranchController.create);
router.get('/:branchId', requirePermission(PERMISSIONS.BRANCH_VIEW), BranchController.get);
router.patch('/:branchId', requirePermission(PERMISSIONS.BRANCH_MANAGE), BranchController.update);
router.post('/:branchId/archive', requirePermission(PERMISSIONS.BRANCH_MANAGE), BranchController.archive);
router.put('/members/:memberId/access', requirePermission(PERMISSIONS.BRANCH_STAFF_MANAGE), BranchController.memberAccess);
export default router;
