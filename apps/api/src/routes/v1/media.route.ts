import { Router } from 'express';
import multer from 'multer';
import { MediaController } from '../../controllers/media.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 524288000 } // Max 500 MB upload limit
});

const router: Router = Router();

router.use(authenticate);

// 1. Upload Media Routes - Run multer first then tenantResolverMiddleware to guarantee WorkspaceContext scope
router.post(
  '/',
  upload.single('file'),
  tenantResolverMiddleware,
  requirePermission(PERMISSIONS.MEDIA_UPLOAD),
  MediaController.uploadMedia
);

router.post(
  '/upload',
  upload.single('file'),
  tenantResolverMiddleware,
  requirePermission(PERMISSIONS.MEDIA_UPLOAD),
  MediaController.uploadMedia
);

// 2. All other routes run tenantResolverMiddleware
router.use(tenantResolverMiddleware);

router.get(
  '/',
  requirePermission(PERMISSIONS.MEDIA_VIEW),
  MediaController.listMedia
);

router.get(
  '/file/*',
  requirePermission(PERMISSIONS.MEDIA_VIEW),
  MediaController.serveMediaFile
);

router.get(
  '/:mediaId/url',
  requirePermission(PERMISSIONS.MEDIA_VIEW),
  MediaController.getMediaSignedUrl
);

router.get(
  '/:mediaId',
  requirePermission(PERMISSIONS.MEDIA_VIEW),
  MediaController.getMediaById
);

router.delete(
  '/:mediaId',
  requirePermission(PERMISSIONS.MEDIA_DELETE),
  MediaController.deleteMedia
);

export default router;
