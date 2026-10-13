import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type StorageProviderType = 'LOCAL' | 'CLOUDFLARE_R2' | 'AWS_S3' | 'AMAZON_S3' | 'CLOUDINARY';
export type StorageConnectionStatusType = 'NOT_CONFIGURED' | 'TESTING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED' | 'DISABLED';

export interface ICloudflareR2StorageConfigDoc {
  accountId?: string;
  endpoint?: string;
  bucket?: string;
  accessKeyIdEncrypted?: string;
  secretAccessKeyEncrypted?: string;
  publicBaseUrl?: string;
}

export interface IAmazonS3StorageConfigDoc {
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyIdEncrypted?: string;
  secretAccessKeyEncrypted?: string;
  publicBaseUrl?: string;
}

export interface ICloudinaryStorageConfigDoc {
  cloudName?: string;
  apiKey?: string;
  apiSecretEncrypted?: string;
  folderPrefix?: string;
}

export interface IOrganizationStorageDocument extends Document {
  tenantId: Types.ObjectId;
  provider: StorageProviderType;
  status: StorageConnectionStatusType;
  r2?: ICloudflareR2StorageConfigDoc;
  s3?: IAmazonS3StorageConfigDoc;
  cloudinary?: ICloudinaryStorageConfigDoc;
  encryptedCredentials?: Record<string, any>;
  settings?: {
    bucketName?: string;
    region?: string;
    endpoint?: string;
    publicBaseUrl?: string;
    folderPrefix?: string;
  };
  isEnabled: boolean;
  lastTestedAt?: Date;
  lastConnectedAt?: Date;
  lastError?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationStorageSchema = new Schema<IOrganizationStorageDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    provider: {
      type: String,
      enum: ['LOCAL', 'CLOUDFLARE_R2', 'AWS_S3', 'AMAZON_S3', 'CLOUDINARY'],
      required: true,
      default: 'CLOUDFLARE_R2'
    },
    status: {
      type: String,
      enum: ['NOT_CONFIGURED', 'TESTING', 'CONNECTED', 'ERROR', 'DISCONNECTED', 'DISABLED'],
      default: 'NOT_CONFIGURED'
    },
    r2: {
      accountId: { type: String, trim: true, default: '' },
      endpoint: { type: String, trim: true, default: '' },
      bucket: { type: String, trim: true, default: '' },
      accessKeyIdEncrypted: { type: String, default: '' },
      secretAccessKeyEncrypted: { type: String, default: '' },
      publicBaseUrl: { type: String, trim: true, default: '' }
    },
    s3: {
      bucket: { type: String, trim: true, default: '' },
      region: { type: String, trim: true, default: 'us-east-1' },
      endpoint: { type: String, trim: true, default: '' },
      accessKeyIdEncrypted: { type: String, default: '' },
      secretAccessKeyEncrypted: { type: String, default: '' },
      publicBaseUrl: { type: String, trim: true, default: '' }
    },
    cloudinary: {
      cloudName: { type: String, trim: true, default: '' },
      apiKey: { type: String, trim: true, default: '' },
      apiSecretEncrypted: { type: String, default: '' },
      folderPrefix: { type: String, trim: true, default: '' }
    },
    encryptedCredentials: { type: Schema.Types.Mixed },
    settings: {
      bucketName: { type: String, trim: true },
      region: { type: String, trim: true },
      endpoint: { type: String, trim: true },
      publicBaseUrl: { type: String, trim: true },
      folderPrefix: { type: String, trim: true }
    },
    isEnabled: { type: Boolean, default: true },
    lastTestedAt: { type: Date },
    lastConnectedAt: { type: Date },
    lastError: { type: String, default: '' },
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

OrganizationStorageSchema.plugin(tenantIsolationPlugin);

export const OrganizationStorageModel = model<IOrganizationStorageDocument>(
  'OrganizationStorage',
  OrganizationStorageSchema
);
