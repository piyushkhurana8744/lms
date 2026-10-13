import { Request, Response, NextFunction } from 'express';
import { OrganizationMemberService } from '../services/organizationMember.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationMemberController {
  public static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OrganizationMemberService.listMembers(req.query);
      res.json({
        success: true,
        data: result.data,
        stats: result.stats,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMemberById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = req.params.memberId as string;
      const data = await OrganizationMemberService.getMemberById(memberId);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationMemberService.createEmployee(actorId, req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Employee added successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const memberId = req.params.memberId as string;
      const data = await OrganizationMemberService.updateEmployee(actorId, memberId, req.body);
      res.json({
        success: true,
        data,
        message: 'Employee updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationMemberService.inviteMember(actorId, req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Member invitation sent successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const memberId = req.params.memberId as string;
      const data = await OrganizationMemberService.updateMemberRole(actorId, memberId, req.body);
      res.json({
        success: true,
        data,
        message: 'Member role updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateMemberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const memberId = req.params.memberId as string;
      const { status } = req.body || {};

      let data;
      if (status === 'SUSPENDED') {
        data = await OrganizationMemberService.suspendMember(actorId, memberId);
      } else if (status === 'ACTIVE') {
        data = await OrganizationMemberService.activateMember(actorId, memberId);
      } else if (status === 'REMOVED') {
        data = await OrganizationMemberService.removeMember(actorId, memberId);
      } else {
        throw new Error('Invalid status transition');
      }

      res.json({
        success: true,
        data,
        message: `Member status updated to ${status} successfully`,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async suspendMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const memberId = req.params.memberId as string;
      const data = await OrganizationMemberService.suspendMember(actorId, memberId);
      res.json({
        success: true,
        data,
        message: 'Member suspended successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async activateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const memberId = req.params.memberId as string;
      const data = await OrganizationMemberService.activateMember(actorId, memberId);
      res.json({
        success: true,
        data,
        message: 'Member activated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const memberId = req.params.memberId as string;
      const data = await OrganizationMemberService.removeMember(actorId, memberId);
      res.json({
        success: true,
        data,
        message: 'Member removed from organization successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
