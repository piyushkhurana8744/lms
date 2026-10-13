import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ICourseModuleDocument extends Document {
  tenantId: Types.ObjectId;
  courseId: Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CourseModuleSchema = new Schema<ICourseModuleDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,
    order: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Tenant-Scoped Compound Indexes
CourseModuleSchema.index({ tenantId: 1, courseId: 1, order: 1 });
CourseModuleSchema.index({ tenantId: 1, courseId: 1, createdAt: -1 });

CourseModuleSchema.plugin(tenantIsolationPlugin);

export const CourseModuleModel = model<ICourseModuleDocument>('CourseModule', CourseModuleSchema);
