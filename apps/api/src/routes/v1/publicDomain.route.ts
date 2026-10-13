import { Router } from 'express';
import { OrganizationDomainController } from '../../controllers/organizationDomain.controller';
import { publicTenantResolverMiddleware } from '../../controllers/public.controller';

const router: Router = Router();

router.use(publicTenantResolverMiddleware);

// Public domain configuration endpoint
router.get('/domain', OrganizationDomainController.getPublicDomainConfiguration);

export default router;
