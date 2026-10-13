import { Router } from 'express';
import { CRMController } from '../../controllers/crm.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { PERMISSIONS } from '@edtech/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(ensureWorkspaceContext);

// CRM Dashboard Metrics
router.get('/dashboard', requirePermission(PERMISSIONS.CRM_VIEW), CRMController.getDashboardMetrics);

// Lead Management Routes
router.get('/leads', requirePermission(PERMISSIONS.CRM_VIEW), CRMController.getLeads);
router.post('/leads', requirePermission(PERMISSIONS.LEAD_CREATE), CRMController.createLead);
router.get('/leads/:leadId', requirePermission(PERMISSIONS.CRM_VIEW), CRMController.getLeadById);
router.patch('/leads/:leadId', requirePermission(PERMISSIONS.LEAD_UPDATE), CRMController.updateLead);
router.post('/leads/:leadId/branch', requirePermission(PERMISSIONS.LEAD_ASSIGN), CRMController.reassignLeadBranch);

// Lead Actions (Stage, Assign, Notes, Follow-ups)
router.post('/leads/:leadId/stage', requirePermission(PERMISSIONS.LEAD_UPDATE), CRMController.changeStage);
router.post('/leads/:leadId/assign', requirePermission(PERMISSIONS.LEAD_ASSIGN), CRMController.assignCounsellor);
router.post('/leads/:leadId/notes', requirePermission(PERMISSIONS.LEAD_ACTIVITY_CREATE), CRMController.addNote);
router.post('/leads/:leadId/follow-ups', requirePermission(PERMISSIONS.FOLLOW_UP_MANAGE), CRMController.scheduleFollowUp);
router.post('/follow-ups/:followUpId/complete', requirePermission(PERMISSIONS.FOLLOW_UP_MANAGE), CRMController.completeFollowUp);

// Admission & Student Conversion Routes
router.post('/leads/:leadId/admissions', requirePermission(PERMISSIONS.ADMISSION_CREATE), CRMController.createAdmission);
router.post('/admissions/:admissionId/convert', requirePermission(PERMISSIONS.ADMISSION_CONVERT), CRMController.convertAdmissionToStudent);

export default router;
