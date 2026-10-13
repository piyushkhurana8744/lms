import { Router } from 'express';
import { PlatformController } from '../../controllers/platform.controller';
import { authenticate, requireSuperAdmin } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(tenantResolverMiddleware);

// Platform Command Center Summary (Permission-Protected)
router.get(
  '/command-center/summary',
  requirePermission(PERMISSIONS.PLATFORM_ANALYTICS_VIEW),
  PlatformController.getCommandCenterSummary
);

// SuperAdmin User Directory
router.get(
  '/users',
  requireSuperAdmin,
  PlatformController.getUsers
);

// Impersonation Status (accessible by active session)
router.get(
  '/impersonation/status',
  PlatformController.getImpersonationStatus
);

// Start Impersonation (SuperAdmin only)
router.post(
  '/impersonation/start',
  requireSuperAdmin,
  PlatformController.impersonateUser
);

// Exit Impersonation (accessible by the active impersonated session)
router.post(
  '/impersonation/exit',
  PlatformController.exitImpersonation
);

// Legacy/Compatibility Aliases
router.post(
  '/impersonate/exit',
  PlatformController.exitImpersonation
);

router.post(
  '/impersonate/:userId',
  requireSuperAdmin,
  PlatformController.impersonateUser
);

// Platform Tenant Switcher
router.post(
  '/switch-tenant/:tenantId',
  requireSuperAdmin,
  PlatformController.switchTenant
);

export default router;

