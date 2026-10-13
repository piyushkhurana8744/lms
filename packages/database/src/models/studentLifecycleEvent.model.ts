import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type StudentLifecycleEventType =
  | 'ACTIVATED'
  | 'BATCH_ASSIGNED'
  | 'TRANSFERRED'
  | 'BRANCH_ASSIGNED'
  | 'BRANCH_TRANSFERRED'
  | 'HOLD_STARTED'
  | 'HOLD_ENDED'
  | 'WITHDRAWN'
  | 'DROPPED'
  | 'COMPLETED'
  | 'REACTIVATED';

export interface IStudentLifecycleEventDocument extends Document {
  tenantId: Types.ObjectId;
  lifecycleId: Types.ObjectId;
  studentUserId: Types.ObjectId;
  enrollmentId?: Types.ObjectId;
  lifecycleEpisode: number;
  eventType: StudentLifecycleEventType;
  fromStatus?: string;
  toStatus?: string;
  fromBatchId?: Types.ObjectId;
  toBatchId?: Types.ObjectId;
  fromBranchId?: Types.ObjectId;
  toBranchId?: Types.ObjectId;
  reason?: string;
  effectiveAt: Date;
  performedBy?: Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const StudentLifecycleEventSchema = new Schema<IStudentLifecycleEventDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    lifecycleId: { type: Schema.Types.ObjectId, ref: 'StudentLifecycle', required: true, index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', index: true },
    lifecycleEpisode: { type: Number, required: true, default: 1 },
    eventType: {
      type: String,
      enum: [
        'ACTIVATED',
        'BATCH_ASSIGNED',
        'TRANSFERRED',
        'BRANCH_ASSIGNED',
        'BRANCH_TRANSFERRED',
        'HOLD_STARTED',
        'HOLD_ENDED',
        'WITHDRAWN',
        'DROPPED',
        'COMPLETED',
        'REACTIVATED'
      ],
      required: true,
      index: true
    },
    fromStatus: { type: String },
    toStatus: { type: String },
    fromBatchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    toBatchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    fromBranchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    toBranchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    reason: { type: String, trim: true },
    effectiveAt: { type: Date, required: true, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StudentLifecycleEventSchema.index({ tenantId: 1, lifecycleId: 1, effectiveAt: -1 });
StudentLifecycleEventSchema.index({ tenantId: 1, studentUserId: 1, effectiveAt: -1 });
StudentLifecycleEventSchema.index({ tenantId: 1, eventType: 1, createdAt: -1 });

StudentLifecycleEventSchema.plugin(tenantIsolationPlugin);

export const StudentLifecycleEventModel = model<IStudentLifecycleEventDocument>(
  'StudentLifecycleEvent',
  StudentLifecycleEventSchema
);
