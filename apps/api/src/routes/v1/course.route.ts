import { Router } from 'express';
import { CourseController } from '../../controllers/course.controller';
import { CoursePublishingController } from '../../controllers/coursePublishing.controller';
import { EnrollmentController } from '../../controllers/enrollment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(tenantResolverMiddleware);

// Course Routing & Permission Protection (STEP 3A)
router.get('/', requirePermission(PERMISSIONS.COURSE_VIEW), CourseController.listCourses);
router.get('/:courseId', requirePermission(PERMISSIONS.COURSE_VIEW), CourseController.getCourseById);
router.post('/', requirePermission(PERMISSIONS.COURSE_CREATE), CourseController.createCourse);
router.patch('/:courseId', requirePermission(PERMISSIONS.COURSE_UPDATE), CourseController.updateCourse);
router.delete('/:courseId', requirePermission(PERMISSIONS.COURSE_ARCHIVE), CourseController.archiveCourse);

// Course Publishing & Readiness Routes (STEP 3F)
router.get('/:courseId/readiness', requirePermission(PERMISSIONS.COURSE_VIEW), CoursePublishingController.getCourseReadiness);
router.post('/:courseId/submit-review', requirePermission(PERMISSIONS.COURSE_SUBMIT_REVIEW), CoursePublishingController.submitForReview);
router.post('/:courseId/publish', requirePermission(PERMISSIONS.COURSE_PUBLISH), CoursePublishingController.publishCourse);
router.post('/:courseId/unpublish', requirePermission(PERMISSIONS.COURSE_PUBLISH), CoursePublishingController.unpublishCourse);

// Enrollment Routes (STEP 4)
router.post('/:courseId/enroll', requirePermission(PERMISSIONS.ENROLLMENT_CREATE), EnrollmentController.enrollInCourse);
router.get('/:courseId/enrollments', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), EnrollmentController.getCourseEnrollments);
router.delete('/:courseId/enrollments/:enrollmentId', requirePermission(PERMISSIONS.ENROLLMENT_UPDATE), EnrollmentController.cancelEnrollment);

export default router;
