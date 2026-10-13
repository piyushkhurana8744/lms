import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export interface IHomepageSection {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

export interface IWebsiteConfigDocument extends Document {
  tenantId: Types.ObjectId;
  branding: {
    companyName: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    showPlatformBranding: boolean;
  };
  hero: {
    title: string;
    subtitle: string;
    image?: string;
    buttonText: string;
    buttonLink: string;
  };
  banner: {
    enabled: boolean;
    text: string;
    link?: string;
  };
  homepageSections: IHomepageSection[];
  footer: {
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    copyrightText?: string;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
    };
  };
  seo: {
    title?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HomepageSectionSchema = new Schema<IHomepageSection>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true }
  },
  { _id: false }
);

const WebsiteConfigSchema = new Schema<IWebsiteConfigDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    branding: {
      companyName: { type: String, default: 'DIDM LMS Platform' },
      logoUrl: { type: String, default: '/didmlogo.png' },
      faviconUrl: { type: String, default: '/didmfavicon.png' },
      primaryColor: { type: String, default: '#BE1E2E' },
      secondaryColor: { type: String, default: '#1F2937' },
      accentColor: { type: String, default: '#3B82F6' },
      showPlatformBranding: { type: Boolean, default: true }
    },
    hero: {
      title: { type: String, default: 'Accelerate Your Career with Industry Masterclasses' },
      subtitle: { type: String, default: 'Explore structured curriculum modules, video lessons, and interactive learning resources built for real-world mastery.' },
      image: { type: String, default: '' },
      buttonText: { type: String, default: 'Browse All Courses' },
      buttonLink: { type: String, default: '/courses' }
    },
    banner: {
      enabled: { type: Boolean, default: false },
      text: { type: String, default: '🎉 New Courses Enrolling for 2026 Batch!' },
      link: { type: String, default: '/courses' }
    },
    homepageSections: {
      type: [HomepageSectionSchema],
      default: [
        { id: 'hero', name: 'Hero Banner', enabled: true, order: 1 },
        { id: 'categories', name: 'Learning Categories', enabled: true, order: 2 },
        { id: 'featuredCourses', name: 'Featured Courses', enabled: true, order: 3 },
        { id: 'popularCourses', name: 'Popular Courses', enabled: true, order: 4 },
        { id: 'statistics', name: 'Student Statistics', enabled: true, order: 5 },
        { id: 'whyUs', name: 'Why Choose Us', enabled: true, order: 6 },
        { id: 'instructors', name: 'Expert Instructors', enabled: true, order: 7 },
        { id: 'quizzes', name: 'Quizzes & Practice', enabled: true, order: 8 },
        { id: 'testimonials', name: 'Student Testimonials', enabled: true, order: 9 },
        { id: 'blog', name: 'Latest Articles & Blog', enabled: true, order: 10 },
        { id: 'cta', name: 'Call To Action Banner', enabled: true, order: 11 }
      ]
    },
    footer: {
      description: { type: String, default: 'Enterprise Digital Learning Management Platform empowering students with industry-grade skills.' },
      contactEmail: { type: String, default: 'support@didm.edu' },
      contactPhone: { type: String, default: '+1 (800) 555-DIDM' },
      address: { type: String, default: 'DIDM Digital Learning Hub, Delhi NCR' },
      copyrightText: { type: String, default: 'Copyright © 2026 DIDM LMS Platform. All rights reserved.' },
      socialLinks: {
        facebook: { type: String, default: '' },
        twitter: { type: String, default: '' },
        instagram: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        youtube: { type: String, default: '' }
      }
    },
    seo: {
      title: { type: String, default: 'DIDM LMS — Digital Learning Management Platform' },
      metaDescription: { type: String, default: 'DIDM Digital Learning Management Platform for enterprise courses, students, instructors, and workspace management.' },
      metaKeywords: { type: String, default: 'DIDM, LMS, Digital Marketing, SEO, Online Learning' },
      ogImage: { type: String, default: '/didmlogo.png' }
    }
  },
  { timestamps: true }
);

WebsiteConfigSchema.plugin(tenantIsolationPlugin);

export const WebsiteConfigModel = model<IWebsiteConfigDocument>('WebsiteConfig', WebsiteConfigSchema);
