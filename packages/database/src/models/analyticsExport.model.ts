import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { AnalyticsReportKey } from '@edtech/types';

export interface IAnalyticsExportDocument extends Document {
  tenantId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  reportKey: AnalyticsReportKey;
  format: 'CSV';
  querySnapshot: Record<string, any>;
  status: 'PENDING' | 'READY' | 'FAILED';
  rowCount: number;
  downloadUrl?: string;
  content?: string;
  failureReason?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsExportSchema = new Schema<IAnalyticsExportDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reportKey: {
      type: String,
      required: true,
      index: true
    },
    format: {
      type: String,
      enum: ['CSV'],
      default: 'CSV',
      required: true
    },
    querySnapshot: {
      type: Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['PENDING', 'READY', 'FAILED'],
      default: 'READY',
      index: true
    },
    rowCount: {
      type: Number,
      default: 0
    },
    downloadUrl: {
      type: String
    },
    content: {
      type: String
    },
    failureReason: {
      type: String
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index for automatic expiration
    }
  },
  {
    timestamps: true,
    collection: 'analytics_exports'
  }
);

AnalyticsExportSchema.index({ tenantId: 1, createdAt: -1 });
AnalyticsExportSchema.index({ tenantId: 1, requestedBy: 1, createdAt: -1 });

export const AnalyticsExportModel: Model<IAnalyticsExportDocument> =
  (mongoose.models.AnalyticsExport as Model<IAnalyticsExportDocument>) ||
  mongoose.model<IAnalyticsExportDocument>('AnalyticsExport', AnalyticsExportSchema);
