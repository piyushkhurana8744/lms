import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IReceiptDocument extends Document {
  tenantId: Types.ObjectId;
  receiptNumber: string; // e.g., RCPT-2026-0001
  paymentId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  studentFeePlanId: Types.ObjectId;
  admissionId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  transactionReference?: string;
  issuedAt: Date;
  
  // Contractual & Issuer Snapshots (immutable once generated)
  studentSnapshot: {
    fullName: string;
    email?: string;
    phone: string;
    studentId?: string;
  };
  courseSnapshot: {
    courseId: string;
    title: string;
    batchName?: string;
  };
  organizationSnapshot: {
    organizationName: string;
    address?: string;
    taxNumber?: string; // GSTIN if applicable
    contactPhone?: string;
    contactEmail?: string;
  };
  
  status: 'ISSUED' | 'CANCELLED';
  artifact?: {
    status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
    storageProvider?: string;
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    generatedAt?: Date;
    lastError?: string;
    leaseUntil?: Date;
  };
  notes?: string;
  issuedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceiptDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    receiptNumber: { type: String, required: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentFeePlanId: { type: Schema.Types.ObjectId, ref: 'StudentFeePlan', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    paymentMethod: { type: String, required: true },
    transactionReference: { type: String, trim: true },
    issuedAt: { type: Date, default: Date.now },
    
    studentSnapshot: {
      fullName: { type: String, required: true },
      email: { type: String },
      phone: { type: String, default: '' },
      studentId: { type: String }
    },
    courseSnapshot: {
      courseId: { type: String, required: true },
      title: { type: String, required: true },
      batchName: { type: String }
    },
    organizationSnapshot: {
      organizationName: { type: String, required: true },
      address: { type: String },
      taxNumber: { type: String },
      contactPhone: { type: String },
      contactEmail: { type: String }
    },
    
    status: { type: String, enum: ['ISSUED', 'CANCELLED'], default: 'ISSUED' },
    artifact: {
      status: { type: String, enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'], default: 'PENDING' },
      storageProvider: String,
      storageKey: String,
      mimeType: String,
      sizeBytes: Number,
      generatedAt: Date,
      lastError: String,
      leaseUntil: Date
    },
    notes: { type: String, trim: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

ReceiptSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
ReceiptSchema.index({ tenantId: 1, paymentId: 1 }, { unique: true });
ReceiptSchema.index({ tenantId: 1, studentUserId: 1, createdAt: -1 });
ReceiptSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });

ReceiptSchema.plugin(tenantIsolationPlugin);

export const ReceiptModel = model<IReceiptDocument>('Receipt', ReceiptSchema);
