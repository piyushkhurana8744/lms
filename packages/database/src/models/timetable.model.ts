import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ITimetableDocument extends Document {
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId;
  batchId: Types.ObjectId;
  calendarId: Types.ObjectId;
  name: string;
  timezone: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  effectiveFrom: Date;
  effectiveTo: Date;
  version: number;
  revision: number;
  slots: Array<{
    _id: Types.ObjectId;
    dayOfWeek: number;
    localStartTime: string;
    localEndTime: string;
    instructorId: Types.ObjectId;
    mode: 'OFFLINE' | 'ONLINE' | 'HYBRID';
    roomId?: Types.ObjectId;
    meetingUrl?: string;
    title?: string;
  }>;
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
}

const slot = new Schema({
  dayOfWeek: { type: Number, min: 1, max: 7, required: true },
  localStartTime: { type: String, required: true },
  localEndTime: { type: String, required: true },
  instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, enum: ['OFFLINE', 'ONLINE', 'HYBRID'], required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'AcademicRoom' },
  meetingUrl: String,
  title: String,
});

const schema = new Schema<ITimetableDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    calendarId: { type: Schema.Types.ObjectId, ref: 'AcademicCalendar', required: true },
    name: { type: String, required: true, trim: true },
    timezone: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, required: true },
    version: { type: Number, default: 1 },
    revision: { type: Number, default: 0 },
    slots: [slot],
    publishedAt: Date,
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, optimisticConcurrency: true },
);

schema.index({ tenantId: 1, batchId: 1, status: 1 });
schema.index({ tenantId: 1, branchId: 1, status: 1 });
schema.plugin(tenantIsolationPlugin);

export const TimetableModel = model<ITimetableDocument>('Timetable', schema);
