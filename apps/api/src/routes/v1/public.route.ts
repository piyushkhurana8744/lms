import { Router } from 'express';
import { PublicController } from '../../controllers/public.controller';
import { PublicCourseController } from '../../controllers/publicCourse.controller';
import { BatchController } from '../../controllers/batch.controller';
import { ClassController } from '../../controllers/class.controller';
import { AssessmentController } from '../../controllers/assessment.controller';
import { CRMController } from '../../controllers/crm.controller';
import { publicTenantMiddleware } from '../../middleware/publicTenant.middleware';
import publicWebsiteRouter from './publicWebsite.route';
import { CertificateController } from '../../controllers/certificate.controller';

const router: Router = Router();

router.get('/certificates/verify/:code', CertificateController.verify);

// Apply unauthenticated public tenant resolution middleware
router.use(publicTenantMiddleware);

// Public Lead Inquiry Capture
router.post('/inquiry', CRMController.capturePublicInquiry);

// Public Read-Only Endpoints (STEP 4A, 5A, & 5B)
router.use('/website', publicWebsiteRouter);
router.get('/site', PublicController.getPublicSiteConfig);
router.get('/organization', PublicController.getPublicOrganization);
router.get('/branding', PublicController.getTenantBranding);
router.get('/tenant/branding', PublicController.getTenantBranding);
router.get('/tenant/website', PublicController.getPublicWebsiteConfig);
router.get('/tenant/status', PublicController.getTenantPublicStatus);
router.get('/status', PublicController.getTenantPublicStatus);

// STEP 5B & 5C Public Course & Curriculum Endpoints
router.get('/courses', PublicCourseController.listCourses);
router.get('/courses/:slug/batches', BatchController.listCoursePublicBatches);
router.get('/courses/:slug/curriculum', PublicCourseController.getPublicCurriculum);
router.get('/courses/:slug/lessons/:lessonId/preview', PublicCourseController.getPublicLessonPreview);
router.get('/courses/:slug', PublicCourseController.getPublicCourseBySlug);
router.get('/courses/:courseId/curriculum', PublicController.getPublicCurriculum);

// Public Batches & Classes Endpoints
router.get('/batches', BatchController.listPublicBatches);
router.get('/classes', ClassController.listPublicClasses);

// Public Assessments / Quizzes Endpoints
router.get('/assessments', AssessmentController.getPublicAssessments);
router.get('/assessments/:slug', AssessmentController.getPublicAssessmentBySlug);

export default router;

