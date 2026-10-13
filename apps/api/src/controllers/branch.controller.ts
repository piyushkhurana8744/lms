import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { BranchService } from '../services/branch.service';
import { ApiResponse } from '../utils/apiResponse';

const actor = (req: AuthenticatedRequest) => ({ userId: req.user!.userId, isSuperAdmin: req.user!.isSuperAdmin });
export class BranchController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.list(req.query, actor(req))); } catch (e) { next(e); } }
  static async get(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.get(String(req.params.branchId), actor(req))); } catch (e) { next(e); } }
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.create(req.body, actor(req)), 'Branch created', 201); } catch (e) { next(e); } }
  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.update(String(req.params.branchId), req.body, actor(req))); } catch (e) { next(e); } }
  static async archive(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.archive(String(req.params.branchId), req.body, actor(req))); } catch (e) { next(e); } }
  static async accessible(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.list({ ...req.query, status: 'ACTIVE', limit: 100 }, actor(req))); } catch (e) { next(e); } }
  static async memberAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) { try { return ApiResponse.success(res, await BranchService.setMemberAccess(String(req.params.memberId), req.body, actor(req))); } catch (e) { next(e); } }
}
