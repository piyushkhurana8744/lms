import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { NotificationIdSchema, NotificationListQuerySchema, UpdatePersonalNotificationPreferencesSchema } from '@edtech/validation';
const userId = (req: Request) => (req as AuthenticatedRequest).user!.userId;
const ok = (res: Response, data: unknown) => res.json({ success: true, data, error: null });
export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) { try { const query = NotificationListQuerySchema.parse(req.query); ok(res, await NotificationService.list(userId(req), query.page, query.limit)); } catch (error) { next(error); } }
  static async unreadCount(req: Request, res: Response, next: NextFunction) { try { ok(res, { count: await NotificationService.unreadCount(userId(req)) }); } catch (error) { next(error); } }
  static async read(req: Request, res: Response, next: NextFunction) { try { ok(res, await NotificationService.setRead(userId(req), NotificationIdSchema.parse(req.params.id), true)); } catch (error) { next(error); } }
  static async unread(req: Request, res: Response, next: NextFunction) { try { ok(res, await NotificationService.setRead(userId(req), NotificationIdSchema.parse(req.params.id), false)); } catch (error) { next(error); } }
  static async markAllRead(req: Request, res: Response, next: NextFunction) { try { ok(res, await NotificationService.markAllRead(userId(req))); } catch (error) { next(error); } }
  static async preferences(req: Request, res: Response, next: NextFunction) { try { ok(res, await NotificationService.preferences(userId(req))); } catch (error) { next(error); } }
  static async updatePreferences(req: Request, res: Response, next: NextFunction) { try { const input = UpdatePersonalNotificationPreferencesSchema.parse(req.body); ok(res, await NotificationService.updatePreferences(userId(req), input.preferences)); } catch (error) { next(error); } }
}
