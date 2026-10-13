import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type DomainStatus = 'NOT_CONFIGURED' | 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
export type VerificationMethod = 'CNAME' | 'TXT';

export interface IOrganizationDomainDocument extends Document {
  tenantId: Types.ObjectId;
  platformSubdomain: string;
  customDomain?: string;
  status: DomainStatus;
  verificationToken: string;
  verificationMethod: VerificationMethod;
  verifiedAt?: Date | null;
  lastCheckedAt?: Date | null;
  lastError?: string | null;
  isPrimary: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationDomainSchema = new Schema<IOrganizationDomainDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    platformSubdomain: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    customDomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['NOT_CONFIGURED', 'PENDING', 'VERIFIED', 'ACTIVE', 'ERROR', 'DISCONNECTED'],
      required: true,
      default: 'NOT_CONFIGURED'
    },
    verificationToken: { type: String, required: true },
    verificationMethod: { type: String, enum: ['CNAME', 'TXT'], default: 'CNAME' },
    verifiedAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    isPrimary: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

OrganizationDomainSchema.plugin(tenantIsolationPlugin);

export const OrganizationDomainModel = model<IOrganizationDomainDocument>(
  'OrganizationDomain',
  OrganizationDomainSchema
);
