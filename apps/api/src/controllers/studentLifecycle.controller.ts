import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { StudentLifecycleService } from '../services/studentLifecycle.service';

const actor = (req: Request) => {
  const u = (req as AuthenticatedRequest).user!;
  return { userId: u.userId, roles: u.roles, isSuperAdmin: u.isSuperAdmin };
};

const ok = (res: Response, data: any, status = 200) =>
  res.status(status).json({ success: true, data, error: null });

export class StudentLifecycleController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.listStudents(req.query));
    } catch (e) {
      next(e);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.getLifecycleById(String(req.params.id)));
    } catch (e) {
      next(e);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.getAcademicProfile(String(req.params.studentUserId)));
    } catch (e) {
      next(e);
    }
  }

  static async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.getTimeline(String(req.params.studentUserId), false));
    } catch (e) {
      next(e);
    }
  }

  static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.activateStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.transferStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async transferBranch(req: Request, res: Response, next: NextFunction) {
    try { ok(res, await StudentLifecycleService.transferBranch(String(req.params.id), req.body, actor(req))); } catch (e) { next(e); }
  }

  static async hold(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.placeOnHold(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async resume(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.resumeStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.withdrawStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async drop(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.dropStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async complete(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.completeStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  static async reactivate(req: Request, res: Response, next: NextFunction) {
    try {
      ok(res, await StudentLifecycleService.reactivateStudent(String(req.params.id), req.body, actor(req)));
    } catch (e) {
      next(e);
    }
  }

  // Student Self-Service Endpoints (derived strictly from auth token)
  static async getOwnProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = (req as AuthenticatedRequest).user!.userId;
      ok(res, await StudentLifecycleService.getAcademicProfile(studentUserId));
    } catch (e) {
      next(e);
    }
  }

  static async getOwnTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = (req as AuthenticatedRequest).user!.userId;
      ok(res, await StudentLifecycleService.getTimeline(studentUserId, true));
    } catch (e) {
      next(e);
    }
  }
}
