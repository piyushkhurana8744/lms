import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import {
  CommunicationPriority,
  CommunicationAnnouncementStatus,
  CommunicationAudienceType,
  ICommunicationAttachment,
  ICommunicationAudienceCriteria,
  ICommunicationAudienceSnapshot,
  ICommunicationDeliverySummary
} from '@edtech/types';

export interface ICommunicationAnnouncementDocument extends Document {
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  senderUserId: Types.ObjectId;
  senderName?: string;
  senderMemberId?: Types.ObjectId | null;
  senderRole?: string;
  title: string;
  body: string;
  priority: CommunicationPriority;
  status: CommunicationAnnouncementStatus;
  audienceType: CommunicationAudienceType;
  audienceCriteria?: ICommunicationAudienceCriteria;
  audienceSnapshot?: {
    recipientUserIds: Types.ObjectId[];
    recipientCount: number;
    resolvedAt: Date;
  };
  channels: string[];
  attachments: ICommunicationAttachment[];
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  cancelledAt?: Date | null;
  archivedAt?: Date | null;
  deliverySummary?: ICommunicationDeliverySummary;
  revision: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationAnnouncementSchema = new Schema<ICommunicationAnnouncementDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, maxlength: 120 },
    senderMemberId: { type: Schema.Types.ObjectId, ref: 'OrganizationMember', default: null },
    senderRole: { type: String, maxlength: 60 },
    title: { type: String, required: true, maxlength: 200, trim: true },
    body: { type: String, required: true, maxlength: 5000 },
    priority: {
      type: String,
      enum: ['NORMAL', 'IMPORTANT', 'URGENT'],
      default: 'NORMAL',
      required: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'],
      default: 'DRAFT',
      required: true,
      index: true
    },
    audienceType: {
      type: String,
      enum: [
        'ALL_AUTHORIZED',
        'BRANCH',
        'BATCH',
        'COURSE',
        'STUDENTS',
        'INSTRUCTORS',
        'STAFF',
        'SPECIFIC_USERS'
      ],
      required: true
    },
    audienceCriteria: {
      branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
      batchIds: [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
      courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
      userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      roles: [{ type: String }]
    },
    audienceSnapshot: {
      recipientUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      recipientCount: { type: Number, default: 0 },
      resolvedAt: { type: Date }
    },
    channels: {
      type: [String],
      default: ['IN_APP']
    },
    attachments: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        mimeType: { type: String, required: true }
      }
    ],
    scheduledAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null, index: true },
    cancelledAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    deliverySummary: {
      recipientCount: { type: Number, default: 0 },
      queuedCount: { type: Number, default: 0 },
      deliveredCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
      readCount: { type: Number, default: 0 }
    },
    revision: { type: Number, default: 0 }
    ,idempotencyKey: { type: String, maxlength: 200 }
  },
  { timestamps: true }
);

CommunicationAnnouncementSchema.index({ tenantId: 1, status: 1, publishedAt: -1 });
CommunicationAnnouncementSchema.index({ tenantId: 1, branchId: 1, status: 1 });
CommunicationAnnouncementSchema.index({ tenantId: 1, 'audienceSnapshot.recipientUserIds': 1, status: 1 });
CommunicationAnnouncementSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 });
CommunicationAnnouncementSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });

CommunicationAnnouncementSchema.plugin(tenantIsolationPlugin);

export const CommunicationAnnouncementModel = model<ICommunicationAnnouncementDocument>(
  'CommunicationAnnouncement',
  CommunicationAnnouncementSchema
);
