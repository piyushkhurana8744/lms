import { Router } from 'express';
import { CRMIntegrationController } from '../../controllers/crmIntegration.controller';

const router: Router = Router();
router.post('/webhook', CRMIntegrationController.webhook);
export default router;
