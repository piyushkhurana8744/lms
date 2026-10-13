import { Router } from 'express';
import { AssessmentController } from '../../controllers/assessment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// Submissions List (Trainers can view all in tenant, Students see their own)
router.get('/submissions', requirePermission(PERMISSIONS.ASSESSMENT_VIEW), AssessmentController.getSubmissions);

// Grade Assignment Submission (Trainers / Admins)
router.put(
  '/submissions/:submissionId/grade',
  requirePermission(PERMISSIONS.ASSESSMENT_GRADE),
  AssessmentController.gradeSubmission
);

// Assessment Management (CRUD)
router.get('/', requirePermission(PERMISSIONS.ASSESSMENT_VIEW), AssessmentController.getAssessments);
router.post('/', requirePermission(PERMISSIONS.ASSESSMENT_CREATE), AssessmentController.createAssessment);

// Assessment By ID
router.get('/:id', requirePermission(PERMISSIONS.ASSESSMENT_VIEW), AssessmentController.getAssessmentById);
router.put('/:id', requirePermission(PERMISSIONS.ASSESSMENT_UPDATE), AssessmentController.updateAssessment);
router.delete('/:id', requirePermission(PERMISSIONS.ASSESSMENT_DELETE), AssessmentController.deleteAssessment);

// Student Submissions
router.post('/:id/submit-quiz', requirePermission(PERMISSIONS.ASSESSMENT_SUBMIT), AssessmentController.submitQuiz);
router.post(
  '/:id/submit-assignment',
  requirePermission(PERMISSIONS.ASSESSMENT_SUBMIT),
  AssessmentController.submitAssignment
);

export default router;
