import { Router } from 'express';
import { EnrollmentController } from '../../controllers/enrollment.controller';
import { ProgressController } from '../../controllers/progress.controller';
import { StudentLearningController } from '../../controllers/studentLearning.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantResolverMiddleware } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(tenantResolverMiddleware);

import { FinanceController } from '../../controllers/finance.controller';
import { AttendanceController } from '../../controllers/attendance.controller';
import { CertificateController } from '../../controllers/certificate.controller';

// Student Dashboard Overview
router.get('/dashboard', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), StudentLearningController.getDashboard);

// Student Enrollments Routes
router.get('/enrollments', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), EnrollmentController.getMyEnrollments);
router.get('/enrollments/:courseId', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), EnrollmentController.getMyEnrollmentForCourse);

// Student Course Overview & Resume
router.get('/courses/:courseId/overview', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), StudentLearningController.getCourseOverview);
router.get('/courses/:courseId/resume', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), StudentLearningController.getCourseResume);
router.get('/courses/:courseId/lessons/:lessonId/player', requirePermission(PERMISSIONS.ENROLLMENT_VIEW), StudentLearningController.getLessonPlayer);

// Student Course Progress Routes
router.get('/courses/:courseId/progress', requirePermission(PERMISSIONS.PROGRESS_VIEW), ProgressController.getCourseProgress);
router.get('/courses/:courseId/lessons/:lessonId/progress', requirePermission(PERMISSIONS.PROGRESS_VIEW), ProgressController.getLessonProgress);
router.patch('/courses/:courseId/lessons/:lessonId/progress', requirePermission(PERMISSIONS.PROGRESS_UPDATE), ProgressController.updateLessonProgress);
router.post('/courses/:courseId/lessons/:lessonId/complete', requirePermission(PERMISSIONS.PROGRESS_UPDATE), ProgressController.completeLesson);

// Student Fees & Finance Self-Service (Phase 11)
router.get('/fees', requirePermission(PERMISSIONS.FEE_VIEW), FinanceController.getStudentFeesOverview);
router.get('/receipts/:id', requirePermission(PERMISSIONS.FEE_VIEW), FinanceController.getStudentReceiptById);
router.get('/receipts/:id/download', requirePermission(PERMISSIONS.FEE_VIEW), FinanceController.downloadStudentReceiptArtifact);
router.get('/attendance/summary', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), AttendanceController.studentSummary);
router.get('/attendance/history', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), AttendanceController.studentHistory);
router.get('/certificates', requirePermission(PERMISSIONS.CERTIFICATE_OWN_VIEW), CertificateController.studentList);
router.get('/certificates/:id/download', requirePermission(PERMISSIONS.CERTIFICATE_OWN_VIEW), CertificateController.studentDownload);

export default router;
