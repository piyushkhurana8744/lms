import { Document, Schema, Types, model } from 'mongoose';
import { IntegrationProvider, IntegrationScopeType } from '@edtech/types';

export interface IIntegrationOAuthStateDocument extends Document {
  nonceHash: string;
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  provider: IntegrationProvider;
  scopeType: IntegrationScopeType;
  branchId?: Types.ObjectId | null;
  redirectUrl?: string;
  encryptedCodeVerifier?: string;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
}

const IntegrationOAuthStateSchema = new Schema<IIntegrationOAuthStateDocument>(
  {
    nonceHash: { type: String, required: true, unique: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: {
      type: String,
      enum: ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true
    },
    scopeType: { type: String, enum: ['TENANT', 'BRANCH', 'USER'], required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    redirectUrl: { type: String },
    encryptedCodeVerifier: { type: String },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'integration_oauth_states' }
);

IntegrationOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
IntegrationOAuthStateSchema.index({ tenantId: 1, userId: 1, provider: 1, createdAt: -1 });

export const IntegrationOAuthStateModel = model<IIntegrationOAuthStateDocument>(
  'IntegrationOAuthState',
  IntegrationOAuthStateSchema
);
