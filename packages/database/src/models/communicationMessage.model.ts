import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import { ICommunicationAttachment } from '@edtech/types';

export interface ICommunicationMessageDocument extends Document {
  tenantId: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderUserId: Types.ObjectId;
  senderName?: string;
  senderAvatarUrl?: string;
  body: string;
  attachments: ICommunicationAttachment[];
  idempotencyKey?: string | null;
  sequenceNumber: number;
  sentAt: Date;
  editedAt?: Date | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedByUserId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationMessageSchema = new Schema<ICommunicationMessageDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'CommunicationConversation',
      required: true,
      index: true
    },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, maxlength: 120 },
    senderAvatarUrl: { type: String },
    body: { type: String, required: true, maxlength: 4000 },
    attachments: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        mimeType: { type: String, required: true }
      }
    ],
    idempotencyKey: { type: String },
    sequenceNumber: { type: Number, required: true },
    sentAt: { type: Date, default: Date.now, index: true },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

CommunicationMessageSchema.index({ tenantId: 1, conversationId: 1, sequenceNumber: 1 });
CommunicationMessageSchema.index({ tenantId: 1, conversationId: 1, sentAt: 1 });
CommunicationMessageSchema.index(
  { tenantId: 1, conversationId: 1, senderUserId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

CommunicationMessageSchema.plugin(tenantIsolationPlugin);

export const CommunicationMessageModel = model<ICommunicationMessageDocument>(
  'CommunicationMessage',
  CommunicationMessageSchema
);
