import { Router } from 'express';
import { PublicWebsiteController } from '../../controllers/publicWebsite.controller';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';

const router: Router = Router();

router.use(ensureWorkspaceContext);

// Public Tenant Website Endpoints
router.get('/', PublicWebsiteController.getPublicWebsite);
router.get('/navigation', PublicWebsiteController.getPublicNavigation);
router.get('/homepage', PublicWebsiteController.getPublicHomepage);

export default router;
