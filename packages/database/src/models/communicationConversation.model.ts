import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import { ConversationType, ICommunicationParticipant } from '@edtech/types';

export interface ICommunicationConversationDocument extends Document {
  tenantId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  type: ConversationType;
  fingerprint?: string | null;
  title?: string;
  participants: Array<{
    userId: Types.ObjectId;
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    joinedAt: Date;
    leftAt?: Date | null;
    status: 'ACTIVE' | 'INACTIVE';
    lastReadAt?: Date | null;
  }>;
  participantUserIds: Types.ObjectId[];
  courseId?: Types.ObjectId | null;
  batchId?: Types.ObjectId | null;
  lastMessageAt?: Date | null;
  lastMessagePreview?: string;
  lastMessageSenderId?: Types.ObjectId | null;
  messageCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSubSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },
    email: { type: String },
    avatarUrl: { type: String },
    role: { type: String },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    lastReadAt: { type: Date, default: null }
  },
  { _id: false }
);

const CommunicationConversationSchema = new Schema<ICommunicationConversationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    type: {
      type: String,
      enum: ['DIRECT', 'STUDENT_INSTRUCTOR', 'STUDENT_SUPPORT', 'STAFF'],
      required: true
    },
    fingerprint: { type: String, default: null },
    title: { type: String, maxlength: 200 },
    participants: [ParticipantSubSchema],
    participantUserIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessagePreview: { type: String, maxlength: 300 },
    lastMessageSenderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    messageCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'CLOSED'],
      default: 'ACTIVE',
      required: true
    }
  },
  { timestamps: true }
);

CommunicationConversationSchema.index({ tenantId: 1, participantUserIds: 1, lastMessageAt: -1 });
CommunicationConversationSchema.index({ tenantId: 1, fingerprint: 1 }, { unique: true, sparse: true });
CommunicationConversationSchema.index({ tenantId: 1, type: 1, courseId: 1 });

CommunicationConversationSchema.plugin(tenantIsolationPlugin);

export const CommunicationConversationModel = model<ICommunicationConversationDocument>(
  'CommunicationConversation',
  CommunicationConversationSchema
);
