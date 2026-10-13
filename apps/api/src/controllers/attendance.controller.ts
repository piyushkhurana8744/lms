import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AttendanceService } from '../services/attendance.service';
const actor = (req: Request) => { const u = (req as AuthenticatedRequest).user!; return { userId: u.userId, roles: u.roles, isSuperAdmin: u.isSuperAdmin }; };
const ok = (res: Response, data: any, status = 200) => res.status(status).json({ success: true, data, error: null });
export class AttendanceController {
  static async getClass(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.getByClass(String(req.params.classId), actor(req))); } catch (e) { next(e); } }
  static async open(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.open(String(req.params.classId), actor(req)), 201); } catch (e) { next(e); } }
  static async mark(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.bulkMark(String(req.params.sessionId), req.body, actor(req))); } catch (e) { next(e); } }
  static async markAll(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.markAllPresent(String(req.params.sessionId), actor(req))); } catch (e) { next(e); } }
  static async finalize(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.finalize(String(req.params.sessionId), actor(req))); } catch (e) { next(e); } }
  static async correct(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.correct(String(req.params.recordId), req.body, actor(req))); } catch (e) { next(e); } }
  static async history(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.corrections(String(req.params.sessionId), actor(req))); } catch (e) { next(e); } }
  static async batch(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.batchAnalytics(String(req.params.batchId), req.query, actor(req))); } catch (e) { next(e); } }
  static async studentSummary(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.studentSummary((req as AuthenticatedRequest).user!.userId)); } catch (e) { next(e); } }
  static async studentHistory(req: Request, res: Response, next: NextFunction) { try { ok(res, await AttendanceService.studentHistory((req as AuthenticatedRequest).user!.userId, req.query)); } catch (e) { next(e); } }
}
