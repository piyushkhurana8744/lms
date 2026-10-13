import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ICommunicationReadStateDocument extends Document {
  tenantId: Types.ObjectId;
  recipientUserId: Types.ObjectId;
  itemType: 'ANNOUNCEMENT' | 'CONVERSATION';
  itemId: Types.ObjectId;
  readAt: Date;
  lastReadMessageSequence?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationReadStateSchema = new Schema<ICommunicationReadStateDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: {
      type: String,
      enum: ['ANNOUNCEMENT', 'CONVERSATION'],
      required: true
    },
    itemId: { type: Schema.Types.ObjectId, required: true, index: true },
    readAt: { type: Date, default: Date.now },
    lastReadMessageSequence: { type: Number, default: 0 }
  },
  { timestamps: true }
);

CommunicationReadStateSchema.index(
  { tenantId: 1, recipientUserId: 1, itemType: 1, itemId: 1 },
  { unique: true }
);

CommunicationReadStateSchema.plugin(tenantIsolationPlugin);

export const CommunicationReadStateModel = model<ICommunicationReadStateDocument>(
  'CommunicationReadState',
  CommunicationReadStateSchema
);
