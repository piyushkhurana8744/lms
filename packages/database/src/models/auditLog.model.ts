import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export interface IAuditLogDocument extends Document {
  eventId: string;
  correlationId: string;
  classification: 'SECURITY_CRITICAL' | 'OPERATIONAL';
  idempotencyKey: string;
  actorId: Types.ObjectId | string;
  tenantId: Types.ObjectId | string; // 'PLATFORM' for Super Admin actions
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    eventId: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
    correlationId: { type: String, required: true, index: true, default: () => crypto.randomUUID() },
    classification: { type: String, enum: ['SECURITY_CRITICAL', 'OPERATIONAL'], required: true, index: true, default: 'OPERATIONAL' },
    idempotencyKey: { type: String, required: true, unique: true, index: true, default: () => crypto.randomUUID() },
    actorId: { type: Schema.Types.Mixed, required: true, index: true },
    tenantId: { type: Schema.Types.Mixed, required: true, index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: String,
    ipAddress: String,
    userAgent: String,
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ tenantId: 1, createdAt: -1 });

export const AuditLogModel = model<IAuditLogDocument>('AuditLog', AuditLogSchema);
