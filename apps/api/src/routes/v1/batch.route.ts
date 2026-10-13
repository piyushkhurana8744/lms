import { Router } from 'express';
import { BatchController } from '../../controllers/batch.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Protected Batch Management Routes
router.get('/', requirePermission(PERMISSIONS.BATCH_VIEW), BatchController.listBatches);
router.post('/', requirePermission(PERMISSIONS.BATCH_CREATE), BatchController.createBatch);
router.get('/:batchId', requirePermission(PERMISSIONS.BATCH_VIEW), BatchController.getBatchById);
router.put('/:batchId', requirePermission(PERMISSIONS.BATCH_UPDATE), BatchController.updateBatch);
router.delete('/:batchId', requirePermission(PERMISSIONS.BATCH_DELETE), BatchController.deleteBatch);

export default router;
