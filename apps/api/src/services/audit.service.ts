import { AuditLogModel } from '@edtech/database';
import { sanitizeData, logger } from '@edtech/utils';
import { ClientSession } from 'mongoose';
import crypto from 'crypto';

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
  eventId?: string;
  correlationId?: string;
  classification?: 'SECURITY_CRITICAL' | 'OPERATIONAL';
  idempotencyKey?: string;
  critical?: boolean;
}

export class AuditService {
  public static async logEvent(params: AuditEventParams): Promise<void> {
    try {
      const sanitizedMeta = params.metadata ? sanitizeData(params.metadata) : {};
      const eventId = params.eventId || crypto.randomUUID();
      const correlationId = params.correlationId || eventId;
      const idempotencyKey = params.idempotencyKey || eventId;

      await AuditLogModel.create([{
        eventId,
        correlationId,
        idempotencyKey,
        classification: params.classification || (params.critical ? 'SECURITY_CRITICAL' : 'OPERATIONAL'),
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
      if (params.session || params.critical) throw err;
    }
  }
}
