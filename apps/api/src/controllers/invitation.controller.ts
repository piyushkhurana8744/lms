import { Request, Response, NextFunction } from 'express';
import { OrganizationInvitationService } from '../services/organizationInvitation.service';

export class InvitationController {
  public static async getInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      const data = await OrganizationInvitationService.getInvitationByToken(token);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string;
      const data = await OrganizationInvitationService.acceptInvitation(token, req.body);
      res.json({
        success: true,
        data,
        message: 'Invitation accepted successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
