import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import {
  IntegrationProvider,
  ExternalAcademicResourceType,
  ExternalSyncDirection,
  ExternalResourceSyncStatus
} from '@edtech/types';

export interface IExternalAcademicResourceDocument extends Document {
  tenantId: Types.ObjectId;
  provider: IntegrationProvider;
  connectionId: Types.ObjectId;
  resourceType: ExternalAcademicResourceType;
  canonicalResourceId: string;
  externalResourceId: string;
  branchId?: Types.ObjectId | null;
  syncDirection: ExternalSyncDirection;
  status: ExternalResourceSyncStatus;
  lastSyncedAt?: Date;
  externalVersion?: string;
  conflictData?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ExternalAcademicResourceSchema = new Schema<IExternalAcademicResourceDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    connectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection', required: true, index: true },
    resourceType: {
      type: String,
      enum: ['COURSE', 'BATCH', 'COURSEWORK', 'TEACHER', 'STUDENT', 'SUBMISSION'],
      required: true,
      index: true
    },
    canonicalResourceId: { type: String, required: true, index: true },
    externalResourceId: { type: String, required: true, trim: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    syncDirection: {
      type: String,
      enum: ['BIDIRECTIONAL', 'DIDM_TO_EXTERNAL', 'EXTERNAL_TO_DIDM', 'READ_ONLY_EXTERNAL'],
      default: 'BIDIRECTIONAL',
      required: true
    },
    status: {
      type: String,
      enum: ['SYNCED', 'PENDING', 'CONFLICT', 'ERROR', 'UNLINKED'],
      default: 'SYNCED',
      required: true,
      index: true
    },
    lastSyncedAt: { type: Date, default: Date.now },
    externalVersion: { type: String, default: null },
    conflictData: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: 'external_academic_resources'
  }
);

ExternalAcademicResourceSchema.index(
  { tenantId: 1, provider: 1, resourceType: 1, canonicalResourceId: 1 },
  { unique: true }
);
ExternalAcademicResourceSchema.index(
  { tenantId: 1, provider: 1, resourceType: 1, externalResourceId: 1 },
  { unique: true }
);
ExternalAcademicResourceSchema.index({ tenantId: 1, provider: 1, status: 1 });
ExternalAcademicResourceSchema.index({ tenantId: 1, branchId: 1 });

ExternalAcademicResourceSchema.plugin(tenantIsolationPlugin);

export const ExternalAcademicResourceModel = model<IExternalAcademicResourceDocument>(
  'ExternalAcademicResource',
  ExternalAcademicResourceSchema
);
