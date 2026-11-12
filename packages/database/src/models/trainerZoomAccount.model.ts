import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface ITrainerZoomAccountDocument extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  zoomAccountId: string;
  zoomUserId: string;
  zoomEmail: string;
  accountMembershipStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  licenseType: 'LICENSED' | 'BASIC' | 'ON_PREM';
  isHostEligible: boolean;
  ineligibilityReason?: string | null;
  verifiedAt?: Date | null;
  lastSyncedAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TrainerZoomAccountSchema = new Schema<ITrainerZoomAccountDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    zoomAccountId: { type: String, required: true, trim: true },
    zoomUserId: { type: String, required: true, trim: true, index: true },
    zoomEmail: { type: String, required: true, trim: true, lowercase: true },
    accountMembershipStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'PENDING'],
      default: 'ACTIVE',
      required: true
    },
    licenseType: {
      type: String,
      enum: ['LICENSED', 'BASIC', 'ON_PREM'],
      default: 'LICENSED',
      required: true
    },
    isHostEligible: { type: Boolean, required: true, default: true, index: true },
    ineligibilityReason: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
    lastSyncedAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: 'trainer_zoom_accounts'
  }
);

// Unique compound indexes: one Zoom account mapping per LMS trainer per tenant;
// one Zoom user mapping per tenant to prevent cross-trainer collision.
TrainerZoomAccountSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
TrainerZoomAccountSchema.index({ tenantId: 1, zoomUserId: 1 }, { unique: true });
TrainerZoomAccountSchema.index({ tenantId: 1, isHostEligible: 1 });

TrainerZoomAccountSchema.plugin(tenantIsolationPlugin);

export const TrainerZoomAccountModel = model<ITrainerZoomAccountDocument>(
  'TrainerZoomAccount',
  TrainerZoomAccountSchema
);

