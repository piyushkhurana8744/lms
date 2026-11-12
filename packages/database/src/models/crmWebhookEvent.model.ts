import { Document, Schema, Types, model } from 'mongoose';

export interface ICRMWebhookEventDocument extends Document {
  tenantId: Types.ObjectId;
  orgNumber: string;
  eventId: string;
  eventType: string;
  status: 'PROCESSING' | 'PROCESSED' | 'FAILED';
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CRMWebhookEventSchema = new Schema<ICRMWebhookEventDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  orgNumber: { type: String, required: true, trim: true, index: true },
  eventId: { type: String, required: true, trim: true, unique: true, index: true },
  eventType: { type: String, required: true, trim: true, index: true },
  status: { type: String, enum: ['PROCESSING', 'PROCESSED', 'FAILED'], required: true, default: 'PROCESSING', index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  result: { type: Schema.Types.Mixed, default: null },
  error: { type: String, default: null },
  processedAt: { type: Date, default: null }
}, { timestamps: true, collection: 'crm_webhook_events' });

CRMWebhookEventSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const CRMWebhookEventModel = model<ICRMWebhookEventDocument>('CRMWebhookEvent', CRMWebhookEventSchema);
