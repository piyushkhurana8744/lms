import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type StudentLifecycleStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'WITHDRAWN'
  | 'DROPPED'
  | 'COMPLETED';

export interface IStudentHoldRecord {
  holdId: Types.ObjectId;
  effectiveFrom: Date;
  expectedResumeDate?: Date;
  resumedAt?: Date;
  reason: string;
  notes?: string;
  placedBy: Types.ObjectId;
}

export interface IStudentLifecycleDocument extends Document {
  tenantId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  organizationMemberId?: Types.ObjectId;
  admissionId?: Types.ObjectId;
  currentEnrollmentId: Types.ObjectId;
  courseId?: Types.ObjectId;
  currentBatchId?: Types.ObjectId;
  currentBranchId?: Types.ObjectId;
  currentStatus: StudentLifecycleStatus;
  lifecycleEpisode: number;
  studentNumber?: string;
  activatedAt?: Date;
  completedAt?: Date;
  withdrawnAt?: Date;
  withdrawalReason?: string;
  droppedAt?: Date;
  droppedReason?: string;
  currentHold?: {
    holdId: Types.ObjectId;
    effectiveFrom: Date;
    expectedResumeDate?: Date;
    reason: string;
    notes?: string;
    placedBy: Types.ObjectId;
  };
  holdHistory: IStudentHoldRecord[];
  isTerminal: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const StudentHoldSubSchema = new Schema<IStudentHoldRecord>(
  {
    holdId: { type: Schema.Types.ObjectId, required: true },
    effectiveFrom: { type: Date, required: true },
    expectedResumeDate: { type: Date },
    resumedAt: { type: Date },
    reason: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    placedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { _id: false }
);

const StudentLifecycleSchema = new Schema<IStudentLifecycleDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationMemberId: { type: Schema.Types.ObjectId, ref: 'OrganizationMember' },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', index: true },
    currentEnrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    currentBatchId: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    currentBranchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    currentStatus: {
      type: String,
      enum: ['PENDING_ACTIVATION', 'ACTIVE', 'ON_HOLD', 'WITHDRAWN', 'DROPPED', 'COMPLETED'],
      default: 'PENDING_ACTIVATION',
      required: true,
      index: true
    },
    lifecycleEpisode: { type: Number, default: 1, required: true },
    studentNumber: { type: String, trim: true, uppercase: true },
    activatedAt: { type: Date },
    completedAt: { type: Date },
    withdrawnAt: { type: Date },
    withdrawalReason: { type: String, trim: true },
    droppedAt: { type: Date },
    droppedReason: { type: String, trim: true },
    currentHold: {
      holdId: { type: Schema.Types.ObjectId },
      effectiveFrom: { type: Date },
      expectedResumeDate: { type: Date },
      reason: { type: String, trim: true },
      notes: { type: String, trim: true },
      placedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    holdHistory: [StudentHoldSubSchema],
    isTerminal: { type: Boolean, default: false, index: true },
    revision: { type: Number, default: 0, required: true }
  },
  { timestamps: true }
);

StudentLifecycleSchema.index(
  { tenantId: 1, studentUserId: 1, currentEnrollmentId: 1, lifecycleEpisode: 1 },
  { unique: true }
);
StudentLifecycleSchema.index(
  { tenantId: 1, studentNumber: 1 },
  { unique: true, partialFilterExpression: { studentNumber: { $type: 'string' } } }
);
StudentLifecycleSchema.index({ tenantId: 1, currentStatus: 1, updatedAt: -1 });
StudentLifecycleSchema.index({ tenantId: 1, currentBatchId: 1, currentStatus: 1 });
StudentLifecycleSchema.index({ tenantId: 1, currentBranchId: 1, currentStatus: 1 });

StudentLifecycleSchema.plugin(tenantIsolationPlugin);

export const StudentLifecycleModel = model<IStudentLifecycleDocument>(
  'StudentLifecycle',
  StudentLifecycleSchema
);
