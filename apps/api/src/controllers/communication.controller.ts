import { Request, Response, NextFunction } from 'express';
import {
  CommunicationAnnouncementService,
  CommunicationConversationService,
  CommunicationMessageService,
  CommunicationInboxService
} from '../services/communication.service';
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  ScheduleAnnouncementSchema,
  AudiencePreviewSchema,
  CreateConversationSchema,
  SendMessageSchema,
  MarkReadSchema,
  InboxQuerySchema,
  AnnouncementQuerySchema,
  ConversationQuerySchema
} from '@edtech/validation';

export class CommunicationController {
  private static getActor(req: Request) {
    const user = (req as any).user;
    return {
      userId: user.id || user._id || user.userId,
      isSuperAdmin: user.isSuperAdmin || false,
      permissions: user.permissions || [],
      roles: user.roles || []
    };
  }

  // ==========================================
  // ANNOUNCEMENTS
  // ==========================================
  public static async createAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CreateAnnouncementSchema.parse(req.body);
      const result = await CommunicationAnnouncementService.createAnnouncement(validated, CommunicationController.getActor(req));
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async updateAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validated = UpdateAnnouncementSchema.parse(req.body);
      const result = await CommunicationAnnouncementService.updateAnnouncement(id, validated, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async previewAudience(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = AudiencePreviewSchema.parse(req.body);
      const result = await CommunicationAnnouncementService.previewAudience(validated, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async publishAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await CommunicationAnnouncementService.publishAnnouncement(id, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async scheduleAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validated = ScheduleAnnouncementSchema.parse(req.body);
      const result = await CommunicationAnnouncementService.scheduleAnnouncement(id, validated.scheduledAt, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async cancelAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await CommunicationAnnouncementService.cancelAnnouncement(id, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async archiveAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await CommunicationAnnouncementService.archiveAnnouncement(id, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await CommunicationAnnouncementService.getAnnouncement(id, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async listAnnouncements(req: Request, res: Response, next: NextFunction) {
    try {
      const query = AnnouncementQuerySchema.parse(req.query);
      const result = await CommunicationAnnouncementService.listAnnouncements(query, CommunicationController.getActor(req));
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // CONVERSATIONS & MESSAGES
  // ==========================================
  public static async createConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CreateConversationSchema.parse(req.body);
      const result = await CommunicationConversationService.createConversation(validated, CommunicationController.getActor(req));
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await CommunicationConversationService.getConversation(id, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async listConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ConversationQuerySchema.parse(req.query);
      const result = await CommunicationConversationService.listConversations(query, CommunicationController.getActor(req));
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  public static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const validated = SendMessageSchema.parse(req.body);
      const result = await CommunicationMessageService.sendMessage(id, validated, CommunicationController.getActor(req));
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const beforeSequence = req.query.beforeSequence ? Number(req.query.beforeSequence) : undefined;
      const result = await CommunicationMessageService.listMessages(id, { limit, beforeSequence }, CommunicationController.getActor(req));
      res.json({ success: true, data: result.data, nextCursor: result.nextCursor });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // INBOX & READ STATE
  // ==========================================
  public static async getInbox(req: Request, res: Response, next: NextFunction) {
    try {
      const query = InboxQuerySchema.parse(req.query);
      const result = await CommunicationInboxService.getInbox(query, CommunicationController.getActor(req));
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  public static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CommunicationInboxService.getUnreadCount(CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = MarkReadSchema.parse(req.body);
      const result = await CommunicationInboxService.markRead(validated, CommunicationController.getActor(req));
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
