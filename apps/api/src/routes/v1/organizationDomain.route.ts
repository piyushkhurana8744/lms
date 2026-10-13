import { Router } from 'express';
import { OrganizationDomainController } from '../../controllers/organizationDomain.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Organization Domain Routes
router.get('/domain', requirePermission(PERMISSIONS.ORGANIZATION_DOMAIN_VIEW), OrganizationDomainController.getDomain);
router.patch('/domain', requirePermission(PERMISSIONS.ORGANIZATION_DOMAIN_UPDATE), OrganizationDomainController.configureCustomDomain);
router.post('/domain/verify', requirePermission(PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY), OrganizationDomainController.verifyDomain);
router.post('/domain/activate', requirePermission(PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY), OrganizationDomainController.activateDomain);
router.delete('/domain', requirePermission(PERMISSIONS.ORGANIZATION_DOMAIN_DISCONNECT), OrganizationDomainController.disconnectDomain);

// Protected White-label Settings Routes
router.get('/whitelabel', requirePermission(PERMISSIONS.ORGANIZATION_DOMAIN_VIEW), OrganizationDomainController.getWhiteLabelSettings);
router.patch('/whitelabel', requirePermission(PERMISSIONS.ORGANIZATION_WHITELABEL_UPDATE), OrganizationDomainController.updateWhiteLabelSettings);

export default router;
