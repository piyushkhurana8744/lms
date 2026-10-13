import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type LeadSource =
  | 'WEBSITE'
  | 'WALK_IN'
  | 'PHONE'
  | 'WHATSAPP'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'GOOGLE_ADS'
  | 'REFERRAL'
  | 'IMPORT'
  | 'MANUAL'
  | 'OTHER';

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'DEMO_SCHEDULED'
  | 'FOLLOW_UP'
  | 'APPLICATION_STARTED'
  | 'ADMISSION_IN_PROGRESS'
  | 'CONVERTED'
  | 'LOST';

export type LostReason =
  | 'NOT_INTERESTED'
  | 'FEES'
  | 'NO_RESPONSE'
  | 'JOINED_COMPETITOR'
  | 'LOCATION'
  | 'TIMING'
  | 'COURSE_NOT_AVAILABLE'
  | 'INVALID_LEAD'
  | 'DUPLICATE'
  | 'OTHER';

export interface ILeadDocument extends Document {
  tenantId: Types.ObjectId;
  leadCode?: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email?: string;
  normalizedEmail?: string;
  phone: string;
  normalizedPhone: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  source: LeadSource;
  sourceDetail?: string;
  campaign?: string;
  medium?: string;
  referralName?: string;
  courseInterestId?: Types.ObjectId;
  batchInterestId?: Types.ObjectId;
  preferredMode?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  branchId?: Types.ObjectId;
  legacyBranch?: string;
  stage: LeadStage;
  assignedTo?: Types.ObjectId;
  assignedAt?: Date;
  assignedBy?: Types.ObjectId;
  lostAt?: Date;
  lostReason?: LostReason;
  lostReasonDetail?: string;
  admissionId?: Types.ObjectId;
  studentUserId?: Types.ObjectId;
  convertedAt?: Date;
  lastInquiryAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    leadCode: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    normalizedEmail: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    normalizedPhone: { type: String, required: true, trim: true, index: true },
    alternatePhone: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    source: {
      type: String,
      enum: [
        'WEBSITE',
        'WALK_IN',
        'PHONE',
        'WHATSAPP',
        'FACEBOOK',
        'INSTAGRAM',
        'GOOGLE_ADS',
        'REFERRAL',
        'IMPORT',
        'MANUAL',
        'OTHER'
      ],
      default: 'MANUAL',
      index: true
    },
    sourceDetail: { type: String, trim: true },
    campaign: { type: String, trim: true },
    medium: { type: String, trim: true },
    referralName: { type: String, trim: true },
    courseInterestId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    batchInterestId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null },
    preferredMode: { type: String, enum: ['ONLINE', 'OFFLINE', 'HYBRID'], default: 'ONLINE' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    legacyBranch: { type: String, trim: true },
    stage: {
      type: String,
      enum: [
        'NEW',
        'CONTACTED',
        'QUALIFIED',
        'DEMO_SCHEDULED',
        'FOLLOW_UP',
        'APPLICATION_STARTED',
        'ADMISSION_IN_PROGRESS',
        'CONVERTED',
        'LOST'
      ],
      default: 'NEW',
      index: true
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedAt: { type: Date, default: null },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lostAt: { type: Date, default: null },
    lostReason: {
      type: String,
      enum: [
        'NOT_INTERESTED',
        'FEES',
        'NO_RESPONSE',
        'JOINED_COMPETITOR',
        'LOCATION',
        'TIMING',
        'COURSE_NOT_AVAILABLE',
        'INVALID_LEAD',
        'DUPLICATE',
        'OTHER'
      ]
    },
    lostReasonDetail: { type: String, trim: true },
    admissionId: { type: Schema.Types.ObjectId, ref: 'Admission', default: null },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    convertedAt: { type: Date, default: null },
    lastInquiryAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

// Compound Indexes for fast tenant filtering and concurrency-safe active deduplication
// Partial unique index ensures no two active leads in the same tenant can share a normalized phone number at DB level
LeadSchema.index(
  { tenantId: 1, normalizedPhone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stage: {
        $in: [
          'NEW',
          'CONTACTED',
          'QUALIFIED',
          'DEMO_SCHEDULED',
          'FOLLOW_UP',
          'APPLICATION_STARTED',
          'ADMISSION_IN_PROGRESS'
        ]
      }
    }
  }
);
LeadSchema.index({ tenantId: 1, stage: 1, createdAt: -1 });
LeadSchema.index({ tenantId: 1, assignedTo: 1, stage: 1 });
LeadSchema.index({ tenantId: 1, courseInterestId: 1 });

LeadSchema.plugin(tenantIsolationPlugin);

export const LeadModel = model<ILeadDocument>('Lead', LeadSchema);
