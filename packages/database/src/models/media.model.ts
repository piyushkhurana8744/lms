import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IMediaDocument extends Document {
  tenantId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  originalFileName: string;
  storageKey: string;
  storageProvider?: 'LOCAL' | 'CLOUDFLARE_R2' | 'AWS_S3' | 'AMAZON_S3' | 'CLOUDINARY';
  providerMetadata?: Record<string, any>;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'VIDEO' | 'PDF' | 'AUDIO' | 'IMAGE';
  status: 'UPLOADING' | 'READY' | 'FAILED' | 'DELETED';
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMediaDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalFileName: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true, trim: true },
    storageProvider: {
      type: String,
      enum: ['LOCAL', 'CLOUDFLARE_R2', 'AWS_S3', 'AMAZON_S3', 'CLOUDINARY'],
      default: 'CLOUDFLARE_R2',
      index: true
    },
    providerMetadata: { type: Schema.Types.Mixed },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    mediaType: {
      type: String,
      enum: ['VIDEO', 'PDF', 'AUDIO', 'IMAGE'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['UPLOADING', 'READY', 'FAILED', 'DELETED'],
      default: 'READY',
      index: true
    },
    url: { type: String, trim: true }
  },
  { timestamps: true }
);

// Indexes required by spec
MediaSchema.index({ tenantId: 1, createdAt: -1 });
MediaSchema.index({ tenantId: 1, mediaType: 1, createdAt: -1 });

MediaSchema.plugin(tenantIsolationPlugin);

export const MediaModel = model<IMediaDocument>('Media', MediaSchema);
