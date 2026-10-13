import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLogDocument extends Document {
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
