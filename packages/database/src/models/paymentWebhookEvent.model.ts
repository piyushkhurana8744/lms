import { Schema, model, Document, Types } from 'mongoose';

export interface IPaymentWebhookEventDocument extends Document {
  tenantId: Types.ObjectId;
  provider: 'RAZORPAY';
  providerEventId: string;
  eventType: string;
  status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  attemptCount: number;
  paymentId?: Types.ObjectId;
  refundId?: Types.ObjectId;
  receivedAt: Date;
  processedAt?: Date;
  lastError?: string;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEventDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  provider: { type: String, enum: ['RAZORPAY'], required: true },
  providerEventId: { type: String, required: true },
  eventType: { type: String, required: true },
  status: { type: String, enum: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'], default: 'RECEIVED', index: true },
  attemptCount: { type: Number, default: 0 },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  refundId: { type: Schema.Types.ObjectId, ref: 'Refund' },
  receivedAt: { type: Date, default: Date.now },
  processedAt: Date,
  lastError: { type: String, maxlength: 500 }
}, { timestamps: true });

PaymentWebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });
PaymentWebhookEventSchema.index({ status: 1, updatedAt: 1 });

export const PaymentWebhookEventModel = model<IPaymentWebhookEventDocument>('PaymentWebhookEvent', PaymentWebhookEventSchema);
