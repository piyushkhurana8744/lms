import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type LeadActivityType =
  | 'LEAD_CREATED'
  | 'NOTE_ADDED'
  | 'CALL'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'FOLLOW_UP_CREATED'
  | 'FOLLOW_UP_COMPLETED'
  | 'STAGE_CHANGED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'DEMO_SCHEDULED'
  | 'APPLICATION_STARTED'
  | 'ADMISSION_CREATED'
  | 'CONVERTED'
  | 'LOST'
  | 'REOPENED';

export interface ILeadActivityDocument extends Document {
  tenantId: Types.ObjectId;
  leadId: Types.ObjectId;
  type: LeadActivityType;
  title: string;
  note?: string;
  metadata?: Record<string, any>;
  actorId?: Types.ObjectId;
  actorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadActivitySchema = new Schema<ILeadActivityDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    type: {
      type: String,
      enum: [
        'LEAD_CREATED',
        'NOTE_ADDED',
        'CALL',
        'EMAIL',
        'WHATSAPP',
        'FOLLOW_UP_CREATED',
        'FOLLOW_UP_COMPLETED',
        'STAGE_CHANGED',
        'ASSIGNED',
        'REASSIGNED',
        'DEMO_SCHEDULED',
        'APPLICATION_STARTED',
        'ADMISSION_CREATED',
        'CONVERTED',
        'LOST',
        'REOPENED'
      ],
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    note: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, trim: true }
  },
  { timestamps: true }
);

LeadActivitySchema.index({ tenantId: 1, leadId: 1, createdAt: -1 });

LeadActivitySchema.plugin(tenantIsolationPlugin);

export const LeadActivityModel = model<ILeadActivityDocument>('LeadActivity', LeadActivitySchema);
