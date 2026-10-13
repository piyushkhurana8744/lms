import { Document, Schema, Types, model } from 'mongoose';

export type NotificationIntentType =
  | 'payment.success'
  | 'admission.confirmed'
  | 'certificate.issued'
  | 'certificate.revoked'
  | 'class.rescheduled'
  | 'class.cancelled'
  | 'assessment.graded'
  | 'student.activated'
  | 'student.batch_transferred'
  | 'student.hold_started'
  | 'student.resumed'
  | 'student.withdrawn'
  | 'student.completed'
  | 'student.reactivated'
  | 'announcement.published'
  | 'communication.message_received';

export interface INotificationIntentDocument extends Document {
  tenantId: Types.ObjectId;
  eventId: string;
  type: NotificationIntentType;
  recipientUserId: Types.ObjectId;
  branchId?: Types.ObjectId;
  sourceType: string;
  sourceId: string;
  occurrenceKey: string;
  data: Record<string, string | number>;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  availableAt: Date;
  attemptCount: number;
  leaseUntil?: Date;
  processedAt?: Date;
  lastError?: string;
}

const schema = new Schema<INotificationIntentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    eventId: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'certificate.issued',
        'payment.success',
        'admission.confirmed',
        'certificate.revoked',
        'class.rescheduled',
        'class.cancelled',
        'assessment.graded',
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
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    sourceType: { type: String, required: true },
    sourceId: { type: String, required: true },
    occurrenceKey: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'],
      default: 'PENDING'
    },
    availableAt: { type: Date, default: Date.now },
    attemptCount: { type: Number, default: 0 },
    leaseUntil: Date,
    processedAt: Date,
    lastError: { type: String, maxlength: 500 }
  },
  { timestamps: true }
);

schema.index({ eventId: 1 }, { unique: true });
schema.index({ status: 1, availableAt: 1, leaseUntil: 1 });

export const NotificationIntentModel = model<INotificationIntentDocument>('NotificationIntent', schema);
