import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CHEQUE'
  | 'ONLINE_GATEWAY'
  | 'OTHER';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'REVERSED';

export interface IPaymentAllocationDoc {
  studentFeePlanId: Types.ObjectId;
  installmentId?: Types.ObjectId;
  amountMinor: number; // Integer minor units allocated
}

export interface IPaymentDocument extends Document {
  tenantId: Types.ObjectId;
  paymentNumber: string; // e.g., PAY-2026-0001
  studentUserId: Types.ObjectId;
  studentFeePlanId: Types.ObjectId;
  admissionId?: Types.ObjectId;
  enrollmentId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  
  amountMinor: number; // In minor units (e.g. paise)
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Offline/Manual Metadata
  transactionReference?: string; // Cheque number, UTR number, or bank ref
  receivedAt: Date;
  collectedBy?: Types.ObjectId; // Staff member who physically collected
  verifiedBy?: Types.ObjectId; // Finance approver
  verifiedAt?: Date;
  
  // Online Gateway Metadata
  gatewayProvider?: 'RAZORPAY' | 'STRIPE' | 'MANUAL';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  idempotencyKey?: string;
  
  allocations: IPaymentAllocationDoc[];
  receiptId?: Types.ObjectId;
  refundedAmountMinor: number;
  reservedRefundAmountMinor: number;
  notes?: string;
  reversedAt?: Date;
  reversedBy?: Types.ObjectId;
  reversalReason?: string;
  reconciliationLeaseUntil?: Date;
  nextReconcileAt?: Date;
  reconciliationAttempts?: number;
  reconciliationAnomaly?: string;
  
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentAllocationSchema = new Schema<IPaymentAllocationDoc>(
  {
    studentFeePlanId: { type: Schema.Types.ObjectId, ref: 'StudentFeePlan', required: true },
    installmentId: { type: Schema.Types.ObjectId },
    amountMinor: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    paymentNumber: { type: String, required: true, trim: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentFeePlanId: { type: Schema.Types.ObjectId, ref: 'StudentFeePlan', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', default: null },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    method: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE_GATEWAY', 'OTHER'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED'],
      default: 'PENDING',
      index: true
    },
    
    transactionReference: { type: String, trim: true },
    receivedAt: { type: Date, default: Date.now, index: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date },
    
    gatewayProvider: { type: String, enum: ['RAZORPAY', 'STRIPE', 'MANUAL'], default: 'MANUAL' },
    gatewayOrderId: { type: String, trim: true, index: true },
    gatewayPaymentId: { type: String, trim: true, index: true },
    gatewaySignature: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true, index: true },
    
    allocations: { type: [PaymentAllocationSchema], default: [] },
    receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt', default: null },
    refundedAmountMinor: { type: Number, default: 0, min: 0 },
    reservedRefundAmountMinor: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    reversedAt: Date,
    reversedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reversalReason: { type: String, trim: true },
    reconciliationLeaseUntil: Date,
    nextReconcileAt: Date,
    reconciliationAttempts: { type: Number, default: 0 },
    reconciliationAnomaly: { type: String, trim: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Compound Unique & Query Indexes
PaymentSchema.index({ tenantId: 1, paymentNumber: 1 }, { unique: true });
PaymentSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
PaymentSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
PaymentSchema.index(
  { gatewayProvider: 1, gatewayOrderId: 1 },
  { unique: true, partialFilterExpression: { gatewayOrderId: { $type: 'string' } } }
);
PaymentSchema.index(
  { gatewayProvider: 1, gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } }
);
PaymentSchema.index({ tenantId: 1, studentUserId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, nextReconcileAt: 1, reconciliationLeaseUntil: 1 });

PaymentSchema.plugin(tenantIsolationPlugin);

export const PaymentModel = model<IPaymentDocument>('Payment', PaymentSchema);
