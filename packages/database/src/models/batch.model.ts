import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IBatchDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  batchCode: string;
  courseId?: Types.ObjectId;
  instructorId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate?: Date;
  timing: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  daysOfWeek: string[];
  maxSeats: number;
  enrolledCount: number;
  showOnWebsite: boolean;
  classroomDetails?: {
    branch?: string;
    roomNumber?: string;
    venueAddress?: string;
    contactPhone?: string;
  };
  zoomDetails?: {
    meetingUrl?: string;
    meetingId?: string;
    passcode?: string;
    hostUrl?: string;
    instructions?: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatchDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    batchCode: { type: String, required: true, trim: true, uppercase: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    mode: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'HYBRID'],
      required: true,
      default: 'ONLINE'
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      required: true,
      default: 'UPCOMING'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    timing: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      timezone: { type: String, default: 'Asia/Kolkata' }
    },
    daysOfWeek: [{ type: String, trim: true }],
    maxSeats: { type: Number, required: true, default: 30 },
    enrolledCount: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true, index: true },
    classroomDetails: {
      branch: { type: String, trim: true },
      roomNumber: { type: String, trim: true },
      venueAddress: { type: String, trim: true },
      contactPhone: { type: String, trim: true }
    },
    zoomDetails: {
      meetingUrl: { type: String, trim: true },
      meetingId: { type: String, trim: true },
      passcode: { type: String, trim: true },
      hostUrl: { type: String, trim: true },
      instructions: { type: String, trim: true }
    },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

// Indexes
BatchSchema.index({ tenantId: 1, batchCode: 1 }, { unique: true });
BatchSchema.index({ tenantId: 1, courseId: 1 });
BatchSchema.index({ tenantId: 1, mode: 1 });
BatchSchema.index({ tenantId: 1, status: 1 });
BatchSchema.index({ tenantId: 1, branchId: 1, status: 1 });
BatchSchema.index({ tenantId: 1, showOnWebsite: 1, status: 1 });

BatchSchema.plugin(tenantIsolationPlugin);

export const BatchModel = model<IBatchDocument>('Batch', BatchSchema);
