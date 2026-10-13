import { Schema, Document, model, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface INavigationItemDoc {
  label: string;
  url: string;
  enabled: boolean;
  order: number;
}

export interface IFooterLinkDoc {
  label: string;
  url: string;
}

export interface IOrganizationWebsiteDocument extends Document {
  tenantId: Types.ObjectId;
  status: 'DRAFT' | 'PUBLISHED';

  branding: {
    organizationName: string;
    tagline?: string;
    logoMediaId?: Types.ObjectId;
    faviconMediaId?: Types.ObjectId;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    headingFont?: string;
    bodyFont?: string;
    borderRadius?: 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE';
  };

  homepage: {
    hero: {
      enabled: boolean;
      eyebrow?: string;
      title: string;
      subtitle?: string;
      primaryButton?: {
        label?: string;
        url?: string;
      };
      secondaryButton?: {
        label?: string;
        url?: string;
      };
      backgroundImageMediaId?: Types.ObjectId;
    };
    about: {
      enabled: boolean;
      title?: string;
      description?: string;
      imageMediaId?: Types.ObjectId;
    };
    featuredCourses: {
      enabled: boolean;
      title?: string;
      subtitle?: string;
      courseIds: Types.ObjectId[];
      limit: number;
    };
    cta: {
      enabled: boolean;
      title?: string;
      description?: string;
      buttonLabel?: string;
      buttonUrl?: string;
    };
    showCategories?: boolean;
    showTestimonials?: boolean;
  };

  navigation: {
    items: INavigationItemDoc[];
  };

  footer: {
    description?: string;
    copyrightText?: string;
    links: IFooterLinkDoc[];
    socialLinks: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
      twitter?: string;
    };
  };

  seo: {
    title?: string;
    description?: string;
    keywords: string[];
    ogImageMediaId?: Types.ObjectId;
  };

  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };

  whiteLabel?: {
    hidePlatformBranding: boolean;
    useCustomLogo: boolean;
    useCustomFavicon: boolean;
    useCustomColors: boolean;
    customSupportEmail?: string;
    publicPoweredByEnabled: boolean;
  };

  publishedConfig?: Schema.Types.Mixed;
  publishedAt?: Date;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const NavigationItemSchema = new Schema<INavigationItemDoc>(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true, default: 0 }
  },
  { _id: false }
);

const FooterLinkSchema = new Schema<IFooterLinkDoc>(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    url: { type: String, required: true, trim: true, maxlength: 500 }
  },
  { _id: false }
);

const OrganizationWebsiteSchema = new Schema<IOrganizationWebsiteDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
      required: true,
      index: true
    },
    branding: {
      organizationName: { type: String, default: 'DIDM Academy', trim: true, maxlength: 100 },
      logoMediaId: { type: Schema.Types.ObjectId, ref: 'Media' },
      faviconMediaId: { type: Schema.Types.ObjectId, ref: 'Media' },
      primaryColor: { type: String, default: '#BE1E2E', trim: true },
      secondaryColor: { type: String, default: '#1F2937', trim: true },
      accentColor: { type: String, default: '#F59E0B', trim: true },
      backgroundColor: { type: String, default: '#FFFFFF', trim: true },
      textColor: { type: String, default: '#111827', trim: true },
      fontFamily: { type: String, default: 'Inter', trim: true },
      headingFont: { type: String, default: 'Inter', trim: true },
      bodyFont: { type: String, default: 'Inter', trim: true },
      borderRadius: {
        type: String,
        enum: ['NONE', 'SMALL', 'MEDIUM', 'LARGE'],
        default: 'MEDIUM'
      }
    },
    homepage: {
      hero: {
        enabled: { type: Boolean, default: true },
        eyebrow: { type: String, trim: true, maxlength: 100 },
        title: { type: String, default: 'Transform Your Future with Masterclasses', trim: true, maxlength: 200 },
        subtitle: { type: String, trim: true, maxlength: 500 },
        primaryButton: {
          label: { type: String, default: 'Explore Courses', trim: true, maxlength: 50 },
          url: { type: String, default: '/courses', trim: true, maxlength: 200 }
        },
        secondaryButton: {
          label: { type: String, default: 'Contact Us', trim: true, maxlength: 50 },
          url: { type: String, default: '/contact', trim: true, maxlength: 200 }
        },
        backgroundImageMediaId: { type: Schema.Types.ObjectId, ref: 'Media' }
      },
      about: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'About Our Academy', trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 2000 },
        imageMediaId: { type: Schema.Types.ObjectId, ref: 'Media' }
      },
      featuredCourses: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Featured Courses', trim: true, maxlength: 200 },
        subtitle: { type: String, default: 'Hand-picked courses from top instructors', trim: true, maxlength: 500 },
        courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        limit: { type: Number, default: 6, min: 1, max: 24 }
      },
      cta: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Ready to Start Learning?', trim: true, maxlength: 200 },
        description: { type: String, default: 'Join thousands of students building their skills.', trim: true, maxlength: 500 },
        buttonLabel: { type: String, default: 'Browse Catalog', trim: true, maxlength: 50 },
        buttonUrl: { type: String, default: '/courses', trim: true, maxlength: 200 }
      },
      showCategories: { type: Boolean, default: true },
      showTestimonials: { type: Boolean, default: true }
    },
    navigation: {
      items: { type: [NavigationItemSchema], default: [] }
    },
    footer: {
      description: { type: String, trim: true, maxlength: 500 },
      copyrightText: { type: String, trim: true, maxlength: 200 },
      links: { type: [FooterLinkSchema], default: [] },
      socialLinks: {
        facebook: { type: String, trim: true },
        instagram: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        youtube: { type: String, trim: true },
        twitter: { type: String, trim: true }
      }
    },
    seo: {
      title: { type: String, trim: true, maxlength: 100 },
      description: { type: String, trim: true, maxlength: 300 },
      keywords: [{ type: String, trim: true }],
      ogImageMediaId: { type: Schema.Types.ObjectId, ref: 'Media' }
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true }
    },
    whiteLabel: {
      hidePlatformBranding: { type: Boolean, default: false },
      useCustomLogo: { type: Boolean, default: true },
      useCustomFavicon: { type: Boolean, default: true },
      useCustomColors: { type: Boolean, default: true },
      customSupportEmail: { type: String, trim: true, default: '' },
      publicPoweredByEnabled: { type: Boolean, default: true }
    },
    publishedConfig: { type: Schema.Types.Mixed },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

OrganizationWebsiteSchema.plugin(tenantIsolationPlugin);

export const OrganizationWebsiteModel = model<IOrganizationWebsiteDocument>(
  'OrganizationWebsite',
  OrganizationWebsiteSchema
);
