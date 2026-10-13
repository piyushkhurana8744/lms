import { Document, Schema, Types, model } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type BranchStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface IBranchDocument extends Document {
  tenantId: Types.ObjectId;
  code: string;
  name: string;
  slug: string;
  status: BranchStatus;
  timezone: string;
  address?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  contact?: { email?: string; phone?: string };
  isPrimary: boolean;
  revision: number;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranchDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true, lowercase: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE', required: true },
  timezone: { type: String, required: true, default: 'Asia/Kolkata' },
  address: { line1: String, line2: String, city: String, state: String, postalCode: String, country: String },
  contact: { email: { type: String, trim: true, lowercase: true }, phone: { type: String, trim: true } },
  isPrimary: { type: Boolean, default: false },
  revision: { type: Number, default: 0, min: 0 },
  archivedAt: Date
}, { timestamps: true });

BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
BranchSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
BranchSchema.index({ tenantId: 1, isPrimary: 1 }, { unique: true, partialFilterExpression: { isPrimary: true } });
BranchSchema.index({ tenantId: 1, status: 1, name: 1 });
BranchSchema.plugin(tenantIsolationPlugin);

export const BranchModel = model<IBranchDocument>('Branch', BranchSchema);
