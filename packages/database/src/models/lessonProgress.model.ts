import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ILessonProgressDocument extends Document {
  tenantId: Types.ObjectId;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
  moduleId: Types.ObjectId;
  lessonId: Types.ObjectId;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt?: Date;
  completedAt?: Date;
  lastPositionSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const LessonProgressSchema = new Schema<ILessonProgressDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED',
      index: true
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastPositionSeconds: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

// Compound Unique Indexes for Tenant Isolation & Anti-Duplicate Security
LessonProgressSchema.index({ tenantId: 1, studentId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ tenantId: 1, studentId: 1, courseId: 1 });

LessonProgressSchema.plugin(tenantIsolationPlugin);

export const LessonProgressModel = model<ILessonProgressDocument>('LessonProgress', LessonProgressSchema);
