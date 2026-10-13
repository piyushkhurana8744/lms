import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IUserDocument extends Document {
  tenantId: Types.ObjectId | null;
  allowedTenantIds: Types.ObjectId[];
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  emailVerified: boolean;
  isSuperAdmin: boolean;
  roles: Types.ObjectId[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    allowedTenantIds: [{ type: Schema.Types.ObjectId, ref: 'Tenant' }],
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, required: true },
    avatarUrl: String,
    status: { type: String, enum: ['ACTIVE', 'INVITED', 'SUSPENDED'], default: 'ACTIVE' },
    emailVerified: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false, index: true },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    lastLoginAt: Date
  },
  { timestamps: true }
);

// Compound Index: Enforces tenant-scoped email uniqueness for standard tenant users
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true, partialFilterExpression: { tenantId: { $ne: null } } });

// Index for Platform Super Admin lookups
UserSchema.index({ isSuperAdmin: 1, email: 1 });

UserSchema.plugin(tenantIsolationPlugin);

export const UserModel = model<IUserDocument>('User', UserSchema);
