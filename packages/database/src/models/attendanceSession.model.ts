import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IAttendanceSessionDocument extends Document {
  tenantId: Types.ObjectId; classId: Types.ObjectId; batchId?: Types.ObjectId; courseId?: Types.ObjectId;
  sessionDate: Date; scheduledSnapshot: { name: string; mode: string; startDate: Date; endDate?: Date; startTime: string; endTime: string; timezone: string; branch?: string };
  status: 'OPEN' | 'FINALIZED'; openedAt: Date; openedBy: Types.ObjectId; finalizedAt?: Date; finalizedBy?: Types.ObjectId;
  expectedStudentCount: number; markedStudentCount: number; createdAt: Date; updatedAt: Date;
}
const schema = new Schema<IAttendanceSessionDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', index: true }, courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true }, sessionDate: { type: Date, required: true, index: true },
  scheduledSnapshot: { name: { type: String, required: true }, mode: { type: String, required: true }, startDate: { type: Date, required: true }, endDate: Date, startTime: String, endTime: String, timezone: String, branch: String },
  status: { type: String, enum: ['OPEN', 'FINALIZED'], default: 'OPEN', index: true }, openedAt: { type: Date, default: Date.now }, openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  finalizedAt: Date, finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' }, expectedStudentCount: { type: Number, default: 0 }, markedStudentCount: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ tenantId: 1, classId: 1 }, { unique: true }); schema.index({ tenantId: 1, batchId: 1, sessionDate: -1 }); schema.index({ tenantId: 1, status: 1, sessionDate: -1 }); schema.plugin(tenantIsolationPlugin);
export const AttendanceSessionModel = model<IAttendanceSessionDocument>('AttendanceSession', schema);
