import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import { IntegrationProvider } from '@edtech/types';

export interface IIntegrationWebhookEventDocument extends Document {
  tenantId?: Types.ObjectId | null;
  provider: IntegrationProvider;
  connectionId?: Types.ObjectId | null;
  externalEventId: string;
  eventType: string;
  receivedAt: Date;
  processedAt?: Date | null;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  payloadFingerprint: string;
  payload: Record<string, any>;
  attempts: number;
  errorCategory?: string;
  errorDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationWebhookEventSchema = new Schema<IIntegrationWebhookEventDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    connectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection', default: null },
    externalEventId: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED'],
      default: 'RECEIVED',
      required: true,
      index: true
    },
    payloadFingerprint: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    attempts: { type: Number, default: 0 },
    errorCategory: { type: String, default: null },
    errorDetails: { type: String, default: null }
  },
  {
    timestamps: true,
    collection: 'integration_webhook_events'
  }
);

IntegrationWebhookEventSchema.index({ provider: 1, externalEventId: 1 }, { unique: true });
IntegrationWebhookEventSchema.index({ tenantId: 1, status: 1 });
IntegrationWebhookEventSchema.index({ tenantId: 1, provider: 1, receivedAt: -1 });

IntegrationWebhookEventSchema.plugin(tenantIsolationPlugin);

export const IntegrationWebhookEventModel = model<IIntegrationWebhookEventDocument>(
  'IntegrationWebhookEvent',
  IntegrationWebhookEventSchema
);
