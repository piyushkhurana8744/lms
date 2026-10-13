import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IOrganizationMemberDocument extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  role: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  branchAccessMode: 'ALL' | 'SELECTED';
  branchIds: Types.ObjectId[];
  employeeDetails?: {
    employeeId?: string;
    designation?: string;
    department?: string;
    branch?: string;
    employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'VISITING' | 'INTERN';
    dateOfJoining?: Date;
    workMode?: 'ON_SITE' | 'REMOTE' | 'HYBRID';
    personal?: {
      dob?: Date;
      gender?: 'MALE' | 'FEMALE' | 'OTHER';
      bloodGroup?: string;
      alternatePhone?: string;
      emergencyContact?: { name?: string; relation?: string; phone?: string };
      address?: { street?: string; city?: string; state?: string; pincode?: string };
    };
    academic?: {
      highestQualification?: string;
      skills?: string[];
      experienceYears?: number;
      bio?: string;
      linkedinUrl?: string;
    };
    kyc?: {
      aadhaarNumber?: string;
      panNumber?: string;
      resumeUrl?: string;
    };
    bank?: {
      bankName?: string;
      accountHolderName?: string;
      accountNumber?: string;
      ifscCode?: string;
      upiId?: string;
    };
  };
  joinedAt: Date;
  invitedAt?: Date;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMemberSchema = new Schema<IOrganizationMemberDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      required: true,
      default: 'STUDENT'
    },
    status: {
      type: String,
      enum: ['INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED'],
      required: true,
      default: 'INVITED'
    },
    branchAccessMode: { type: String, enum: ['ALL', 'SELECTED'], required: true, default: 'SELECTED' },
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    employeeDetails: {
      employeeId: { type: String, trim: true },
      designation: { type: String, trim: true },
      department: { type: String, trim: true },
      branch: { type: String, trim: true },
      employmentType: {
        type: String,
        enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING', 'INTERN'],
        default: 'FULL_TIME'
      },
      dateOfJoining: { type: Date },
      workMode: {
        type: String,
        enum: ['ON_SITE', 'REMOTE', 'HYBRID'],
        default: 'ON_SITE'
      },
      personal: {
        dob: { type: Date },
        gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
        bloodGroup: { type: String, trim: true },
        alternatePhone: { type: String, trim: true },
        emergencyContact: {
          name: { type: String, trim: true },
          relation: { type: String, trim: true },
          phone: { type: String, trim: true }
        },
        address: {
          street: { type: String, trim: true },
          city: { type: String, trim: true },
          state: { type: String, trim: true },
          pincode: { type: String, trim: true }
        }
      },
      academic: {
        highestQualification: { type: String, trim: true },
        skills: [{ type: String, trim: true }],
        experienceYears: { type: Number, default: 0 },
        bio: { type: String, trim: true },
        linkedinUrl: { type: String, trim: true }
      },
      kyc: {
        aadhaarNumber: { type: String, trim: true },
        panNumber: { type: String, trim: true },
        resumeUrl: { type: String, trim: true }
      },
      bank: {
        bankName: { type: String, trim: true },
        accountHolderName: { type: String, trim: true },
        accountNumber: { type: String, trim: true },
        ifscCode: { type: String, trim: true },
        upiId: { type: String, trim: true }
      }
    },
    joinedAt: { type: Date, default: Date.now },
    invitedAt: Date,
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Compound Unique Index: Single active membership per user per tenant
OrganizationMemberSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

// Query optimization indexes
OrganizationMemberSchema.index({ tenantId: 1, role: 1 });
OrganizationMemberSchema.index({ tenantId: 1, status: 1 });
OrganizationMemberSchema.index({ tenantId: 1, branchAccessMode: 1, branchIds: 1 });
OrganizationMemberSchema.index({ tenantId: 1, 'employeeDetails.employeeId': 1 });

OrganizationMemberSchema.plugin(tenantIsolationPlugin);

export const OrganizationMemberModel = model<IOrganizationMemberDocument>(
  'OrganizationMember',
  OrganizationMemberSchema
);
