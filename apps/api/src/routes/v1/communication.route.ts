import { Router } from 'express';
import { PERMISSIONS } from '@edtech/permissions';
import { CommunicationController } from '../../controllers/communication.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { ensureWorkspaceContext } from '../../middleware/tenant.middleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware';

const router: Router = Router();
router.use(authenticate, ensureWorkspaceContext);

// ==========================================
// INBOX & READ STATE
// ==========================================
router.get(
  '/inbox',
  requireAnyPermission([
    PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW
  ]),
  CommunicationController.getInbox
);

router.get(
  '/unread-count',
  requireAnyPermission([
    PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW
  ]),
  CommunicationController.getUnreadCount
);

router.post(
  '/mark-read',
  requireAnyPermission([
    PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW
  ]),
  CommunicationController.markRead
);

// ==========================================
// ANNOUNCEMENTS
// ==========================================
router.get(
  '/announcements',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW),
  CommunicationController.listAnnouncements
);

router.post(
  '/announcements',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE),
  CommunicationController.createAnnouncement
);

router.post(
  '/announcements/preview-audience',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE),
  CommunicationController.previewAudience
);

router.get(
  '/announcements/:id',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW),
  CommunicationController.getAnnouncement
);

router.patch(
  '/announcements/:id',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE),
  CommunicationController.updateAnnouncement
);

router.post(
  '/announcements/:id/publish',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH),
  CommunicationController.publishAnnouncement
);

router.post(
  '/announcements/:id/schedule',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_SCHEDULE),
  CommunicationController.scheduleAnnouncement
);

router.post(
  '/announcements/:id/cancel',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CANCEL),
  CommunicationController.cancelAnnouncement
);

router.post(
  '/announcements/:id/archive',
  requirePermission(PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_ARCHIVE),
  CommunicationController.archiveAnnouncement
);

// ==========================================
// CONVERSATIONS & MESSAGES
// ==========================================
router.get(
  '/conversations',
  requirePermission(PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW),
  CommunicationController.listConversations
);

router.post(
  '/conversations',
  requirePermission(PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE),
  CommunicationController.createConversation
);

router.get(
  '/conversations/:id',
  requirePermission(PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW),
  CommunicationController.getConversation
);

router.get(
  '/conversations/:id/messages',
  requirePermission(PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW),
  CommunicationController.listMessages
);

router.post(
  '/conversations/:id/messages',
  requirePermission(PERMISSIONS.COMMUNICATION_MESSAGE_SEND),
  CommunicationController.sendMessage
);

export default router;
