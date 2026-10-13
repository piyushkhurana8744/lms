import { Router } from 'express';
import { PERMISSIONS } from '@edtech/permissions';
import { AnalyticsController } from '../../controllers/analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware';

const router: Router = Router();
router.use(authenticate, ensureWorkspaceContext);

router.get('/dashboard', requirePermission(PERMISSIONS.ANALYTICS_DASHBOARD_VIEW), AnalyticsController.getExecutiveDashboard);
router.get('/students', requirePermission(PERMISSIONS.ANALYTICS_STUDENTS_VIEW), AnalyticsController.getStudentsAnalytics);
router.get('/crm', requirePermission(PERMISSIONS.ANALYTICS_CRM_VIEW), AnalyticsController.getCRMAnalytics);
router.get('/finance', requirePermission(PERMISSIONS.ANALYTICS_FINANCE_VIEW), AnalyticsController.getFinanceAnalytics);
router.get('/attendance', requirePermission(PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW), AnalyticsController.getAttendanceAnalytics);
router.get('/academics', requirePermission(PERMISSIONS.ANALYTICS_ACADEMICS_VIEW), AnalyticsController.getAcademicsAnalytics);
router.get('/learning', requirePermission(PERMISSIONS.ANALYTICS_LEARNING_VIEW), AnalyticsController.getLearningAnalytics);
router.get('/instructors', requirePermission(PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW), AnalyticsController.getInstructorsAnalytics);
router.get('/branches/compare', requirePermission(PERMISSIONS.ANALYTICS_DASHBOARD_VIEW), AnalyticsController.getBranchComparison);

router.get(
  '/reports/:reportKey',
  requireAnyPermission([
    PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
    PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
    PERMISSIONS.ANALYTICS_CRM_VIEW,
    PERMISSIONS.ANALYTICS_FINANCE_VIEW,
    PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
    PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
    PERMISSIONS.ANALYTICS_LEARNING_VIEW,
    PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
  ]),
  AnalyticsController.getReport
);

router.post('/exports', requirePermission(PERMISSIONS.ANALYTICS_REPORTS_EXPORT), AnalyticsController.createExport);
router.get('/exports', requirePermission(PERMISSIONS.ANALYTICS_REPORTS_EXPORT), AnalyticsController.listExports);
router.get('/exports/:exportId', requirePermission(PERMISSIONS.ANALYTICS_REPORTS_EXPORT), AnalyticsController.getExport);

export default router;
