import { AuditLogModel } from '@edtech/database';
import { sanitizeData, logger } from '@edtech/utils';
import { ClientSession } from 'mongoose';

export interface AuditEventParams {
  actorId: string;
  tenantId: string | 'PLATFORM';
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  session?: ClientSession;
}

export class AuditService {
  public static async logEvent(params: AuditEventParams): Promise<void> {
    try {
      const sanitizedMeta = params.metadata ? sanitizeData(params.metadata) : {};

      await AuditLogModel.create([{
        actorId: params.actorId,
        tenantId: params.tenantId || 'PLATFORM',
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: sanitizedMeta
      }], { session: params.session });

      logger.info(`[Audit] ${params.action} on ${params.resource}:${params.resourceId || 'N/A'} by actor ${params.actorId}`);
    } catch (err: any) {
      logger.error(`[Audit Failure] Failed to record audit log: ${err.message}`, err);
      if (params.session) throw err;
    }
  }
}
