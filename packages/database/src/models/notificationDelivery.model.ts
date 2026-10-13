import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
export type NotificationDeliveryStatus = 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'SKIPPED';
export interface INotificationDeliveryDocument extends Document { tenantId: Types.ObjectId; notificationId: Types.ObjectId; recipientUserId: Types.ObjectId; channel: 'EMAIL'; status: NotificationDeliveryStatus; provider?: string; attemptCount: number; isRetryable: boolean; lastAttemptAt?: Date; deliveredAt?: Date; failedAt?: Date; nextRetryAt?: Date; leaseUntil?: Date; providerMessageId?: string; lastErrorCode?: string; sanitizedLastError?: string; createdAt: Date; updatedAt: Date; }
const schema = new Schema<INotificationDeliveryDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true }, notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true }, recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: String, enum: ['EMAIL'], required: true }, status: { type: String, enum: ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'SKIPPED'], default: 'PENDING' }, provider: String,
  attemptCount: { type: Number, default: 0 }, isRetryable: { type: Boolean, default: true }, lastAttemptAt: Date, deliveredAt: Date, failedAt: Date, nextRetryAt: { type: Date, default: Date.now }, leaseUntil: Date,
  providerMessageId: { type: String, maxlength: 300 }, lastErrorCode: { type: String, maxlength: 80 }, sanitizedLastError: { type: String, maxlength: 500 }
}, { timestamps: true });
schema.index({ notificationId: 1, channel: 1 }, { unique: true }); schema.index({ status: 1, nextRetryAt: 1, leaseUntil: 1 }); schema.index({ tenantId: 1, recipientUserId: 1, status: 1 }); schema.plugin(tenantIsolationPlugin);
export const NotificationDeliveryModel = model<INotificationDeliveryDocument>('NotificationDelivery', schema);
