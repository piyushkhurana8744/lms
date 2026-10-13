import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
export interface INotificationPreferenceDocument extends Document { tenantId: Types.ObjectId; userId: Types.ObjectId; category: string; inAppEnabled: boolean; emailEnabled: boolean; }
const schema = new Schema<INotificationPreferenceDocument>({ tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true }, userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, category: { type: String, enum: ['ACADEMIC', 'ATTENDANCE', 'FINANCE', 'ADMISSION', 'CERTIFICATE', 'SYSTEM'], required: true }, inAppEnabled: { type: Boolean, default: true }, emailEnabled: { type: Boolean, default: true } }, { timestamps: true });
schema.index({ tenantId: 1, userId: 1, category: 1 }, { unique: true }); schema.plugin(tenantIsolationPlugin);
export const NotificationPreferenceModel = model<INotificationPreferenceDocument>('NotificationPreference', schema);
