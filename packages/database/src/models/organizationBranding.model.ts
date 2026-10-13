import { Schema, Document, model, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IOrganizationBrandingDocument extends Document {
  tenantId: Types.ObjectId;

  logoMediaId?: Types.ObjectId;
  faviconMediaId?: Types.ObjectId;

  organizationName?: string;

  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;

  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;

  fontFamily?: string;

  loginPage: {
    showLogo: boolean;
    headline?: string;
    description?: string;
    backgroundImageMediaId?: Types.ObjectId;
  };

  browser: {
    title?: string;
    faviconMediaId?: Types.ObjectId;
  };

  social: {
    ogImageMediaId?: Types.ObjectId;
    twitterImageMediaId?: Types.ObjectId;
  };

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const OrganizationBrandingSchema = new Schema<IOrganizationBrandingDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
      index: true
    },
    logoMediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media'
    },
    faviconMediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media'
    },
    organizationName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    primaryColor: {
      type: String,
      default: '#BE1E2E',
      trim: true
    },
    secondaryColor: {
      type: String,
      default: '#1F2937',
      trim: true
    },
    accentColor: {
      type: String,
      default: '#F59E0B',
      trim: true
    },
    backgroundColor: {
      type: String,
      trim: true
    },
    surfaceColor: {
      type: String,
      trim: true
    },
    textColor: {
      type: String,
      trim: true
    },
    fontFamily: {
      type: String,
      default: 'Inter',
      trim: true
    },
    loginPage: {
      showLogo: {
        type: Boolean,
        default: true
      },
      headline: {
        type: String,
        trim: true,
        maxlength: 160
      },
      description: {
        type: String,
        trim: true,
        maxlength: 300
      },
      backgroundImageMediaId: {
        type: Schema.Types.ObjectId,
        ref: 'Media'
      }
    },
    browser: {
      title: {
        type: String,
        trim: true,
        maxlength: 70
      },
      faviconMediaId: {
        type: Schema.Types.ObjectId,
        ref: 'Media'
      }
    },
    social: {
      ogImageMediaId: {
        type: Schema.Types.ObjectId,
        ref: 'Media'
      },
      twitterImageMediaId: {
        type: Schema.Types.ObjectId,
        ref: 'Media'
      }
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

OrganizationBrandingSchema.plugin(tenantIsolationPlugin);

export const OrganizationBrandingModel = model<IOrganizationBrandingDocument>(

  'OrganizationBranding',
  OrganizationBrandingSchema
);
