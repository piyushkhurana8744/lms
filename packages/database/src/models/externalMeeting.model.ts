import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import {
  IntegrationProvider,
  ExternalMeetingStatus,
  ExternalMeetingSyncStatus
} from '@edtech/types';

export interface IExternalMeetingDocument extends Document {
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  classId: Types.ObjectId;
  provider: IntegrationProvider;
  connectionId: Types.ObjectId;
  organizerUserId: Types.ObjectId;
  externalMeetingId: string;
  externalCalendarEventId?: string;
  joinUrl: string;
  hostUrl?: string;
  providerStatus: ExternalMeetingStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  syncStatus: ExternalMeetingSyncStatus;
  lastSyncedAt?: Date;
  providerVersion?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ExternalMeetingSchema = new Schema<IExternalMeetingDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    connectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection', required: true },
    organizerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    externalMeetingId: { type: String, required: true, trim: true },
    externalCalendarEventId: { type: String, trim: true },
    joinUrl: { type: String, required: true, trim: true },
    hostUrl: { type: String, trim: true },
    providerStatus: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNKNOWN'],
      default: 'SCHEDULED',
      required: true,
      index: true
    },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    timezone: { type: String, required: true, default: 'UTC' },
    syncStatus: {
      type: String,
      enum: ['SYNCED', 'PENDING', 'FAILED'],
      default: 'SYNCED',
      required: true,
      index: true
    },
    lastSyncedAt: { type: Date, default: Date.now },
    providerVersion: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: 'external_meetings'
  }
);

ExternalMeetingSchema.index({ tenantId: 1, classId: 1 }, { unique: true });
ExternalMeetingSchema.index({ tenantId: 1, provider: 1, externalMeetingId: 1 });
ExternalMeetingSchema.index({ tenantId: 1, syncStatus: 1 });
ExternalMeetingSchema.index({ tenantId: 1, branchId: 1 });

ExternalMeetingSchema.plugin(tenantIsolationPlugin);

export const ExternalMeetingModel = model<IExternalMeetingDocument>(
  'ExternalMeeting',
  ExternalMeetingSchema
);
