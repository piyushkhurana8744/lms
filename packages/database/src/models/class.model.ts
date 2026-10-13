import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IClassEnrolledStudentDoc {
  studentId: Types.ObjectId;
  studentName?: string;
  studentEmail?: string;
  enrolledAt: Date;
  status: 'ENROLLED' | 'CANCELLED';
}

export interface IClassDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  classCode: string;
  courseId?: Types.ObjectId;
  batchId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  capacity: number; // Strict seat limit
  enrolledCount: number;
  enrolledStudents: IClassEnrolledStudentDoc[];
  status: 'SCHEDULED' | 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate?: Date;
  timing: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  daysOfWeek: string[];
  showOnWebsite: boolean;
  zoomDetails?: {
    meetingUrl?: string;
    meetingId?: string;
    passcode?: string;
    hostUrl?: string;
    instructions?: string;
    autoRecord?: boolean;
  };
  classroomDetails?: {
    branch?: string;
    roomNumber?: string;
    floor?: string;
    venueAddress?: string;
    centerContact?: string;
    facilities?: string[];
  };
  notes?: string;
  scheduledStartAt?: Date; scheduledEndAt?: Date; originalStartAt?: Date; originalEndAt?: Date; timezone?: string;
  instructorId?: Types.ObjectId; roomId?: Types.ObjectId; timetableId?: Types.ObjectId; timetableSlotId?: Types.ObjectId; scheduleVersion?: number;
  source: 'LEGACY'|'TIMETABLE'|'ONE_OFF'; occurrenceKey?: string; scheduleRevision: number; isRescheduled: boolean;
  cancellationReason?: string; cancelledAt?: Date; cancelledBy?: Types.ObjectId;
  rescheduleHistory: Array<{ previousStart: Date; previousEnd: Date; newStart: Date; newEnd: Date; previousInstructorId?: Types.ObjectId; newInstructorId?: Types.ObjectId; previousRoomId?: Types.ObjectId; newRoomId?: Types.ObjectId; reason: string; changedBy: Types.ObjectId; changedAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const EnrolledStudentSubSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, trim: true, lowercase: true },
    enrolledAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ENROLLED', 'CANCELLED'],
      default: 'ENROLLED'
    }
  },
  { _id: false }
);

const ClassSchema = new Schema<IClassDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    classCode: { type: String, required: true, trim: true, uppercase: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    mode: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'HYBRID'],
      required: true,
      default: 'ONLINE',
      index: true
    },
    capacity: {
      type: Number,
      required: true,
      min: [1, 'Class capacity must be at least 1 seat'],
      default: 25
    },
    enrolledCount: {
      type: Number,
      default: 0,
      min: 0
    },
    enrolledStudents: [EnrolledStudentSubSchema],
    status: {
      type: String,
      enum: ['SCHEDULED', 'ACTIVE', 'FULL', 'COMPLETED', 'CANCELLED'],
      required: true,
      default: 'SCHEDULED',
      index: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    timing: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      timezone: { type: String, default: 'Asia/Kolkata' }
    },
    daysOfWeek: [{ type: String, trim: true }],
    showOnWebsite: { type: Boolean, default: true, index: true },
    zoomDetails: {
      meetingUrl: { type: String, trim: true },
      meetingId: { type: String, trim: true },
      passcode: { type: String, trim: true },
      hostUrl: { type: String, trim: true },
      instructions: { type: String, trim: true },
      autoRecord: { type: Boolean, default: false }
    },
    classroomDetails: {
      branch: { type: String, trim: true },
      roomNumber: { type: String, trim: true },
      floor: { type: String, trim: true },
      venueAddress: { type: String, trim: true },
      centerContact: { type: String, trim: true },
      facilities: [{ type: String, trim: true }]
    },
    notes: { type: String, trim: true }
    ,scheduledStartAt: Date, scheduledEndAt: Date, originalStartAt: Date, originalEndAt: Date, timezone: String,
    instructorId: { type: Schema.Types.ObjectId, ref: 'User' }, roomId: { type: Schema.Types.ObjectId, ref: 'AcademicRoom' }, timetableId: { type: Schema.Types.ObjectId, ref: 'Timetable' }, timetableSlotId: Schema.Types.ObjectId, scheduleVersion: Number,
    source: { type: String, enum: ['LEGACY','TIMETABLE','ONE_OFF'], default: 'LEGACY' }, occurrenceKey: String, scheduleRevision: { type: Number, default: 0 }, isRescheduled: { type: Boolean, default: false },
    cancellationReason: String, cancelledAt: Date, cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rescheduleHistory: [{ previousStart: Date, previousEnd: Date, newStart: Date, newEnd: Date, previousInstructorId: Schema.Types.ObjectId, newInstructorId: Schema.Types.ObjectId, previousRoomId: Schema.Types.ObjectId, newRoomId: Schema.Types.ObjectId, reason: String, changedBy: Schema.Types.ObjectId, changedAt: Date }]
  },
  { timestamps: true }
);

// Multi-tenant indexes for isolation & high throughput searches
ClassSchema.index({ tenantId: 1, classCode: 1 }, { unique: true });
ClassSchema.index({ tenantId: 1, courseId: 1 });
ClassSchema.index({ tenantId: 1, batchId: 1 });
ClassSchema.index({ tenantId: 1, branchId: 1, scheduledStartAt: 1 });
ClassSchema.index({ tenantId: 1, mode: 1 });
ClassSchema.index({ tenantId: 1, status: 1 });
ClassSchema.index({ tenantId: 1, showOnWebsite: 1, status: 1 });
ClassSchema.index({ tenantId: 1, 'enrolledStudents.studentId': 1 });
ClassSchema.index({ tenantId: 1, occurrenceKey: 1 }, { unique: true, partialFilterExpression: { occurrenceKey: { $type: 'string' } } });
ClassSchema.index({ tenantId: 1, scheduledStartAt: 1 }); ClassSchema.index({ tenantId: 1, batchId: 1, scheduledStartAt: 1 }); ClassSchema.index({ tenantId: 1, instructorId: 1, scheduledStartAt: 1, scheduledEndAt: 1, status: 1 }); ClassSchema.index({ tenantId: 1, roomId: 1, scheduledStartAt: 1, scheduledEndAt: 1, status: 1 });

ClassSchema.plugin(tenantIsolationPlugin);

export const ClassModel = model<IClassDocument>('Class', ClassSchema);
