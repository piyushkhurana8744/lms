import { Schema, model, Document, Types } from 'mongoose';

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
export interface IOutboxEventDocument extends Document {
  tenantId: Types.ObjectId;
  eventId: string;
  eventType: 'payment.success' | 'receipt.generated' | 'payment.reversed' | 'refund.success';
  aggregateType: 'Payment' | 'Receipt' | 'Refund';
  aggregateId: Types.ObjectId;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  availableAt: Date;
  processedAt?: Date;
  attemptCount: number;
  lastError?: string;
  leaseUntil?: Date;
}

const OutboxEventSchema = new Schema<IOutboxEventDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  eventId: { type: String, required: true },
  eventType: { type: String, enum: ['payment.success', 'receipt.generated', 'payment.reversed', 'refund.success'], required: true },
  aggregateType: { type: String, enum: ['Payment', 'Receipt', 'Refund'], required: true },
  aggregateId: { type: Schema.Types.ObjectId, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'], default: 'PENDING', index: true },
  availableAt: { type: Date, default: Date.now, index: true },
  processedAt: Date,
  attemptCount: { type: Number, default: 0 },
  lastError: { type: String, maxlength: 500 },
  leaseUntil: Date
}, { timestamps: true });

OutboxEventSchema.index({ eventId: 1 }, { unique: true });
OutboxEventSchema.index({ status: 1, availableAt: 1, leaseUntil: 1 });
export const OutboxEventModel = model<IOutboxEventDocument>('OutboxEvent', OutboxEventSchema);
