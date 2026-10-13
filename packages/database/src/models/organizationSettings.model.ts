import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IOrganizationProfile {
  organizationName: string;
  supportEmail: string;
  supportPhone?: string;
  address?: string;
  timezone: string;
  defaultLanguage: string;
  currency: string;
}

export interface ILmsPreferences {
  allowStudentSelfRegistration: boolean;
  requireEmailVerification: boolean;
  allowInstructorRegistration: boolean;
  maintenanceMode: boolean;
}

export interface INotificationPreferences {
  welcomeEmail: boolean;
  studentRegistration: boolean;
  instructorInvitation: boolean;
  passwordReset: boolean;
  courseEnrollment: boolean;
  courseCompletion: boolean;
  certificateIssued: boolean;
  adminAlerts: boolean;
}

export interface IOrganizationOnboarding {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SKIPPED' | 'COMPLETED';
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastVisitedAt?: Date | null;
}

export interface IOrganizationSettingsDocument extends Document {
  tenantId: Types.ObjectId;
  profile: IOrganizationProfile;
  lmsPreferences: ILmsPreferences;
  notifications?: INotificationPreferences;
  onboarding?: IOrganizationOnboarding;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSettingsSchema = new Schema<IOrganizationSettingsDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    profile: {
      organizationName: { type: String, required: true, trim: true, default: 'DIDM LMS Organization' },
      supportEmail: { type: String, default: '' },
      supportPhone: { type: String, default: '' },
      address: { type: String, default: '' },
      timezone: { type: String, default: 'UTC' },
      defaultLanguage: { type: String, default: 'English' },
      currency: { type: String, default: 'USD' }
    },
    lmsPreferences: {
      allowStudentSelfRegistration: { type: Boolean, default: false },
      requireEmailVerification: { type: Boolean, default: true },
      allowInstructorRegistration: { type: Boolean, default: false },
      maintenanceMode: { type: Boolean, default: false }
    },
    notifications: {
      welcomeEmail: { type: Boolean, default: true },
      studentRegistration: { type: Boolean, default: true },
      instructorInvitation: { type: Boolean, default: true },
      passwordReset: { type: Boolean, default: true },
      courseEnrollment: { type: Boolean, default: true },
      courseCompletion: { type: Boolean, default: true },
      certificateIssued: { type: Boolean, default: true },
      adminAlerts: { type: Boolean, default: true }
    },
    onboarding: {
      status: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'SKIPPED', 'COMPLETED'],
        default: 'NOT_STARTED',
        required: true
      },
      currentStep: { type: Number, default: 0 },
      completedSteps: { type: [String], default: [] },
      skippedSteps: { type: [String], default: [] },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      lastVisitedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

OrganizationSettingsSchema.plugin(tenantIsolationPlugin);

export const OrganizationSettingsModel = model<IOrganizationSettingsDocument>(
  'OrganizationSettings',
  OrganizationSettingsSchema
);
