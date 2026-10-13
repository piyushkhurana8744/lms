import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type FollowUpType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'DEMO' | 'COUNSELLING' | 'GENERAL';
export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type FollowUpOutcome =
  | 'CONNECTED'
  | 'NO_ANSWER'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALLBACK_REQUESTED'
  | 'DEMO_BOOKED'
  | 'FEES_DISCUSSION'
  | 'CONVERTED'
  | 'OTHER';

export interface ILeadFollowUpDocument extends Document {
  tenantId: Types.ObjectId;
  leadId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  type: FollowUpType;
  dueAt: Date;
  note?: string;
  status: FollowUpStatus;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  outcome?: FollowUpOutcome;
  outcomeNote?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  idempotencyKey?: string;
  updatedAt: Date;
}

const LeadFollowUpSchema = new Schema<ILeadFollowUpDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['CALL', 'WHATSAPP', 'EMAIL', 'DEMO', 'COUNSELLING', 'GENERAL'],
      default: 'CALL'
    },
    dueAt: { type: Date, required: true, index: true },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    outcome: {
      type: String,
      enum: [
        'CONNECTED',
        'NO_ANSWER',
        'INTERESTED',
        'NOT_INTERESTED',
        'CALLBACK_REQUESTED',
        'DEMO_BOOKED',
        'FEES_DISCUSSION',
        'CONVERTED',
        'OTHER'
      ],
      default: null
    },
    outcomeNote: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
    ,idempotencyKey: { type: String, maxlength: 160 }
  },
  { timestamps: true }
);

LeadFollowUpSchema.index({ tenantId: 1, assignedTo: 1, status: 1, dueAt: 1 });
LeadFollowUpSchema.index({ tenantId: 1, leadId: 1, status: 1 });
LeadFollowUpSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });

LeadFollowUpSchema.plugin(tenantIsolationPlugin);

export const LeadFollowUpModel = model<ILeadFollowUpDocument>('LeadFollowUp', LeadFollowUpSchema);
