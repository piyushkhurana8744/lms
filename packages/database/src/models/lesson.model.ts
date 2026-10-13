import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ILessonDocument extends Document {
  tenantId: Types.ObjectId;
  courseId: Types.ObjectId;
  moduleId: Types.ObjectId;
  title: string;
  description?: string;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
  content?: Record<string, any>;
  order: number;
  status: 'ACTIVE' | 'INACTIVE';
  isPreview: boolean;
  estimatedDurationMinutes: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILessonDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['TEXT', 'VIDEO', 'PDF', 'AUDIO', 'EXTERNAL_RESOURCE', 'LIVE'],
      default: 'TEXT',
      required: true
    },
    content: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true
    },
    isPreview: { type: Boolean, default: false },
    estimatedDurationMinutes: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Compound Indexes for Performance & Hierarchy Isolation
LessonSchema.index({ tenantId: 1, moduleId: 1, order: 1 });
LessonSchema.index({ tenantId: 1, courseId: 1, moduleId: 1 });
LessonSchema.index({ tenantId: 1, courseId: 1, createdAt: -1 });

LessonSchema.plugin(tenantIsolationPlugin);

export const LessonModel = model<ILessonDocument>('Lesson', LessonSchema);
