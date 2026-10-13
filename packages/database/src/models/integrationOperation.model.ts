import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import {
  IntegrationProvider,
  IntegrationOperationType,
  IntegrationOperationStatus,
  IntegrationErrorCategory
} from '@edtech/types';

export interface IIntegrationOperationDocument extends Document {
  tenantId: Types.ObjectId;
  provider: IntegrationProvider;
  connectionId?: Types.ObjectId | null;
  operationType: IntegrationOperationType;
  canonicalResourceType: string;
  canonicalResourceId: string;
  idempotencyKey: string;
  status: IntegrationOperationStatus;
  attempts: number;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  externalResourceId?: string;
  startedAt?: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
  errorCategory?: IntegrationErrorCategory;
  errorDetails?: string;
  correlationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationOperationSchema = new Schema<IIntegrationOperationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    connectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection', default: null },
    operationType: {
      type: String,
      enum: ['CREATE_MEETING', 'RESCHEDULE_MEETING', 'CANCEL_MEETING', 'SYNC_CLASSROOM', 'RECONCILE'],
      required: true,
      index: true
    },
    canonicalResourceType: { type: String, required: true, index: true },
    canonicalResourceId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYABLE'],
      default: 'PENDING',
      required: true,
      index: true
    },
    attempts: { type: Number, default: 0, min: 0 },
    payload: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: null },
    externalResourceId: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    nextRetryAt: { type: Date, default: null, index: true },
    errorCategory: {
      type: String,
      enum: [
        'AUTH_REQUIRED',
        'RATE_LIMITED',
        'TEMPORARY_PROVIDER_FAILURE',
        'TIMEOUT',
        'INVALID_REQUEST',
        'RESOURCE_NOT_FOUND',
        'CONFLICT',
        'PERMISSION_DENIED',
        'INTERNAL'
      ],
      default: null
    },
    errorDetails: { type: String, default: null },
    correlationId: { type: String, default: null, index: true }
  },
  {
    timestamps: true,
    collection: 'integration_operations'
  }
);

IntegrationOperationSchema.index({ tenantId: 1, status: 1, nextRetryAt: 1 });
IntegrationOperationSchema.index({ tenantId: 1, canonicalResourceId: 1 });
IntegrationOperationSchema.index({ tenantId: 1, provider: 1, status: 1 });

IntegrationOperationSchema.plugin(tenantIsolationPlugin);

export const IntegrationOperationModel = model<IIntegrationOperationDocument>(
  'IntegrationOperation',
  IntegrationOperationSchema
);
