import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IRoleDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRoleDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: String,
    permissions: [{ type: String }],
    isSystemRole: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound Index: Role slug must be unique per tenant
RoleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

RoleSchema.plugin(tenantIsolationPlugin);

export const RoleModel = model<IRoleDocument>('Role', RoleSchema);
