import { Document, Schema, Types, model } from 'mongoose';
import { IntegrationProvider } from '@edtech/types';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ILiveMeetingAssociationHistoryDocument extends Document {
  tenantId: Types.ObjectId; classId: Types.ObjectId; provider: IntegrationProvider;
  connectionId: Types.ObjectId; externalMeetingId: string; joinUrl: string;
  status: 'ACTIVE' | 'RETIRED' | 'FAILED'; actorId: Types.ObjectId;
  activatedAt: Date; retiredAt?: Date | null; retirementReason?: string;
}
const schema = new Schema<ILiveMeetingAssociationHistoryDocument>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  classId: { type: Schema.Types.ObjectId, required: true, index: true },
  provider: { type: String, enum: ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'], required: true },
  connectionId: { type: Schema.Types.ObjectId, required: true }, externalMeetingId: { type: String, required: true },
  joinUrl: { type: String, required: true }, status: { type: String, enum: ['ACTIVE', 'RETIRED', 'FAILED'], required: true },
  actorId: { type: Schema.Types.ObjectId, required: true }, activatedAt: { type: Date, default: Date.now },
  retiredAt: { type: Date, default: null }, retirementReason: { type: String }
}, { timestamps: true, collection: 'live_meeting_association_history' });
schema.index({ tenantId: 1, classId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' } });
schema.index({ tenantId: 1, classId: 1, provider: 1, externalMeetingId: 1 }, { unique: true });
schema.plugin(tenantIsolationPlugin);
export const LiveMeetingAssociationHistoryModel = model<ILiveMeetingAssociationHistoryDocument>('LiveMeetingAssociationHistory', schema);
