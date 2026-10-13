import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type LedgerEntryType =
  | 'CHARGE'
  | 'PAYMENT'
  | 'DISCOUNT'
  | 'SCHOLARSHIP'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export interface IFinancialLedgerDocument extends Document {
  tenantId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  studentFeePlanId: Types.ObjectId;
  paymentId?: Types.ObjectId;
  receiptId?: Types.ObjectId;
  refundId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  
  entryType: LedgerEntryType;
  description: string;
  amountMinor: number; // Positive value
  currency: string;
  isDebit: boolean; // true = increases outstanding (charge, refund); false = decreases outstanding (payment, discount)
  
  runningBalanceMinor: number; // Balance after this entry
  actorId?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const FinancialLedgerSchema = new Schema<IFinancialLedgerDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentFeePlanId: { type: Schema.Types.ObjectId, ref: 'StudentFeePlan', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    receiptId: { type: Schema.Types.ObjectId, ref: 'Receipt', default: null },
    refundId: { type: Schema.Types.ObjectId, default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    
    entryType: {
      type: String,
      enum: ['CHARGE', 'PAYMENT', 'DISCOUNT', 'SCHOLARSHIP', 'REFUND', 'ADJUSTMENT', 'REVERSAL'],
      required: true,
      index: true
    },
    description: { type: String, required: true, trim: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    isDebit: { type: Boolean, required: true },
    runningBalanceMinor: { type: Number, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FinancialLedgerSchema.index({ tenantId: 1, studentUserId: 1, createdAt: -1 });
FinancialLedgerSchema.index({ tenantId: 1, studentFeePlanId: 1, createdAt: 1 });
FinancialLedgerSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });

FinancialLedgerSchema.plugin(tenantIsolationPlugin);

export const FinancialLedgerModel = model<IFinancialLedgerDocument>('FinancialLedger', FinancialLedgerSchema);
