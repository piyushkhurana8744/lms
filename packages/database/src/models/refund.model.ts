import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED';

export interface IRefundDocument extends Document {
  tenantId: Types.ObjectId;
  refundNumber: string; // e.g., RFND-2026-0001
  paymentId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  studentFeePlanId: Types.ObjectId;
  branchId?: Types.ObjectId;
  
  amountMinor: number; // In minor units
  currency: string;
  reason: string;
  status: RefundStatus;
  
  gatewayProvider?: string;
  gatewayRefundId?: string;
  
  requestedBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  processedAt?: Date;
  failureReason?: string;
  reconciliationLeaseUntil?: Date;
  nextReconcileAt?: Date;
  reconciliationAttempts?: number;
  reconciliationAnomaly?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefundDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    refundNumber: { type: String, required: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentFeePlanId: { type: Schema.Types.ObjectId, ref: 'StudentFeePlan', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED'],
      default: 'REQUESTED',
      index: true
    },
    
    gatewayProvider: { type: String, trim: true },
    gatewayRefundId: { type: String, trim: true, index: true },
    
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date },
    processedAt: { type: Date },
    failureReason: { type: String, trim: true }
    ,reconciliationLeaseUntil: Date
    ,nextReconcileAt: Date
    ,reconciliationAttempts: { type: Number, default: 0 }
    ,reconciliationAnomaly: { type: String, trim: true }
  },
  { timestamps: true }
);

RefundSchema.index({ tenantId: 1, refundNumber: 1 }, { unique: true });
RefundSchema.index({ tenantId: 1, paymentId: 1 });
RefundSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
RefundSchema.index({ status: 1, nextReconcileAt: 1, reconciliationLeaseUntil: 1 });
RefundSchema.index(
  { gatewayProvider: 1, gatewayRefundId: 1 },
  { unique: true, partialFilterExpression: { gatewayRefundId: { $type: 'string' } } }
);

RefundSchema.plugin(tenantIsolationPlugin);

export const RefundModel = model<IRefundDocument>('Refund', RefundSchema);
