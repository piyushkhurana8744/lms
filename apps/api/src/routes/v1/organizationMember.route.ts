import { Router } from 'express';
import { OrganizationMemberController } from '../../controllers/organizationMember.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Organization Member Routes
router.get('/', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_VIEW), OrganizationMemberController.listMembers);
router.post('/', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_INVITE), OrganizationMemberController.createEmployee);
router.post('/invite', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_INVITE), OrganizationMemberController.inviteMember);
router.get('/:memberId', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_VIEW), OrganizationMemberController.getMemberById);
router.put('/:memberId', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_UPDATE), OrganizationMemberController.updateEmployee);
router.patch('/:memberId/role', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_UPDATE), OrganizationMemberController.updateMemberRole);
router.patch('/:memberId/status', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_SUSPEND), OrganizationMemberController.updateMemberStatus);
router.delete('/:memberId', requirePermission(PERMISSIONS.ORGANIZATION_MEMBERS_REMOVE), OrganizationMemberController.removeMember);

export default router;
