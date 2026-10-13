import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type FeeComponentType = 'TUITION' | 'ADMISSION' | 'EXAMINATION' | 'REGISTRATION' | 'MATERIAL' | 'LIBRARY' | 'OTHER';

export interface IFeeComponent {
  name: string;
  type: FeeComponentType;
  amountMinor: number; // Integer minor units (e.g., 2500000 paise = ₹25,000)
  isRefundable?: boolean;
}

export interface IInstallmentTemplate {
  sequence: number;
  label: string; // e.g. "Admission Booking", "Installment 1"
  percentage?: number; // e.g. 40%
  amountMinor?: number; // Optional fixed amountMinor
  dueDaysAfterAdmission: number; // e.g., 0 for day of admission, 30 for 1 month later
}

export interface IFeeStructureDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  code?: string;
  courseId: Types.ObjectId;
  batchId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  currency: string; // e.g. 'INR'
  totalAmountMinor: number; // Integer minor units
  components: IFeeComponent[];
  installmentTemplates: IInstallmentTemplate[];
  status: 'ACTIVE' | 'ARCHIVED';
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeeComponentSchema = new Schema<IFeeComponent>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['TUITION', 'ADMISSION', 'EXAMINATION', 'REGISTRATION', 'MATERIAL', 'LIBRARY', 'OTHER'],
      default: 'TUITION'
    },
    amountMinor: { type: Number, required: true, min: 0 },
    isRefundable: { type: Boolean, default: false }
  },
  { _id: false }
);

const InstallmentTemplateSchema = new Schema<IInstallmentTemplate>(
  {
    sequence: { type: Number, required: true, min: 1 },
    label: { type: String, required: true, trim: true },
    percentage: { type: Number, min: 0, max: 100 },
    amountMinor: { type: Number, min: 0 },
    dueDaysAfterAdmission: { type: Number, required: true, default: 0, min: 0 }
  },
  { _id: false }
);

const FeeStructureSchema = new Schema<IFeeStructureDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    currency: { type: String, default: 'INR', uppercase: true, trim: true },
    totalAmountMinor: { type: Number, required: true, min: 0 },
    components: { type: [FeeComponentSchema], default: [] },
    installmentTemplates: { type: [InstallmentTemplateSchema], default: [] },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

FeeStructureSchema.index({ tenantId: 1, courseId: 1, status: 1 });
FeeStructureSchema.index({ tenantId: 1, code: 1 });

FeeStructureSchema.plugin(tenantIsolationPlugin);

export const FeeStructureModel = model<IFeeStructureDocument>('FeeStructure', FeeStructureSchema);
