import { Schema, model, Document, Types } from 'mongoose';

export interface ISessionDocument extends Document {
  userId: Types.ObjectId;
  tenantId: Types.ObjectId | null;
  activeTenantId?: Types.ObjectId | null;
  impersonatedBy?: Types.ObjectId | null;
  originalSessionId?: Types.ObjectId | null;
  impersonationReason?: string | null;
  currentRefreshTokenHash: string;
  previousRefreshTokenHash?: string;
  tokenVersion: number;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    activeTenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    impersonatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    originalSessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: null },
    impersonationReason: { type: String, default: null },
    currentRefreshTokenHash: { type: String, required: true, index: true },
    previousRefreshTokenHash: { type: String, index: true },
    tokenVersion: { type: Number, default: 1 },
    ipAddress: String,
    userAgent: String,
    deviceInfo: String,
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

SessionSchema.index({ userId: 1, revokedAt: 1 });

export const SessionModel = model<ISessionDocument>('Session', SessionSchema);
