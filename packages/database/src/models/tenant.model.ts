import { Schema, model, Document } from 'mongoose';

export interface ITenantDocument extends Document {
  name: string;
  slug: string;
  customDomain?: string;
  isCustomDomainVerified: boolean;
  planId: string;
  branding?: {
    companyName?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    showPlatformBranding?: boolean;
  };
  whiteLabel?: {
    enabled: boolean;
  };
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  organizationStatus?: 'SETUP' | 'READY' | 'LIVE' | 'SUSPENDED';
  launchedAt?: Date | null;
  launchedBy?: Schema.Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenantDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    customDomain: { type: String, unique: true, sparse: true, lowercase: true, index: true },
    isCustomDomainVerified: { type: Boolean, default: false },
    planId: { type: String, default: 'STARTER' },
    branding: {
      companyName: String,
      logoUrl: String,
      faviconUrl: String,
      primaryColor: { type: String, default: '#BE1E2E' },
      secondaryColor: { type: String, default: '#FFFFFF' },
      showPlatformBranding: { type: Boolean, default: true }
    },
    whiteLabel: {
      enabled: { type: Boolean, default: false }
    },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
    organizationStatus: {
      type: String,
      enum: ['SETUP', 'READY', 'LIVE', 'SUSPENDED'],
      default: 'SETUP'
    },
    launchedAt: { type: Date, default: null },
    launchedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

export const TenantModel = model<ITenantDocument>('Tenant', TenantSchema);
