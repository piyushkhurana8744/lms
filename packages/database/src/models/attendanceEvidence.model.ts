import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import { IntegrationProvider } from '@edtech/types';

export interface IAttendanceEvidenceDocument extends Document {
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  classId: Types.ObjectId;
  provider: IntegrationProvider;
  externalMeetingId: string;
  participantExternalId: string;
  displayName: string;
  email?: string;
  joinTime: Date;
  leaveTime?: Date;
  durationMinutes: number;
  resolvedStudentId?: Types.ObjectId | null;
  resolutionStatus: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT';
  importedToAttendanceSession: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceEvidenceSchema = new Schema<IAttendanceEvidenceDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    externalMeetingId: { type: String, required: true },
    participantExternalId: { type: String, required: true },
    displayName: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    joinTime: { type: Date, required: true },
    leaveTime: { type: Date, default: null },
    durationMinutes: { type: Number, required: true, min: 0 },
    resolvedStudentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionStatus: {
      type: String,
      enum: ['RESOLVED', 'UNRESOLVED', 'CONFLICT'],
      default: 'UNRESOLVED',
      required: true,
      index: true
    },
    importedToAttendanceSession: { type: Boolean, default: false, index: true }
  },
  {
    timestamps: true,
    collection: 'attendance_evidences'
  }
);

AttendanceEvidenceSchema.index({ tenantId: 1, classId: 1, participantExternalId: 1, joinTime: 1 });
AttendanceEvidenceSchema.index({ tenantId: 1, classId: 1, resolutionStatus: 1 });
AttendanceEvidenceSchema.index({ tenantId: 1, branchId: 1 });

AttendanceEvidenceSchema.plugin(tenantIsolationPlugin);

export const AttendanceEvidenceModel = model<IAttendanceEvidenceDocument>(
  'AttendanceEvidence',
  AttendanceEvidenceSchema
);
