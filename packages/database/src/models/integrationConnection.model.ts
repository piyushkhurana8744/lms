import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';
import { IntegrationProvider, IntegrationConnectionStatus, IntegrationScopeType } from '@edtech/types';

export interface IIntegrationConnectionDocument extends Document {
  tenantId: Types.ObjectId;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  scopeType: IntegrationScopeType;
  branchId?: Types.ObjectId | null;
  userId?: Types.ObjectId | null;
  encryptedCredentials?: string;
  externalAccountId?: string;
  externalTenantId?: string;
  scopes: string[];
  connectedBy?: Types.ObjectId | null;
  connectedAt?: Date;
  lastRefreshAt?: Date;
  expiresAt?: Date;
  lastHealthCheckAt?: Date;
  lastErrorCategory?: string;
  lastErrorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConnectionSchema = new Schema<IIntegrationConnectionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    provider: {
      type: String,
      enum: ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['CONNECTED', 'RECONNECT_REQUIRED', 'REAUTH_REQUIRED', 'MISSING_SCOPE', 'EXPIRED', 'DISCONNECTED', 'DEMO', 'ERROR', 'DISABLED'],
      default: 'CONNECTED',
      required: true,
      index: true
    },
    scopeType: {
      type: String,
      enum: ['TENANT', 'BRANCH', 'USER'],
      default: 'TENANT',
      required: true
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    encryptedCredentials: { type: String, default: '' },
    externalAccountId: { type: String, trim: true },
    externalTenantId: { type: String, trim: true },
    scopes: { type: [String], default: [] },
    connectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    connectedAt: { type: Date, default: Date.now },
    lastRefreshAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    lastHealthCheckAt: { type: Date, default: null },
    lastErrorCategory: { type: String, default: null },
    lastErrorMessage: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    collection: 'integration_connections'
  }
);

IntegrationConnectionSchema.index(
  { tenantId: 1, provider: 1, scopeType: 1, userId: 1, branchId: 1 },
  { unique: true }
);
IntegrationConnectionSchema.index({ tenantId: 1, status: 1 });
IntegrationConnectionSchema.index({ tenantId: 1, provider: 1, status: 1 });

IntegrationConnectionSchema.plugin(tenantIsolationPlugin);

export const IntegrationConnectionModel = model<IIntegrationConnectionDocument>(
  'IntegrationConnection',
  IntegrationConnectionSchema
);
