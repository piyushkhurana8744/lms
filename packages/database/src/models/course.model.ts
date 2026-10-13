import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ICourseDocument extends Document {
  tenantId: Types.ObjectId;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
  language: string;
  durationMinutes: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourseDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    shortDescription: String,
    description: String,
    thumbnailUrl: String,
    categoryId: String,
    level: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'],
      default: 'BEGINNER'
    },
    language: { type: String, default: 'English' },
    durationMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE', 'UNLISTED'],
      default: 'PUBLIC'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Tenant-Scoped Compound Indexes
CourseSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
CourseSchema.index({ tenantId: 1, status: 1 });
CourseSchema.index({ tenantId: 1, createdAt: -1 });
CourseSchema.index({ tenantId: 1, title: 1 });

CourseSchema.plugin(tenantIsolationPlugin);

export const CourseModel = model<ICourseDocument>('Course', CourseSchema);
