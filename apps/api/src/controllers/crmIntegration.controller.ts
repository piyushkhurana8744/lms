import { Request, Response, NextFunction } from 'express';
import { CRMIntegrationService } from '../services/crmIntegration.service';

export class CRMIntegrationController {
  static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      CRMIntegrationService.verifySignature(
        (req as any).rawBody || JSON.stringify(req.body || {}),
        String(req.header('x-crm-timestamp') || ''),
        String(req.header('x-crm-signature') || '')
      );
      const result = await CRMIntegrationService.handle(req.body);
      return res.status(200).json({ success: true, data: result, error: null });
    } catch (error) { return next(error); }
  }
}
