import { Router } from 'express';
import { OrganizationOnboardingController } from '../../controllers/organizationOnboarding.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Organization Onboarding Routes
router.get('/', requirePermission(PERMISSIONS.ORGANIZATION_ONBOARDING_VIEW), OrganizationOnboardingController.getOnboardingProgress);
router.patch('/progress', requirePermission(PERMISSIONS.ORGANIZATION_ONBOARDING_UPDATE), OrganizationOnboardingController.updateProgress);
router.post('/complete', requirePermission(PERMISSIONS.ORGANIZATION_ONBOARDING_UPDATE), OrganizationOnboardingController.completeOnboarding);
router.post('/skip', requirePermission(PERMISSIONS.ORGANIZATION_ONBOARDING_UPDATE), OrganizationOnboardingController.skipOnboarding);

export default router;
