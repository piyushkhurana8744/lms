import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type AdmissionStatus =
  | 'DRAFT'
  | 'APPLICATION_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'ADMITTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface IAdmissionDocument extends Document {
  tenantId: Types.ObjectId;
  admissionNumber?: string;
  leadId: Types.ObjectId;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
    dob?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    guardianName?: string;
    guardianPhone?: string;
  };
  courseId: Types.ObjectId;
  batchId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  legacyBranch?: string;
  assignedCounsellor?: Types.ObjectId;
  status: AdmissionStatus;
  applicationDate: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  admittedAt?: Date;
  admittedBy?: Types.ObjectId;
  studentUserId?: Types.ObjectId;
  enrollmentId?: Types.ObjectId;
  notes?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionSchema = new Schema<IAdmissionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    admissionNumber: { type: String, trim: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    applicant: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
      dob: Date,
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
      address: {
        street: String,
        city: String,
        state: String,
        pincode: String
      },
      guardianName: String,
      guardianPhone: String
    },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    legacyBranch: { type: String, trim: true },
    assignedCounsellor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'APPLICATION_SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'ADMITTED',
        'REJECTED',
        'CANCELLED'
      ],
      default: 'DRAFT',
      index: true
    },
    applicationDate: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    admittedAt: { type: Date, default: null },
    admittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

AdmissionSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
AdmissionSchema.index(
  { tenantId: 1, leadId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['DRAFT', 'APPLICATION_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ADMITTED'] }
    }
  }
);

AdmissionSchema.plugin(tenantIsolationPlugin);

export const AdmissionModel = model<IAdmissionDocument>('Admission', AdmissionSchema);
