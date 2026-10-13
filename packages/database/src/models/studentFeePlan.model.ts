import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type DiscountType = 'FLAT' | 'PERCENTAGE' | 'SCHOLARSHIP' | 'PROMOTIONAL';
export type InstallmentStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type FeePlanStatus = 'DRAFT' | 'ACTIVE' | 'FULLY_PAID' | 'DEFAULTED' | 'CANCELLED';

export interface IStudentInstallment {
  _id?: Types.ObjectId;
  sequence: number;
  label: string;
  dueDate: Date;
  amountMinor: number; // Scheduled amount in minor units
  paidAmountMinor: number; // Allocated paid amount
  status: InstallmentStatus;
  paidAt?: Date;
}

export interface IStudentFeePlanDocument extends Document {
  tenantId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  admissionId?: Types.ObjectId;
  enrollmentId?: Types.ObjectId;
  courseId: Types.ObjectId;
  batchId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  feeStructureId?: Types.ObjectId;
  feeStructureSnapshot?: {
    name: string;
    code?: string;
    totalAmountMinor: number;
    components: Array<{ name: string; type: string; amountMinor: number; isRefundable?: boolean }>;
    capturedAt: Date;
  };
  currency: string;
  
  // Financial Snapshot
  baseAmountMinor: number; // Original fee amount in minor units
  discountType?: DiscountType;
  discountValue?: number; // Integer minor units (if FLAT) or percentage (if PERCENTAGE)
  discountAmountMinor: number; // Total discount deducted
  discountReason?: string;
  discountApprovedBy?: Types.ObjectId;
  discountApprovedAt?: Date;
  
  netPayableMinor: number; // baseAmountMinor - discountAmountMinor
  paidAmountMinor: number; // Cumulative verified payments allocated
  outstandingBalanceMinor: number; // netPayableMinor - paidAmountMinor + refund adjustments
  
  installments: IStudentInstallment[];
  status: FeePlanStatus;
  notes?: string;
  
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StudentInstallmentSchema = new Schema<IStudentInstallment>(
  {
    sequence: { type: Number, required: true, min: 1 },
    label: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    amountMinor: { type: Number, required: true, min: 1 },
    paidAmountMinor: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
      default: 'UPCOMING'
    },
    paidAt: { type: Date }
  },
  { _id: true }
);

const StudentFeePlanSchema = new Schema<IStudentFeePlanDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', default: null, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', default: null },
    feeStructureSnapshot: {
      name: { type: String },
      code: { type: String },
      totalAmountMinor: { type: Number, min: 0 },
      components: [{
        _id: false,
        name: { type: String },
        type: { type: String },
        amountMinor: { type: Number, min: 0 },
        isRefundable: { type: Boolean }
      }],
      capturedAt: { type: Date }
    },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    
    baseAmountMinor: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ['FLAT', 'PERCENTAGE', 'SCHOLARSHIP', 'PROMOTIONAL'] },
    discountValue: { type: Number, min: 0 },
    discountAmountMinor: { type: Number, default: 0, min: 0 },
    discountReason: { type: String, trim: true },
    discountApprovedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    discountApprovedAt: { type: Date },
    
    netPayableMinor: { type: Number, required: true, min: 0 },
    paidAmountMinor: { type: Number, default: 0, min: 0 },
    outstandingBalanceMinor: { type: Number, required: true, min: 0 },
    
    installments: { type: [StudentInstallmentSchema], default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'FULLY_PAID', 'DEFAULTED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    notes: { type: String, trim: true },
    
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

StudentFeePlanSchema.index({ tenantId: 1, studentUserId: 1 });
StudentFeePlanSchema.index({ tenantId: 1, status: 1 });
StudentFeePlanSchema.index({ tenantId: 1, 'installments.dueDate': 1, 'installments.status': 1 });

StudentFeePlanSchema.plugin(tenantIsolationPlugin);

export const StudentFeePlanModel = model<IStudentFeePlanDocument>('StudentFeePlan', StudentFeePlanSchema);
