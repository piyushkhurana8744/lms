import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';
import { ApiResponse } from '../utils/apiResponse';

export class HealthController {
  public static getLive(req: Request, res: Response): Response {
    const liveness = HealthService.getLiveness();
    return ApiResponse.success(res, liveness, 'Liveness probe passed', 200);
  }

  public static getReady(req: Request, res: Response): Response {
    const { isReady, data } = HealthService.getReadiness();
    if (isReady) {
      return ApiResponse.success(res, data, 'Readiness probe passed', 200);
    }
    return ApiResponse.error(
      res,
      'Readiness probe failed: infrastructure service unavailable',
      503,
      'ERR_SERVICE_UNAVAILABLE',
      data
    );
  }

  public static getHealth(req: Request, res: Response): Response {
    const healthStatus = HealthService.getSystemHealth();
    return ApiResponse.success(res, healthStatus, 'DIDM Platform API Health Summary', 200);
  }
}
