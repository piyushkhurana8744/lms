import { Types } from 'mongoose';
import {
  IntegrationOperationModel,
  IIntegrationOperationDocument
} from '@edtech/database';
import {
  IntegrationProvider,
  IntegrationOperationType,
  IntegrationErrorCategory,
  IIntegrationOperationDTO
} from '@edtech/types';
import { logger } from '@edtech/utils';

export class IntegrationOperationService {
  private static inFlight = new Map<string, Promise<any>>();

  public static toDTO(doc: IIntegrationOperationDocument): IIntegrationOperationDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      provider: doc.provider,
      connectionId: doc.connectionId ? doc.connectionId.toString() : undefined,
      operationType: doc.operationType,
      canonicalResourceType: doc.canonicalResourceType,
      canonicalResourceId: doc.canonicalResourceId,
      idempotencyKey: doc.idempotencyKey,
      status: doc.status,
      attempts: doc.attempts,
      externalResourceId: doc.externalResourceId || undefined,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      nextRetryAt: doc.nextRetryAt,
      errorCategory: doc.errorCategory,
      errorDetails: doc.errorDetails || undefined,
      correlationId: doc.correlationId || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  public static classifyError(err: any): { category: IntegrationErrorCategory; isRetryable: boolean } {
    const msg = String(err?.message || '').toLowerCase();
    const status = err?.status || err?.statusCode;
    const code = String(err?.code || '').toUpperCase();

    if (status === 401 || code === 'AUTH_REQUIRED' || msg.includes('oauth') || msg.includes('token expired') || msg.includes('auth_expired')) {
      return { category: 'AUTH_REQUIRED', isRetryable: false };
    }
    if (status === 429 || code === 'RATE_LIMITED' || msg.includes('rate limit')) {
      return { category: 'RATE_LIMITED', isRetryable: true };
    }
    if (status === 503 || status === 502 || status === 504 || code === 'TEMPORARY_PROVIDER_FAILURE' || msg.includes('service unavailable')) {
      return { category: 'TEMPORARY_PROVIDER_FAILURE', isRetryable: true };
    }
    if (code === 'TIMEOUT' || msg.includes('timeout') || msg.includes('timed out')) {
      return { category: 'TIMEOUT', isRetryable: true };
    }
    if (status === 404 || code === 'RESOURCE_NOT_FOUND' || msg.includes('not found')) {
      return { category: 'RESOURCE_NOT_FOUND', isRetryable: false };
    }
    if (status === 409 || code === 'CONFLICT' || msg.includes('conflict')) {
      return { category: 'CONFLICT', isRetryable: false };
    }
    if (status === 403 || code === 'PERMISSION_DENIED' || msg.includes('permission denied')) {
      return { category: 'PERMISSION_DENIED', isRetryable: false };
    }
    if (status === 400 || code === 'INVALID_REQUEST' || msg.includes('validation')) {
      return { category: 'INVALID_REQUEST', isRetryable: false };
    }

    return { category: 'INTERNAL', isRetryable: true };
  }

  public static async executeWithIdempotency<T>(params: {
    tenantId: string;
    provider: IntegrationProvider;
    connectionId?: string | null;
    operationType: IntegrationOperationType;
    canonicalResourceType: string;
    canonicalResourceId: string;
    idempotencyKey: string;
    payload?: Record<string, any>;
    correlationId?: string;
    fn: () => Promise<{ result: T; externalResourceId?: string }>;
  }): Promise<T> {
    const { idempotencyKey } = params;

    if (this.inFlight.has(idempotencyKey)) {
      return (await this.inFlight.get(idempotencyKey)) as T;
    }

    const execPromise = this.executeInternal(params);
    this.inFlight.set(idempotencyKey, execPromise);

    try {
      return (await execPromise) as T;
    } finally {
      this.inFlight.delete(idempotencyKey);
    }
  }

  private static async executeInternal<T>(params: {
    tenantId: string;
    provider: IntegrationProvider;
    connectionId?: string | null;
    operationType: IntegrationOperationType;
    canonicalResourceType: string;
    canonicalResourceId: string;
    idempotencyKey: string;
    payload?: Record<string, any>;
    correlationId?: string;
    fn: () => Promise<{ result: T; externalResourceId?: string }>;
  }): Promise<T> {
    const {
      tenantId,
      provider,
      connectionId,
      operationType,
      canonicalResourceType,
      canonicalResourceId,
      idempotencyKey,
      payload = {},
      correlationId,
      fn
    } = params;

    // Check existing operation
    let op = await IntegrationOperationModel.findOne({ idempotencyKey });

    if (op && op.status === 'COMPLETED' && op.result) {
      return op.result as T;
    }

    if (!op) {
      try {
        op = await IntegrationOperationModel.create({
          tenantId: new Types.ObjectId(tenantId),
          provider,
          connectionId: connectionId ? new Types.ObjectId(connectionId) : null,
          operationType,
          canonicalResourceType,
          canonicalResourceId,
          idempotencyKey,
          status: 'PENDING',
          attempts: 0,
          payload,
          correlationId: correlationId || `corr_${Date.now()}`
        });
      } catch (err: any) {
        if (err.code === 11000) {
          op = await IntegrationOperationModel.findOne({ idempotencyKey });
          if (op && op.status === 'COMPLETED' && op.result) {
            return op.result as T;
          }
        } else {
          throw err;
        }
      }
    }

    if (!op) {
      throw new Error('Failed to obtain or initialize integration operation record');
    }

    op.status = 'PROCESSING';
    op.startedAt = new Date();
    op.attempts += 1;
    await op.save();

    try {
      const outcome = await fn();

      op.status = 'COMPLETED';
      op.completedAt = new Date();
      op.result = (outcome.result as any) || undefined;
      op.externalResourceId = outcome.externalResourceId || undefined;
      op.errorCategory = undefined;
      op.errorDetails = undefined;
      op.nextRetryAt = undefined;
      await op.save();

      return outcome.result;
    } catch (error: any) {
      const { category, isRetryable } = this.classifyError(error);
      const backoffMs = Math.min(60000, 1000 * Math.pow(2, Math.max(0, op.attempts - 1)));

      op.status = isRetryable ? 'RETRYABLE' : 'FAILED';
      op.errorCategory = category;
      op.errorDetails = error?.message || 'Operation failed';
      op.nextRetryAt = isRetryable ? new Date(Date.now() + backoffMs) : undefined;
      await op.save();

      logger.error(
        `[IntegrationOperation] Operation ${idempotencyKey} failed with category ${category} (attempt ${op.attempts}): ${error?.message}`
      );
      throw error;
    }
  }

  public static async listOperations(
    tenantId: string,
    filter: {
      provider?: IntegrationProvider;
      status?: string;
      canonicalResourceId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: IIntegrationOperationDTO[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { tenantId };
    if (filter.provider) query.provider = filter.provider;
    if (filter.status) query.status = filter.status;
    if (filter.canonicalResourceId) query.canonicalResourceId = filter.canonicalResourceId;

    const [docs, total] = await Promise.all([
      IntegrationOperationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      IntegrationOperationModel.countDocuments(query)
    ]);

    return {
      items: docs.map((d: any) => this.toDTO(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}
