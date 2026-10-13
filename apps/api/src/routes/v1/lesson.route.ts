import { Router } from 'express';
import { LessonController } from '../../controllers/lesson.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(tenantResolverMiddleware);

// Lesson Routing & Permission Protection (STEP 3C)
router.get('/', requirePermission(PERMISSIONS.LESSON_VIEW), LessonController.listLessons);
router.get('/:lessonId', requirePermission(PERMISSIONS.LESSON_VIEW), LessonController.getLessonById);
router.post('/', requirePermission(PERMISSIONS.LESSON_CREATE), LessonController.createLesson);
router.patch('/reorder', requirePermission(PERMISSIONS.LESSON_UPDATE), LessonController.reorderLessons);
router.patch('/:lessonId', requirePermission(PERMISSIONS.LESSON_UPDATE), LessonController.updateLesson);
router.delete('/:lessonId', requirePermission(PERMISSIONS.LESSON_ARCHIVE), LessonController.archiveLesson);

export default router;
