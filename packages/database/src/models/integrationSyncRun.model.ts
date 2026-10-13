import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import {
  IntegrationProvider,
  ExternalSyncDirection,
  IntegrationSyncRunStatus,
  ISyncRunCounts
} from '@edtech/types';

export interface IIntegrationSyncRunDocument extends Document {
  tenantId: Types.ObjectId;
  provider: IntegrationProvider;
  connectionId: Types.ObjectId;
  scope: string;
  direction: ExternalSyncDirection;
  status: IntegrationSyncRunStatus;
  startedAt: Date;
  completedAt?: Date;
  counts: ISyncRunCounts;
  cursor?: string;
  errorCategory?: string;
  errorDetails?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSyncRunSchema = new Schema<IIntegrationSyncRunDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    connectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection', required: true, index: true },
    scope: { type: String, required: true, trim: true },
    direction: {
      type: String,
      enum: ['BIDIRECTIONAL', 'DIDM_TO_EXTERNAL', 'EXTERNAL_TO_DIDM', 'READ_ONLY_EXTERNAL'],
      default: 'BIDIRECTIONAL',
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      required: true,
      index: true
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    counts: {
      teachersSynced: { type: Number, default: 0 },
      studentsSynced: { type: Number, default: 0 },
      courseworkSynced: { type: Number, default: 0 },
      submissionsSynced: { type: Number, default: 0 },
      gradesSynced: { type: Number, default: 0 },
      conflictsDetected: { type: Number, default: 0 },
      errorsCount: { type: Number, default: 0 }
    },
    cursor: { type: String, default: null },
    errorCategory: { type: String, default: null },
    errorDetails: { type: String, default: null },
    correlationId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: 'integration_sync_runs'
  }
);

IntegrationSyncRunSchema.index({ tenantId: 1, provider: 1, startedAt: -1 });
IntegrationSyncRunSchema.index({ tenantId: 1, status: 1 });

IntegrationSyncRunSchema.plugin(tenantIsolationPlugin);

export const IntegrationSyncRunModel = model<IIntegrationSyncRunDocument>(
  'IntegrationSyncRun',
  IntegrationSyncRunSchema
);
