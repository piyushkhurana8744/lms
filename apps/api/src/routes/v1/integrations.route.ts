import { Router } from 'express';
import { PERMISSIONS } from '@edtech/permissions';
import { IntegrationsController } from '../../controllers/integrations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware';

const router: Router = Router();

// ==========================================
// 1. PUBLIC / PROVIDER WEBHOOK ROUTES
// ==========================================
router.post('/webhooks/:provider', IntegrationsController.handleWebhook);
// OAuth providers cannot send the application's bearer token. The signed, one-time
// state binds this callback to its tenant and initiating user.
router.get('/connections/:provider/callback', IntegrationsController.handleCallback);

// ==========================================
// 2. AUTHENTICATED INTEGRATION ROUTES
// ==========================================
router.use(authenticate, ensureWorkspaceContext);

// Provider Metadata
router.get(
  '/providers',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getProviders
);

// Connection Management
router.get(
  '/connections',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.listConnections
);

router.post(
  '/connections/:provider/connect',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.directConnect
);

router.post(
  '/connections/:provider/oauth-init',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.initiateOAuth
);

router.post(
  '/connections/:id/disconnect',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.disconnect
);

router.post(
  '/connections/:id/health',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.checkHealth
);

// Operations & Sync Runs Audit
router.get(
  '/operations',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_AUDIT_READ,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.listOperations
);

router.get(
  '/sync-runs',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_AUDIT_READ,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.listSyncRuns
);

// Google Classroom Routes
router.get(
  '/google-classroom/courses',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.discoverClassroomCourses
);

router.post(
  '/google-classroom/links',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.linkClassroomCourse
);

router.get(
  '/google-classroom/links',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.listClassroomLinks
);

router.post(
  '/google-classroom/links/:id/sync',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_SYNC,
    PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.syncClassroomLink
);

router.post(
  '/google-classroom/links/:id/resolve-conflict',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.resolveClassroomConflict
);

// Live Meeting Routes (Attached to Classes)
router.post(
  '/classes/:classId/meeting',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_CREATE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.SCHEDULE_CLASS_CREATE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.createClassMeeting
);

router.get(
  '/classes/:classId/meeting',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getClassMeeting
);

router.get(
  '/classes/:classId/meeting/history',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getClassMeetingHistory
);

router.post(
  '/classes/:classId/meeting/retry',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.retryClassMeeting
);

router.post(
  '/classes/:classId/meeting/reschedule',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.rescheduleClassMeeting
);

router.post(
  '/classes/:classId/meeting/cancel',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.cancelClassMeeting
);

// Unified Student/Instructor Join Endpoint
router.get(
  '/classes/:classId/join',
  requireAnyPermission([
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getJoinInfo
);

router.get(
  '/classes/:classId/attendance-evidence',
  requireAnyPermission([
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getAttendanceEvidence
);

router.get(
  '/classes/:classId/recordings',
  requireAnyPermission([
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getRecordings
);

router.post(
  '/classes/:classId/recordings/retry',
  requireAnyPermission([
    PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.retryRecording
);

router.get(
  '/recordings/:recordingId/files/:fileId/play',
  requireAnyPermission([
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.playRecording
);

router.get(
  '/recordings',
  requireAnyPermission([
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.listRecordingLibrary
);

router.get(
  '/classes/:classId/transcripts',
  requireAnyPermission([
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.SUPERADMIN_ALL
  ]),
  IntegrationsController.getTranscripts
);

export default router;
