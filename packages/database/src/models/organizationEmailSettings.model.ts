import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type EmailProviderType = 'RESEND' | 'BREVO' | 'SMTP';
export type EmailConfigStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'VERIFIED' | 'ERROR';

export interface IResendConfig {
  apiKeyEncrypted?: string;
}

export interface IBrevoConfig {
  apiKeyEncrypted?: string;
}

export interface ISmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  usernameEncrypted?: string;
  passwordEncrypted?: string;
}

export interface IOrganizationEmailSettingsDocument extends Document {
  tenantId: Types.ObjectId;
  provider: EmailProviderType;
  status: EmailConfigStatus;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  resend?: IResendConfig;
  brevo?: IBrevoConfig;
  smtp?: ISmtpConfig;
  lastVerifiedAt?: Date | null;
  lastError?: string | null;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationEmailSettingsSchema = new Schema<IOrganizationEmailSettingsDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    provider: {
      type: String,
      enum: ['RESEND', 'BREVO', 'SMTP'],
      required: true,
      default: 'RESEND'
    },
    status: {
      type: String,
      enum: ['NOT_CONFIGURED', 'CONFIGURED', 'VERIFIED', 'ERROR'],
      required: true,
      default: 'NOT_CONFIGURED'
    },
    fromName: { type: String, required: true, trim: true, default: 'DIDM LMS' },
    fromEmail: { type: String, required: true, trim: true, lowercase: true },
    replyTo: { type: String, trim: true, lowercase: true, default: '' },
    resend: {
      apiKeyEncrypted: { type: String, default: '' }
    },
    brevo: {
      apiKeyEncrypted: { type: String, default: '' }
    },
    smtp: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      usernameEncrypted: { type: String, default: '' },
      passwordEncrypted: { type: String, default: '' }
    },
    lastVerifiedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

OrganizationEmailSettingsSchema.plugin(tenantIsolationPlugin);

export const OrganizationEmailSettingsModel = model<IOrganizationEmailSettingsDocument>(
  'OrganizationEmailSettings',
  OrganizationEmailSettingsSchema
);
