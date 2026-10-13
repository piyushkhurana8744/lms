import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IEnrollmentDocument extends Document {
  tenantId: Types.ObjectId;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  enrolledAt: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
  lastLessonId?: Types.ObjectId;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollmentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    lastAccessedAt: { type: Date },
    lastLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: { type: Number, default: 0, min: 0 },
    totalLessons: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

// Compound Unique Indexes for Tenant Isolation & Anti-Duplicate Security
EnrollmentSchema.index({ tenantId: 1, studentId: 1, courseId: 1 }, { unique: true });
EnrollmentSchema.index({ tenantId: 1, studentId: 1, status: 1 });
EnrollmentSchema.index({ tenantId: 1, courseId: 1, status: 1 });

EnrollmentSchema.plugin(tenantIsolationPlugin);

export const EnrollmentModel = model<IEnrollmentDocument>('Enrollment', EnrollmentSchema);
