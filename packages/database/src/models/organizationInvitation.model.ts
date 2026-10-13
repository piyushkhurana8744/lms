import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IOrganizationInvitationDocument extends Document {
  tenantId: Types.ObjectId;
  email: string;
  role: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  tokenHash: string;
  expiresAt: Date;
  invitedBy: Types.ObjectId;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationInvitationSchema = new Schema<IOrganizationInvitationDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: {
      type: String,
      enum: ['TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      required: true
    },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
      required: true,
      default: 'PENDING'
    }
  },
  { timestamps: true }
);

// Compound Unique Index: Token hash must be unique per tenant
OrganizationInvitationSchema.index({ tenantId: 1, tokenHash: 1 }, { unique: true });

// Query optimization indexes
OrganizationInvitationSchema.index({ tenantId: 1, email: 1 });
OrganizationInvitationSchema.index({ tenantId: 1, status: 1 });

OrganizationInvitationSchema.plugin(tenantIsolationPlugin);

export const OrganizationInvitationModel = model<IOrganizationInvitationDocument>(
  'OrganizationInvitation',
  OrganizationInvitationSchema
);
