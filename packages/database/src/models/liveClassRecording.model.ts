import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type LiveClassRecordingState =
  | 'NOT_ENABLED' | 'NOT_STARTED' | 'AWAITING_PROCESSING' | 'PROCESSING'
  | 'AVAILABLE_AT_PROVIDER' | 'TRANSFERRING' | 'AVAILABLE_IN_LMS'
  | 'FAILED_RETRYABLE' | 'FAILED_PERMANENT' | 'DELETED' | 'EXPIRED';

export interface ILiveClassRecordingFile {
  providerFileId: string;
  fileType: string;
  mimeType?: string;
  sizeBytes?: number;
  status?: string;
  recordingStart?: Date;
  recordingEnd?: Date;
  playUrl?: string;
  downloadUrl?: string;
  storageKey?: string;
  storageProvider?: string;
  checksum?: string;
}

export interface ILiveClassRecordingDocument extends Document {
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  courseId?: Types.ObjectId | null;
  batchId?: Types.ObjectId | null;
  classId: Types.ObjectId;
  instructorId: Types.ObjectId;
  externalMeetingId: Types.ObjectId;
  connectionId: Types.ObjectId;
  provider: 'ZOOM';
  providerMeetingId: string;
  providerMeetingUuid?: string;
  state: LiveClassRecordingState;
  stateVersion: number;
  deliveryMode: 'PROVIDER_HOSTED' | 'LMS_PRIVATE_STORAGE';
  files: ILiveClassRecordingFile[];
  meetingEndedAt?: Date;
  providerCompletedAt?: Date;
  availableAt?: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  attempts: number;
  safeFailureCode?: string;
  safeFailureMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecordingFileSchema = new Schema<ILiveClassRecordingFile>({
  providerFileId: { type: String, required: true },
  fileType: { type: String, required: true },
  mimeType: String,
  sizeBytes: Number,
  status: String,
  recordingStart: Date,
  recordingEnd: Date,
  playUrl: String,
  downloadUrl: String,
  storageKey: String,
  storageProvider: String,
  checksum: String
}, { _id: false });

const LiveClassRecordingSchema = new Schema<ILiveClassRecordingDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
  instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  externalMeetingId: { type: Schema.Types.ObjectId, ref: 'ExternalMeeting', required: true },
  connectionId: { type: Schema.Types.ObjectId, ref: 'IntegrationConnection', required: true },
  provider: { type: String, enum: ['ZOOM'], default: 'ZOOM', required: true },
  providerMeetingId: { type: String, required: true },
  providerMeetingUuid: String,
  state: { type: String, enum: ['NOT_ENABLED','NOT_STARTED','AWAITING_PROCESSING','PROCESSING','AVAILABLE_AT_PROVIDER','TRANSFERRING','AVAILABLE_IN_LMS','FAILED_RETRYABLE','FAILED_PERMANENT','DELETED','EXPIRED'], required: true, default: 'NOT_STARTED', index: true },
  stateVersion: { type: Number, default: 1, min: 1 },
  deliveryMode: { type: String, enum: ['PROVIDER_HOSTED','LMS_PRIVATE_STORAGE'], default: 'PROVIDER_HOSTED' },
  files: { type: [RecordingFileSchema], default: [] },
  meetingEndedAt: Date,
  providerCompletedAt: Date,
  availableAt: Date,
  lastAttemptAt: Date,
  nextRetryAt: { type: Date, default: null, index: true },
  attempts: { type: Number, default: 0, min: 0 },
  safeFailureCode: String,
  safeFailureMessage: String
}, { timestamps: true, collection: 'live_class_recordings' });

LiveClassRecordingSchema.index({ tenantId: 1, provider: 1, providerMeetingId: 1 }, { unique: true });
LiveClassRecordingSchema.index({ tenantId: 1, classId: 1, createdAt: -1 });
LiveClassRecordingSchema.index({ state: 1, nextRetryAt: 1 });
LiveClassRecordingSchema.plugin(tenantIsolationPlugin);

export const LiveClassRecordingModel = model<ILiveClassRecordingDocument>('LiveClassRecording', LiveClassRecordingSchema);
