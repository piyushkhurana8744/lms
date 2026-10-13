import { Router } from 'express';
import { HealthController } from '../../controllers/health.controller';

const router: Router = Router();

router.get('/live', HealthController.getLive);
router.get('/ready', HealthController.getReady);
router.get('/', HealthController.getHealth);

export default router;
