import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type CRMResourceType = 'BRANCH' | 'COURSE' | 'EMPLOYEE' | 'BATCH' | 'ADMISSION';

export interface ICRMExternalLinkDocument extends Document {
  tenantId: Types.ObjectId;
  orgNumber: string;
  resourceType: CRMResourceType;
  externalId: string;
  canonicalId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CRMExternalLinkSchema = new Schema<ICRMExternalLinkDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  orgNumber: { type: String, required: true, trim: true, index: true },
  resourceType: { type: String, enum: ['BRANCH', 'COURSE', 'EMPLOYEE', 'BATCH', 'ADMISSION'], required: true, index: true },
  externalId: { type: String, required: true, trim: true },
  canonicalId: { type: String, required: true, trim: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'crm_external_links' });

CRMExternalLinkSchema.index({ tenantId: 1, orgNumber: 1, resourceType: 1, externalId: 1 }, { unique: true });
CRMExternalLinkSchema.index({ tenantId: 1, resourceType: 1, canonicalId: 1 });
CRMExternalLinkSchema.plugin(tenantIsolationPlugin);

export const CRMExternalLinkModel = model<ICRMExternalLinkDocument>('CRMExternalLink', CRMExternalLinkSchema);
