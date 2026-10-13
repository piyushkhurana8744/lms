import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type NotificationCategory = 'ACADEMIC' | 'ATTENDANCE' | 'FINANCE' | 'ADMISSION' | 'CERTIFICATE' | 'SYSTEM' | 'COMMUNICATION';
export type NotificationType =
  | 'certificate.issued'
  | 'certificate.revoked'
  | 'payment.success'
  | 'admission.confirmed'
  | 'attendance.finalized'
  | 'assessment.graded'
  | 'class.rescheduled'
  | 'class.cancelled'
  | 'student.activated'
  | 'student.batch_transferred'
  | 'student.hold_started'
  | 'student.resumed'
  | 'student.withdrawn'
  | 'student.completed'
  | 'student.reactivated'
  | 'announcement.published'
  | 'communication.message_received';

export interface INotificationDocument extends Document {
  tenantId: Types.ObjectId; recipientUserId: Types.ObjectId; type: NotificationType; category: NotificationCategory;
  title: string; body: string; actionUrl?: string; sourceType: string; sourceId: string; occurrenceKey: string;
  deduplicationKey: string; metadata?: Record<string, string | number | boolean>; readAt?: Date | null; createdAt: Date; updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'certificate.issued',
      'certificate.revoked',
      'payment.success',
      'admission.confirmed',
      'attendance.finalized',
      'assessment.graded',
      'class.rescheduled',
      'class.cancelled',
      'student.activated',
      'student.batch_transferred',
      'student.hold_started',
      'student.resumed',
      'student.withdrawn',
      'student.completed',
      'student.reactivated',
      'announcement.published',
      'communication.message_received'
    ],
    required: true
  },
  category: { type: String, enum: ['ACADEMIC', 'ATTENDANCE', 'FINANCE', 'ADMISSION', 'CERTIFICATE', 'SYSTEM', 'COMMUNICATION'], required: true },
  title: { type: String, required: true, maxlength: 200 }, body: { type: String, required: true, maxlength: 2000 },
  actionUrl: { type: String, maxlength: 500 }, sourceType: { type: String, required: true, maxlength: 80 }, sourceId: { type: String, required: true, maxlength: 120 },
  occurrenceKey: { type: String, required: true, maxlength: 120 }, deduplicationKey: { type: String, required: true, maxlength: 500 },
  metadata: { type: Schema.Types.Mixed }, readAt: { type: Date, default: null }
}, { timestamps: true });
NotificationSchema.index({ tenantId: 1, recipientUserId: 1, createdAt: -1, _id: -1 });
NotificationSchema.index({ tenantId: 1, recipientUserId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, deduplicationKey: 1 }, { unique: true });
NotificationSchema.plugin(tenantIsolationPlugin);
export const NotificationModel = model<INotificationDocument>('Notification', NotificationSchema);
