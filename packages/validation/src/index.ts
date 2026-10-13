import { z } from 'zod';

// Authentication Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  tenantSlug: z.string().optional()
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().optional(),
  tenantSlug: z.string().optional()
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
  tenantSlug: z.string().optional()
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long')
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long')
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

// Tenant Management Schemas
export const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Tenant name must be at least 2 characters long'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and dashes'),
  customDomain: z.string().optional(),
  planId: z.string().default('STARTER'),
  adminEmail: z.string().email('Admin email is required'),
  adminName: z.string().min(2, 'Admin name is required'),
  adminPassword: z.string().min(8, 'Admin initial password must be at least 8 characters long')
});

export const UpdateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  customDomain: z.string().optional(),
  planId: z.string().optional(),
  branding: z.object({
    companyName: z.string().optional(),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    showPlatformBranding: z.boolean().optional()
  }).optional()
});

export const UpdateTenantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'])
});

// Role & Permissions Schemas
export const CreateRoleSchema = z.object({
  name: z.string().min(2, 'Role name is required'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Role slug must be lowercase alphanumeric with dashes'),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([])
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

// User Profile Update Schema
export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal(''))
});

// Course Validation Schemas (STEP 3A)
export const CreateCourseSchema = z.object({
  title: z.string().min(2, 'Course title is required').max(200, 'Title cannot exceed 200 characters').trim(),
  shortDescription: z.string().max(500, 'Short description cannot exceed 500 characters').optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional().or(z.literal('')),
  categoryId: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).default('BEGINNER'),
  language: z.string().max(50).default('English'),
  durationMinutes: z.coerce.number().int().min(0, 'Duration must be greater than or equal to 0').default(0),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).default('PUBLIC')
}).strip();

export const UpdateCourseSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  categoryId: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  language: z.string().max(50).optional(),
  durationMinutes: z.coerce.number().int().min(0).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional()
}).strip();

export const CourseQueryFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  categoryId: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// STEP 5B Public Course Query Schema
export const PublicCourseQuerySchema = z.object({
  search: z.string().trim().max(100, 'Search query cannot exceed 100 characters').optional(),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ObjectId format').optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  language: z.string().max(50).optional(),
  sort: z.enum(['newest', 'oldest', 'title_asc', 'title_desc']).default('newest'),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(50, 'Limit cannot exceed 50').default(12)
}).strip();

export type PublicCourseQueryPayload = z.infer<typeof PublicCourseQuerySchema>;


// Course Module Schemas (STEP 3B)
export const CreateModuleSchema = z.object({
  title: z.string().min(2, 'Module title is required').max(150, 'Module title cannot exceed 150 characters').trim(),
  description: z.string().max(500, 'Module description cannot exceed 500 characters').optional()
}).strip();

export const UpdateModuleSchema = z.object({
  title: z.string().min(2, 'Module title is required').max(150).trim().optional(),
  description: z.string().max(500).optional()
}).strip();

export const ReorderModulesSchema = z.object({
  moduleIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid module ObjectId format'))
    .min(1, 'At least one module ID is required')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Module IDs array must not contain duplicate IDs'
    })
});

// Lesson Validation Schemas (STEP 3C & STEP 3E)
export const LessonTypeEnum = z.enum(['TEXT', 'VIDEO', 'PDF', 'AUDIO', 'EXTERNAL_RESOURCE', 'LIVE']);

const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];

export const TextContentSchema = z.object({
  bodyHtml: z.string({ required_error: 'bodyHtml is required for TEXT lesson type' }).min(1, 'bodyHtml cannot be empty')
}).strip();

export const ExternalResourceContentSchema = z.object({
  url: z.string().min(1, 'URL is required for EXTERNAL_RESOURCE').refine((val) => {
    const trimmed = val.trim().toLowerCase();
    if (DANGEROUS_PROTOCOLS.some((p) => trimmed.startsWith(p))) return false;
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, { message: 'URL must use http:// or https:// protocol. Dangerous protocols (javascript:, data:, file:) are rejected.' }),
  provider: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  embedUrl: z.string().optional(),
  videoId: z.string().optional(),
  openInNewTab: z.boolean().optional()
}).strip();


export const VideoContentSchema = z.object({
  mediaId: z.string().optional(),
  url: z.string().optional(),
  provider: z.string().optional(),
  durationSeconds: z.coerce.number().int().min(0).optional(),
  posterUrl: z.string().optional()
}).strip();

export const PdfContentSchema = z.object({
  mediaId: z.string().optional(),
  url: z.string().optional(),
  fileName: z.string().optional(),
  pageCount: z.coerce.number().int().min(0).optional()
}).strip();

export const AudioContentSchema = z.object({
  mediaId: z.string().optional(),
  url: z.string().optional(),
  durationSeconds: z.coerce.number().int().min(0).optional()
}).strip();

export const LiveContentSchema = z.object({
  meetingUrl: z.string().optional(),
  provider: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional()
}).strip().refine((data) => {
  if (data.startAt && data.endAt) {
    return new Date(data.startAt) < new Date(data.endAt);
  }
  return true;
}, { message: 'startAt date must be strictly before endAt date' });

export function validateLessonContent(type: string, content: any): any {
  if (!content || typeof content !== 'object') {
    if (type === 'TEXT') {
      throw new Error('bodyHtml is required for TEXT lesson type');
    }
    return {};
  }

  switch (type) {
    case 'TEXT':
      return TextContentSchema.parse(content);
    case 'EXTERNAL_RESOURCE':
      return ExternalResourceContentSchema.parse(content);
    case 'VIDEO':
      return VideoContentSchema.parse(content);
    case 'PDF':
      return PdfContentSchema.parse(content);
    case 'AUDIO':
      return AudioContentSchema.parse(content);
    case 'LIVE':
      return LiveContentSchema.parse(content);
    default:
      throw new Error(`Unsupported lesson type: '${type}'`);
  }
}

export const LessonContentSchema = z.record(z.any()).optional();

export const CreateLessonSchema = z.object({
  title: z.string().min(1, 'Lesson title is required').max(200, 'Title cannot exceed 200 characters').trim(),
  description: z.string().max(1000).optional(),
  type: LessonTypeEnum.default('TEXT'),
  content: LessonContentSchema,
  isPreview: z.boolean().default(false),
  estimatedDurationMinutes: z.coerce.number().int().min(0, 'Duration must be greater than or equal to 0').default(0)
}).strip();

export const UpdateLessonSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  type: LessonTypeEnum.optional(),
  content: LessonContentSchema,
  isPreview: z.boolean().optional(),
  estimatedDurationMinutes: z.coerce.number().int().min(0).optional()
}).strip();

export const ReorderLessonsSchema = z.object({
  lessonIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lesson ObjectId format'))
    .min(1, 'At least one lesson ID is required')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Lesson IDs array must not contain duplicate IDs'
    })
});

export const LessonQueryFilterSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  type: LessonTypeEnum.optional()
});

// System Probes & Query Schemas
export const HealthQuerySchema = z.object({
  verbose: z.enum(['true', 'false']).optional()
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const MongoIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format')
});

// Enrollment & Student Learning Validation Schemas (STEP 4)
export const EnrollCourseSchema = z.object({
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ObjectId format').optional()
}).strip();

export const UpdateProgressSchema = z.object({
  positionSeconds: z.coerce.number().int().min(0).default(0)
}).strip();

export const MarkCompleteSchema = z.object({
  lessonId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid lesson ObjectId format').optional()
}).strip();

// Organization Settings Validation Schemas (STEP 4A)
export const UpdateOrganizationProfileSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name cannot exceed 100 characters').trim().optional(),
  supportEmail: z.string().email('Invalid support email address format').optional().or(z.literal('')),
  supportPhone: z.string().max(30, 'Support phone cannot exceed 30 characters').optional(),
  address: z.string().max(200, 'Address cannot exceed 200 characters').optional(),
  timezone: z.string().max(50, 'Timezone cannot exceed 50 characters').optional(),
  defaultLanguage: z.string().max(50, 'Default language cannot exceed 50 characters').optional(),
  currency: z.string().max(10, 'Currency code cannot exceed 10 characters').optional()
}).strip();

export const UpdateLmsPreferencesSchema = z.object({
  allowStudentSelfRegistration: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  allowInstructorRegistration: z.boolean().optional(),
  maintenanceMode: z.boolean().optional()
}).strip();

// Organization Storage Validation Schemas (STEP 4B)
const safeHttpsUrl = z.string().trim().refine((val) => {
  if (!val || val.length === 0) return true;
  const lower = val.toLowerCase();
  if (['javascript:', 'data:', 'file:', 'vbscript:'].some((p) => lower.startsWith(p))) return false;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'URL must use https:// protocol. Dangerous protocols (javascript:, data:, file:) are rejected.' }).optional().or(z.literal(''));

export const CloudflareR2ConfigSchema = z.object({
  accountId: z.string().trim().optional(),
  endpoint: safeHttpsUrl,
  bucket: z.string().trim().max(100).optional(),
  accessKeyId: z.string().trim().optional(),
  secretAccessKey: z.string().trim().optional(),
  publicBaseUrl: safeHttpsUrl
}).strip();

export const AmazonS3ConfigSchema = z.object({
  bucket: z.string().trim().max(100).optional(),
  region: z.string().trim().max(50).optional(),
  endpoint: safeHttpsUrl,
  accessKeyId: z.string().trim().optional(),
  secretAccessKey: z.string().trim().optional(),
  publicBaseUrl: safeHttpsUrl
}).strip();

export const CloudinaryConfigSchema = z.object({
  cloudName: z.string().trim().optional(),
  apiKey: z.string().trim().optional(),
  apiSecret: z.string().trim().optional(),
  folderPrefix: z.string().trim().optional().refine((val) => {
    if (!val || val.length === 0) return true;
    if (val.includes('../') || val.includes('..\\') || val.startsWith('/') || val.startsWith('\\')) {
      return false;
    }
    return true;
  }, { message: 'folderPrefix must not contain path traversal (../) or absolute paths' })
}).strip();

export const StorageProviderEnum = z.enum(['LOCAL', 'CLOUDFLARE_R2', 'AWS_S3', 'AMAZON_S3', 'CLOUDINARY']);

export const UpdateOrganizationStorageSchema = z.object({
  provider: StorageProviderEnum,
  r2: CloudflareR2ConfigSchema.optional(),
  s3: AmazonS3ConfigSchema.optional(),
  cloudinary: CloudinaryConfigSchema.optional(),
  isEnabled: z.boolean().optional()
}).strip();

export const TestOrganizationStorageSchema = z.object({
  provider: StorageProviderEnum,
  r2: CloudflareR2ConfigSchema.optional(),
  s3: AmazonS3ConfigSchema.optional(),
  cloudinary: CloudinaryConfigSchema.optional()
}).strip();

export const CloudflareR2StorageSchema = CloudflareR2ConfigSchema;
export const AmazonS3StorageSchema = AmazonS3ConfigSchema;
export const CloudinaryStorageSchema = CloudinaryConfigSchema;

// Organization Branding & Website Validation Schemas (STEP 4D)
const hexColorSchema = z.string().trim().refine((val) => {
  if (!val) return true;
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(val);
}, { message: 'Invalid hex color format (e.g. #BE1E2E or #FFF)' }).optional().or(z.literal(''));

const safeUrlSchema = z.string().trim().refine((val) => {
  if (!val) return true;
  const lower = val.toLowerCase();
  if (['javascript:', 'data:', 'file:', 'vbscript:'].some(p => lower.startsWith(p))) return false;
  if (val.startsWith('/')) return true;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'URL must be a relative path (e.g. /courses) or use http:// or https:// protocol. Dangerous protocols are rejected.' }).optional().or(z.literal(''));

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format').optional().or(z.literal('')).nullable();

export const UpdateWebsiteBrandingSchema = z.object({
  organizationName: z.string().trim().min(1).max(100).optional(),
  tagline: z.string().trim().max(200).optional().or(z.literal('')),
  logoMediaId: objectIdSchema,
  faviconMediaId: objectIdSchema,
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  headingFont: z.string().trim().optional(),
  bodyFont: z.string().trim().optional(),
  borderRadius: z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE']).optional()
}).strip();

export const UpdateWebsiteHeroSchema = z.object({
  enabled: z.boolean().optional(),
  eyebrow: z.string().trim().max(100).optional().or(z.literal('')),
  title: z.string().trim().max(200).optional().or(z.literal('')),
  subtitle: z.string().trim().max(500).optional().or(z.literal('')),
  backgroundMediaId: objectIdSchema,
  primaryButton: z.object({
    enabled: z.boolean().optional(),
    label: z.string().trim().max(50).optional(),
    href: safeUrlSchema
  }).strip().optional(),
  secondaryButton: z.object({
    enabled: z.boolean().optional(),
    label: z.string().trim().max(50).optional(),
    href: safeUrlSchema
  }).strip().optional()
}).strip();

export const UpdateHomepageSchema = z.object({
  hero: z.object({
    enabled: z.boolean().optional(),
    eyebrow: z.string().trim().max(100).optional().or(z.literal('')),
    title: z.string().trim().max(200).optional().or(z.literal('')),
    subtitle: z.string().trim().max(500).optional().or(z.literal('')),
    primaryButton: z.object({
      label: z.string().trim().max(50).optional().or(z.literal('')),
      url: safeUrlSchema
    }).strip().optional(),
    secondaryButton: z.object({
      label: z.string().trim().max(50).optional().or(z.literal('')),
      url: safeUrlSchema
    }).strip().optional(),
    backgroundImageMediaId: objectIdSchema
  }).strip().optional(),
  about: z.object({
    enabled: z.boolean().optional(),
    title: z.string().trim().max(200).optional().or(z.literal('')),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    imageMediaId: objectIdSchema
  }).strip().optional(),
  featuredCourses: z.object({
    enabled: z.boolean().optional(),
    title: z.string().trim().max(200).optional().or(z.literal('')),
    subtitle: z.string().trim().max(500).optional().or(z.literal('')),
    courseIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ObjectId format')).optional(),
    limit: z.number().int().min(1).max(24).optional()
  }).strip().optional(),
  cta: z.object({
    enabled: z.boolean().optional(),
    title: z.string().trim().max(200).optional().or(z.literal('')),
    description: z.string().trim().max(500).optional().or(z.literal('')),
    buttonLabel: z.string().trim().max(50).optional().or(z.literal('')),
    buttonUrl: safeUrlSchema
  }).strip().optional(),
  showFeaturedCourses: z.boolean().optional(),
  featuredCourseIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ObjectId format')).optional(),
  showCategories: z.boolean().optional(),
  showAbout: z.boolean().optional(),
  showTestimonials: z.boolean().optional(),
  showContact: z.boolean().optional()
}).strip();

export const UpdateNavigationSchema = z.object({
  items: z.array(
    z.object({
      label: z.string().trim().min(1, 'Link label is required').max(100),
      url: safeUrlSchema,
      enabled: z.boolean().optional().default(true),
      order: z.number().int().min(0).default(0)
    }).strip()
  ).optional().refine((items) => {
    if (!items || items.length === 0) return true;
    const orders = items.map(i => i.order);
    return new Set(orders).size === orders.length;
  }, { message: 'Duplicate navigation item order values are not permitted' }),
  links: z.array(
    z.object({
      label: z.string().trim().min(1, 'Link label is required').max(50),
      href: safeUrlSchema,
      external: z.boolean().optional().default(false)
    }).strip()
  ).optional()
}).strip();

export const UpdateFooterSchema = z.object({
  description: z.string().trim().max(500).optional().or(z.literal('')),
  copyrightText: z.string().trim().max(200).optional().or(z.literal('')),
  links: z.array(
    z.object({
      label: z.string().trim().min(1).max(100),
      url: safeUrlSchema
    }).strip()
  ).optional(),
  socialLinks: z.object({
    facebook: safeUrlSchema,
    instagram: safeUrlSchema,
    youtube: safeUrlSchema,
    linkedin: safeUrlSchema,
    twitter: safeUrlSchema
  }).strip().optional()
}).strip();

export const UpdateWebsiteHomepageSchema = UpdateHomepageSchema;
export const UpdateWebsiteNavigationSchema = UpdateNavigationSchema;
export const UpdateWebsiteFooterSchema = UpdateFooterSchema;

export const UpdateWebsiteSeoSchema = z.object({
  title: z.string().trim().max(100).optional().or(z.literal('')),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  keywords: z.array(z.string().trim()).optional(),
  ogImageMediaId: objectIdSchema
}).strip();

export const UpdateWebsiteContactSchema = z.object({
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal(''))
}).strip();

export const UpdateWebsiteSocialSchema = z.object({
  facebook: safeUrlSchema,
  instagram: safeUrlSchema,
  youtube: safeUrlSchema,
  linkedin: safeUrlSchema,
  twitter: safeUrlSchema
}).strip();

export const UpdateWebsiteAboutSchema = z.object({
  title: z.string().trim().max(200).optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  imageMediaId: objectIdSchema
}).strip();

export const UpdateOrganizationBrandingSchema = UpdateWebsiteBrandingSchema.extend({
  backgroundColor: hexColorSchema,
  surfaceColor: hexColorSchema,
  textColor: hexColorSchema,
  fontFamily: z.enum(['Inter', 'Poppins', 'Roboto', 'System']).optional(),
  loginPage: z.object({
    showLogo: z.boolean().optional(),
    headline: z.string().trim().max(160).optional().or(z.literal('')),
    description: z.string().trim().max(300).optional().or(z.literal('')),
    backgroundImageMediaId: objectIdSchema
  }).strip().optional(),
  browser: z.object({
    title: z.string().trim().max(70).optional().or(z.literal('')),
    faviconMediaId: objectIdSchema
  }).strip().optional(),
  social: z.object({
    ogImageMediaId: objectIdSchema,
    twitterImageMediaId: objectIdSchema
  }).strip().optional()
}).strip();

export const UpdateOrganizationWebsiteSchema = z.object({
  enabled: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  branding: UpdateWebsiteBrandingSchema.optional(),
  hero: UpdateWebsiteHeroSchema.optional(),
  homepage: UpdateWebsiteHomepageSchema.optional(),
  about: UpdateWebsiteAboutSchema.optional(),
  contact: UpdateWebsiteContactSchema.optional(),
  socialLinks: UpdateWebsiteSocialSchema.optional(),
  footer: UpdateWebsiteFooterSchema.optional(),
  seo: UpdateWebsiteSeoSchema.optional(),
  navigation: UpdateWebsiteNavigationSchema.optional()
}).strip();

// Organization Team & Member Validation Schemas (STEP 4F)
export const EmployeePersonalDetailsSchema = z.object({
  dob: z.coerce.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: z.string().trim().optional(),
  alternatePhone: z.string().trim().optional(),
  emergencyContact: z.object({
    name: z.string().trim().optional(),
    relation: z.string().trim().optional(),
    phone: z.string().trim().optional()
  }).optional(),
  address: z.object({
    street: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional()
  }).optional()
}).optional();

export const EmployeeAcademicDetailsSchema = z.object({
  highestQualification: z.string().trim().optional(),
  skills: z.array(z.string().trim()).optional().default([]),
  experienceYears: z.coerce.number().min(0).optional().default(0),
  bio: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional()
}).optional();

export const EmployeeKycDetailsSchema = z.object({
  aadhaarNumber: z.string().trim().optional(),
  panNumber: z.string().trim().optional(),
  resumeUrl: z.string().trim().optional()
}).optional();

export const EmployeeBankDetailsSchema = z.object({
  bankName: z.string().trim().optional(),
  accountHolderName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().optional(),
  upiId: z.string().trim().optional()
}).optional();

export const EmployeeDetailsSchema = z.object({
  employeeId: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  department: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING', 'INTERN']).optional().default('FULL_TIME'),
  dateOfJoining: z.coerce.date().optional(),
  workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']).optional().default('ON_SITE'),
  personal: EmployeePersonalDetailsSchema,
  academic: EmployeeAcademicDetailsSchema,
  kyc: EmployeeKycDetailsSchema,
  bank: EmployeeBankDetailsSchema
}).optional();

export const CreateEmployeeMemberSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  phone: z.string().trim().optional(),
  role: z.enum(['TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'], {
    errorMap: () => ({ message: 'Role must be TENANT_ADMIN, INSTRUCTOR, or STUDENT' })
  }).default('INSTRUCTOR'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  employeeId: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  department: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING', 'INTERN']).optional().default('FULL_TIME'),
  dateOfJoining: z.coerce.date().optional(),
  workMode: z.enum(['ON_SITE', 'REMOTE', 'HYBRID']).optional().default('ON_SITE'),
  personal: EmployeePersonalDetailsSchema,
  academic: EmployeeAcademicDetailsSchema,
  kyc: EmployeeKycDetailsSchema,
  bank: EmployeeBankDetailsSchema
}).strip();

export const UpdateEmployeeMemberSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  role: z.enum(['TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REMOVED']).optional(),
  employeeDetails: EmployeeDetailsSchema
}).strip();

export const InviteOrganizationMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  role: z.enum(['TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'], {
    errorMap: () => ({ message: 'Role must be TENANT_ADMIN, INSTRUCTOR, or STUDENT' })
  })
}).strip();

export const UpdateOrganizationMemberRoleSchema = z.object({
  role: z.enum(['TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT'], {
    errorMap: () => ({ message: 'Role must be TENANT_ADMIN, INSTRUCTOR, or STUDENT' })
  })
}).strip();

export const UpdateOrganizationMemberStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REMOVED'], {
    errorMap: () => ({ message: 'Status must be ACTIVE, SUSPENDED, or REMOVED' })
  })
}).strip();

export const OrganizationMemberQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(['ALL', 'TENANT_ADMIN', 'INSTRUCTOR', 'STUDENT']).optional().default('ALL'),
  status: z.enum(['ALL', 'INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED']).optional().default('ALL'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().trim().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).strip();

// Organization Email & Notification Validation Schemas (STEP 4G)
export const EmailProviderSchema = z.enum(['RESEND', 'BREVO', 'SMTP'], {
  errorMap: () => ({ message: 'Provider must be RESEND, BREVO, or SMTP' })
});

export const ResendEmailConfigSchema = z.object({
  apiKey: z.string().trim().optional(),
  fromName: z.string().trim().optional(),
  fromEmail: z.string().trim().toLowerCase().email('Invalid fromEmail format').optional(),
  replyTo: z.string().trim().toLowerCase().optional()
}).strip();

export const BrevoEmailConfigSchema = z.object({
  apiKey: z.string().trim().optional(),
  fromName: z.string().trim().optional(),
  fromEmail: z.string().trim().toLowerCase().email('Invalid fromEmail format').optional(),
  replyTo: z.string().trim().toLowerCase().optional()
}).strip();

export const SmtpEmailConfigSchema = z.object({
  host: z.string().trim().optional(),
  port: z.coerce.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be at most 65535').optional(),
  secure: z.boolean().optional(),
  username: z.string().trim().optional(),
  password: z.string().optional(),
  fromName: z.string().trim().optional(),
  fromEmail: z.string().trim().toLowerCase().email('Invalid fromEmail format').optional(),
  replyTo: z.string().trim().toLowerCase().optional()
}).strip();

export const UpdateOrganizationEmailSchema = z.object({
  provider: EmailProviderSchema,
  fromName: z.string().trim().min(1, 'From Name is required'),
  fromEmail: z.string().trim().toLowerCase().email('Valid From Email address is required'),
  replyTo: z.string().trim().toLowerCase().optional().or(z.literal('')),
  resend: ResendEmailConfigSchema.optional(),
  brevo: BrevoEmailConfigSchema.optional(),
  smtp: SmtpEmailConfigSchema.optional()
}).strip();

export const TestEmailSchema = z.object({
  recipientEmail: z.string().trim().toLowerCase().email('Valid recipient email address is required')
}).strip();

export const NotificationPreferencesSchema = z.object({
  welcomeEmail: z.boolean().optional(),
  studentRegistration: z.boolean().optional(),
  instructorInvitation: z.boolean().optional(),
  passwordReset: z.boolean().optional(),
  courseEnrollment: z.boolean().optional(),
  courseCompletion: z.boolean().optional(),
  certificateIssued: z.boolean().optional(),
  adminAlerts: z.boolean().optional()
}).strip();

// Organization Domain & White-label Validation Schemas (STEP 4H)
const domainNameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export const ConfigureDomainSchema = z.object({
  customDomain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((val) => val.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].split(':')[0].replace(/\.$/, ''))
    .refine((val) => val.length >= 4 && val.length <= 253, { message: 'Domain name length must be between 4 and 253 characters' })
    .refine((val) => !val.includes('*'), { message: 'Wildcard domains (*.domain.com) are not allowed' })
    .refine((val) => val !== 'localhost' && !val.endsWith('.local') && !val.endsWith('.internal'), { message: 'Localhost and internal top-level domains are not allowed' })
    .refine((val) => domainNameRegex.test(val), { message: 'Invalid custom domain format. Example: learn.yourcompany.com' })
}).strip();

export const VerifyDomainSchema = z.object({}).strip();

export const DisconnectDomainSchema = z.object({}).strip();

export const UpdateWhiteLabelSchema = z.object({
  hidePlatformBranding: z.boolean().optional(),
  useCustomLogo: z.boolean().optional(),
  useCustomFavicon: z.boolean().optional(),
  useCustomColors: z.boolean().optional(),
  customSupportEmail: z.string().trim().toLowerCase().email('Invalid support email address').optional().or(z.literal('')),
  publicPoweredByEnabled: z.boolean().optional()
}).strip();

// Organization Onboarding Validation Schemas (STEP 4I)
export const UpdateOnboardingProgressSchema = z.object({
  currentStep: z.number().int().min(0).max(8).optional(),
  completedSteps: z.array(z.string().trim()).optional(),
  skippedSteps: z.array(z.string().trim()).optional()
}).strip();

export const CompleteOnboardingSchema = z.object({}).strip();
export const SkipOnboardingSchema = z.object({}).strip();

// Organization Launch Validation Schema (STEP 4J)
export const OrganizationLaunchSchema = z.object({}).strip();

// Batch & Class Management Validation Schemas
export const BatchTimingSchema = z.object({
  startTime: z.string().trim().min(1, 'Start time is required'),
  endTime: z.string().trim().min(1, 'End time is required'),
  timezone: z.string().trim().optional().default('Asia/Kolkata')
});

export const BatchClassroomDetailsSchema = z.object({
  branch: z.string().trim().optional(),
  roomNumber: z.string().trim().optional(),
  venueAddress: z.string().trim().optional(),
  contactPhone: z.string().trim().optional()
}).optional();

export const BatchZoomDetailsSchema = z.object({
  meetingUrl: z.string().trim().optional(),
  meetingId: z.string().trim().optional(),
  passcode: z.string().trim().optional(),
  hostUrl: z.string().trim().optional(),
  instructions: z.string().trim().optional()
}).optional();

export const CreateBatchSchema = z.object({
  name: z.string().trim().min(3, 'Batch name must be at least 3 characters'),
  batchCode: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  instructorId: z.string().trim().optional(),
  branchId: z.string().trim().min(1, 'Branch is required'),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID'], {
    errorMap: () => ({ message: 'Mode must be ONLINE, OFFLINE, or HYBRID' })
  }).default('ONLINE'),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional().default('UPCOMING'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  timing: BatchTimingSchema,
  daysOfWeek: z.array(z.string().trim()).min(1, 'At least one day must be selected'),
  maxSeats: z.coerce.number().int().min(1, 'Max seats must be at least 1').optional().default(30),
  showOnWebsite: z.boolean().optional().default(true),
  classroomDetails: BatchClassroomDetailsSchema,
  zoomDetails: BatchZoomDetailsSchema,
  notes: z.string().trim().optional()
}).strip();

export const UpdateBatchSchema = z.object({
  name: z.string().trim().min(3).optional(),
  batchCode: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  instructorId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).optional(),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  timing: BatchTimingSchema.optional(),
  daysOfWeek: z.array(z.string().trim()).optional(),
  maxSeats: z.coerce.number().int().min(1).optional(),
  showOnWebsite: z.boolean().optional(),
  classroomDetails: BatchClassroomDetailsSchema,
  zoomDetails: BatchZoomDetailsSchema,
  notes: z.string().trim().optional()
}).strip();

export const BatchQuerySchema = z.object({
  search: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  mode: z.enum(['ALL', 'ONLINE', 'OFFLINE', 'HYBRID']).optional().default('ALL'),
  status: z.enum(['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional().default('ALL'),
  showOnWebsite: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().trim().optional().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
}).strip();

// ==========================================
// CLASS DOMAIN VALIDATION SCHEMAS
// ==========================================

export const ClassTimingSchema = z.object({
  startTime: z.string().trim().min(1, 'Start time is required'),
  endTime: z.string().trim().min(1, 'End time is required'),
  timezone: z.string().trim().optional().default('Asia/Kolkata')
});

export const ClassClassroomDetailsSchema = z.object({
  branch: z.string().trim().min(1, 'Campus branch is required'),
  roomNumber: z.string().trim().min(1, 'Room / Lab number is required'),
  floor: z.string().trim().optional(),
  venueAddress: z.string().trim().min(1, 'Venue address is required'),
  centerContact: z.string().trim().optional(),
  facilities: z.array(z.string().trim()).optional()
}).optional();

export const ClassZoomDetailsSchema = z.object({
  meetingUrl: z.string().trim().url('Invalid Zoom meeting URL'),
  meetingId: z.string().trim().optional(),
  passcode: z.string().trim().optional(),
  hostUrl: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  autoRecord: z.boolean().optional().default(false)
}).optional();

export const CreateClassSchema = z.object({
  name: z.string().trim().min(3, 'Class name must be at least 3 characters'),
  classCode: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID'], {
    errorMap: () => ({ message: 'Mode must be ONLINE, OFFLINE, or HYBRID' })
  }).default('ONLINE'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1 seat').max(1000, 'Capacity cannot exceed 1000 seats'),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'FULL', 'COMPLETED', 'CANCELLED']).optional().default('SCHEDULED'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  timing: ClassTimingSchema,
  daysOfWeek: z.array(z.string().trim()).min(1, 'At least one day must be selected'),
  showOnWebsite: z.boolean().optional().default(true),
  classroomDetails: ClassClassroomDetailsSchema,
  zoomDetails: ClassZoomDetailsSchema,
  notes: z.string().trim().optional()
}).strip();

export const UpdateClassSchema = z.object({
  name: z.string().trim().min(3).optional(),
  classCode: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).optional(),
  capacity: z.coerce.number().int().min(1).max(1000).optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'FULL', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  timing: ClassTimingSchema.optional(),
  daysOfWeek: z.array(z.string().trim()).optional(),
  showOnWebsite: z.boolean().optional(),
  classroomDetails: ClassClassroomDetailsSchema,
  zoomDetails: ClassZoomDetailsSchema,
  notes: z.string().trim().optional()
}).strip();

export const EnrollStudentInClassSchema = z.object({
  studentId: z.string().trim().min(1, 'Student ID is required')
}).strip();

export const ClassQuerySchema = z.object({
  search: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  mode: z.enum(['ALL', 'ONLINE', 'OFFLINE', 'HYBRID']).optional().default('ALL'),
  status: z.enum(['ALL', 'SCHEDULED', 'ACTIVE', 'FULL', 'COMPLETED', 'CANCELLED']).optional().default('ALL'),
  isFull: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  showOnWebsite: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().trim().optional().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
}).strip();

// ==========================================
// PHASE 10: CRM & ADMISSIONS VALIDATION SCHEMAS
// ==========================================

export const LeadSourceEnum = z.enum([
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
]);

export const LeadStageEnum = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'DEMO_SCHEDULED',
  'FOLLOW_UP',
  'APPLICATION_STARTED',
  'ADMISSION_IN_PROGRESS',
  'CONVERTED',
  'LOST'
]);

export const LostReasonEnum = z.enum([
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
]);

export const FollowUpTypeEnum = z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'DEMO', 'COUNSELLING', 'GENERAL']);
export const FollowUpStatusEnum = z.enum(['PENDING', 'COMPLETED', 'CANCELLED']);
export const FollowUpOutcomeEnum = z.enum([
  'CONNECTED',
  'NO_ANSWER',
  'INTERESTED',
  'NOT_INTERESTED',
  'CALLBACK_REQUESTED',
  'DEMO_BOOKED',
  'FEES_DISCUSSION',
  'CONVERTED',
  'OTHER'
]);

export const AdmissionStatusEnum = z.enum([
  'DRAFT',
  'APPLICATION_SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'ADMITTED',
  'REJECTED',
  'CANCELLED'
]);

export const CreateLeadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().min(7, 'Valid phone number is required'),
  alternatePhone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  source: LeadSourceEnum.optional().default('MANUAL'),
  sourceDetail: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
  medium: z.string().trim().optional(),
  referralName: z.string().trim().optional(),
  courseInterestId: z.string().trim().optional(),
  batchInterestId: z.string().trim().optional(),
  preferredMode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).optional(),
  branchId: z.string().trim().optional(),
  stage: LeadStageEnum.optional().default('NEW'),
  assignedTo: z.string().trim().optional(),
  initialNote: z.string().trim().optional()
}).strip();

export const UpdateLeadSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().min(7).optional(),
  alternatePhone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  source: LeadSourceEnum.optional(),
  sourceDetail: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
  medium: z.string().trim().optional(),
  referralName: z.string().trim().optional(),
  courseInterestId: z.string().trim().optional(),
  batchInterestId: z.string().trim().optional(),
  preferredMode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).optional(),
  branchId: z.string().trim().optional()
}).strip();

export const ChangeLeadStageSchema = z.object({
  stage: LeadStageEnum,
  lostReason: LostReasonEnum.optional(),
  lostReasonDetail: z.string().trim().optional(),
  note: z.string().trim().optional()
}).strip();

export const AssignLeadSchema = z.object({
  assignedTo: z.string().trim().min(1, 'Counsellor ID is required'),
  note: z.string().trim().optional()
}).strip();

export const AddLeadNoteSchema = z.object({
  title: z.string().trim().optional(),
  note: z.string().trim().min(1, 'Note content cannot be empty'),
  type: z.enum([
    'NOTE_ADDED',
    'CALL',
    'EMAIL',
    'WHATSAPP',
    'DEMO_SCHEDULED'
  ]).optional().default('NOTE_ADDED')
}).strip();

export const ScheduleFollowUpSchema = z.object({
  assignedTo: z.string().trim().optional(),
  type: FollowUpTypeEnum.optional().default('CALL'),
  dueAt: z.coerce.date({ required_error: 'Due date/time is required' }),
  note: z.string().trim().optional()
}).strip();

export const CompleteFollowUpSchema = z.object({
  outcome: FollowUpOutcomeEnum.optional(),
  outcomeNote: z.string().trim().optional(),
  scheduleNextDueAt: z.coerce.date().optional(),
  scheduleNextNote: z.string().trim().optional()
}).strip();

export const CreateAdmissionSchema = z.object({
  applicant: z.object({
    fullName: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    dob: z.coerce.date().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    address: z.object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      pincode: z.string().trim().optional()
    }).optional(),
    guardianName: z.string().trim().optional(),
    guardianPhone: z.string().trim().optional()
  }).optional(),
  courseId: z.string().trim().min(1, 'Course ID is required'),
  batchId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  assignedCounsellor: z.string().trim().optional(),
  notes: z.string().trim().optional()
}).strip();

export const ConvertAdmissionSchema = z.object({
  batchId: z.string().trim().optional(),
  sendWelcomeEmail: z.boolean().optional().default(true)
}).strip();

export const LeadFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  stage: z.enum(['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'FOLLOW_UP', 'APPLICATION_STARTED', 'ADMISSION_IN_PROGRESS', 'CONVERTED', 'LOST']).optional().default('ALL'),
  source: z.enum(['ALL', 'WEBSITE', 'WALK_IN', 'PHONE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE_ADS', 'REFERRAL', 'IMPORT', 'MANUAL', 'OTHER']).optional().default('ALL'),
  assignedTo: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  courseId: z.string().trim().optional(),
  isMyLeads: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  sortBy: z.string().trim().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).strip();

export const FollowUpFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  assignedTo: z.string().trim().optional(),
  status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED']).optional().default('ALL'),
  isOverdue: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  dueToday: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  type: FollowUpTypeEnum.optional()
}).strip();

export const AdmissionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'DRAFT', 'APPLICATION_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ADMITTED', 'REJECTED', 'CANCELLED']).optional().default('ALL'),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  assignedCounsellor: z.string().trim().optional()
}).strip();

export const PublicLeadInquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().min(7, 'Valid phone number is required'),
  courseInterestId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  city: z.string().trim().optional(),
  source: LeadSourceEnum.optional().default('WEBSITE'),
  sourceDetail: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
  medium: z.string().trim().optional(),
  message: z.string().trim().optional()
}).strip();

// ==========================================
// PHASE 11: FINANCE VALIDATION SCHEMAS
// ==========================================

export const FeeComponentTypeEnum = z.enum([
  'TUITION',
  'ADMISSION',
  'EXAMINATION',
  'REGISTRATION',
  'MATERIAL',
  'LIBRARY',
  'OTHER'
]);

export const DiscountTypeEnum = z.enum(['FLAT', 'PERCENTAGE', 'SCHOLARSHIP', 'PROMOTIONAL']);
export const PaymentMethodEnum = z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE_GATEWAY', 'OTHER']);
export const PaymentStatusEnum = z.enum(['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED']);
export const ReversePaymentSchema = z.object({ reason: z.string().trim().min(5).max(500) }).strip();
export const FeePlanStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'FULLY_PAID', 'DEFAULTED', 'CANCELLED']);

export const FeeComponentSchema = z.object({
  name: z.string().trim().min(1, 'Component name is required'),
  type: FeeComponentTypeEnum.default('TUITION'),
  amountMinor: z.coerce.number().int().min(0, 'Component amount must be non-negative'),
  isRefundable: z.boolean().optional().default(false)
});

export const InstallmentTemplateSchema = z.object({
  sequence: z.coerce.number().int().min(1),
  label: z.string().trim().min(1, 'Label is required'),
  percentage: z.coerce.number().min(0).max(100).optional(),
  amountMinor: z.coerce.number().int().min(0).optional(),
  dueDaysAfterAdmission: z.coerce.number().int().min(0).default(0)
});

export const CreateFeeStructureSchema = z.object({
  name: z.string().trim().min(2, 'Fee structure name must be at least 2 characters'),
  code: z.string().trim().optional(),
  courseId: z.string().trim().min(1, 'Target course ID is required'),
  batchId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency must be an ISO 4217 code').default('INR'),
  components: z.array(FeeComponentSchema).min(1, 'At least one fee component is required'),
  installmentTemplates: z.array(InstallmentTemplateSchema).optional().default([])
}).strip();

export const UpdateFeeStructureSchema = z.object({
  name: z.string().trim().min(2).optional(),
  code: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  components: z.array(FeeComponentSchema).optional(),
  installmentTemplates: z.array(InstallmentTemplateSchema).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional()
}).strip();

export const StudentInstallmentInputSchema = z.object({
  sequence: z.coerce.number().int().min(1),
  label: z.string().trim().min(1, 'Installment label is required'),
  dueDate: z.coerce.date({ required_error: 'Due date is required' }),
  amountMinor: z.coerce.number().int().min(1, 'Installment amount must be greater than zero')
});

export const CreateStudentFeePlanSchema = z.object({
  studentUserId: z.string().trim().min(1, 'Student User ID is required'),
  admissionId: z.string().trim().optional(),
  enrollmentId: z.string().trim().optional(),
  courseId: z.string().trim().min(1, 'Course ID is required'),
  batchId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  feeStructureId: z.string().trim().optional(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency must be an ISO 4217 code').default('INR'),
  baseAmountMinor: z.coerce.number().int().safe().min(1, 'Base amount must be greater than zero'),
  discountType: DiscountTypeEnum.optional(),
  discountValue: z.coerce.number().min(0).optional(),
  discountReason: z.string().trim().optional(),
  installments: z.array(StudentInstallmentInputSchema).optional(),
  notes: z.string().trim().optional()
}).strip();

export const RecordManualPaymentSchema = z.object({
  studentFeePlanId: z.string().trim().min(1, 'Student fee plan ID is required'),
  amountMinor: z.coerce.number().int().min(1, 'Payment amount must be greater than zero'),
  method: PaymentMethodEnum,
  transactionReference: z.string().trim().optional(),
  receivedAt: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional()
}).strip();

export const CreateOnlineOrderSchema = z.object({
  studentFeePlanId: z.string().trim().min(1, 'Student fee plan ID is required'),
  installmentId: z.string().trim().optional(),
  amountMinor: z.coerce.number().int().min(1).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional()
}).strip();

export const VerifyOnlinePaymentSchema = z.object({
  paymentId: z.string().trim().min(1, 'Payment ID is required'),
  gatewayPaymentId: z.string().trim().min(1, 'Gateway payment ID is required'),
  gatewayOrderId: z.string().trim().min(1, 'Gateway order ID is required'),
  gatewaySignature: z.string().trim().min(1, 'Gateway signature is required')
}).strip();

export const RequestRefundSchema = z.object({
  paymentId: z.string().trim().min(1, 'Payment ID is required'),
  amountMinor: z.coerce.number().int().min(1, 'Refund amount must be greater than zero'),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters')
}).strip();

export const AttendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
export const BulkMarkAttendanceSchema = z.object({ records: z.array(z.object({ studentId: z.string().regex(/^[a-f\d]{24}$/i), status: AttendanceStatusEnum, remarks: z.string().trim().max(500).optional(), lateMinutes: z.coerce.number().int().min(0).max(1440).optional() })).min(1).max(500) }).superRefine((value, ctx) => { const ids = value.records.map((r) => r.studentId); if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate student IDs are not allowed', path: ['records'] }); });
export const CorrectAttendanceSchema = z.object({ status: AttendanceStatusEnum, reason: z.string().trim().min(3).max(500), idempotencyKey: z.string().trim().min(8).max(128).optional() });
export const AttendanceHistoryQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: AttendanceStatusEnum.optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).refine((q) => !q.from || !q.to || q.from <= q.to, 'Invalid date range');
export const AttendanceAnalyticsQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), threshold: z.coerce.number().min(0).max(100).default(75) });

export const UpdatePaymentGatewayConfigSchema = z.object({
  provider: z.enum(['RAZORPAY', 'STRIPE', 'MANUAL']),
  isEnabled: z.boolean().default(false),
  isLiveMode: z.boolean().default(false),
  razorpay: z.object({
    keyId: z.string().trim().optional(),
    keySecret: z.string().trim().optional(),
    webhookSecret: z.string().trim().optional()
  }).optional(),
  stripe: z.object({
    publishableKey: z.string().trim().optional(),
    secretKey: z.string().trim().optional(),
    webhookSecret: z.string().trim().optional()
  }).optional()
}).strip();

export const FeePlanQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'DRAFT', 'ACTIVE', 'FULLY_PAID', 'DEFAULTED', 'CANCELLED']).optional().default('ALL'),
  courseId: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
  hasOutstanding: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional())
}).strip();

export const PaymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED']).optional().default('ALL'),
  method: z.enum(['ALL', 'CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE_GATEWAY', 'OTHER']).optional().default('ALL'),
  studentUserId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional()
}).strip();

export const DueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  filterType: z.enum(['ALL', 'TODAY', 'OVERDUE', 'THIS_WEEK', 'UPCOMING']).optional().default('ALL'),
  courseId: z.string().trim().optional(),
  branchId: z.string().trim().optional()
}).strip();

export const CertificateIssueSchema = z.object({ enrollmentId: z.string().regex(/^[a-f\d]{24}$/i), idempotencyKey: z.string().trim().min(8).max(100).optional() }).strip();
export const CertificateRevokeSchema = z.object({ reason: z.string().trim().min(5).max(500) }).strip();
export const CertificateListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['ISSUED', 'REVOKED']).optional(), courseId: z.string().regex(/^[a-f\d]{24}$/i).optional(), search: z.string().trim().max(100).optional() }).strip();
export const CertificateVerificationCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{32,100}$/);

export const NotificationCategorySchema = z.enum(['ACADEMIC', 'ATTENDANCE', 'FINANCE', 'ADMISSION', 'CERTIFICATE', 'SYSTEM']);
export const NotificationIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid notification ID');
export const NotificationListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).strip();
export const UpdatePersonalNotificationPreferencesSchema = z.object({ preferences: z.array(z.object({ category: NotificationCategorySchema, inAppEnabled: z.boolean(), emailEnabled: z.boolean() }).strict()).min(1).max(6) }).strict().superRefine((value, context) => { const categories = value.preferences.map((item) => item.category); if (new Set(categories).size !== categories.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate notification categories are not allowed', path: ['preferences'] }); });

const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/); const LocalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const AcademicCalendarCreateSchema = z.object({ name: z.string().trim().min(2).max(120), timezone: z.string().trim().min(1).max(80), startDate: z.coerce.date(), endDate: z.coerce.date(), workingDays: z.array(z.number().int().min(1).max(7)).min(1) }).strict();
export const CalendarExceptionCreateSchema = z.object({ date: LocalDateSchema, type: z.enum(['HOLIDAY','WORKING_DAY_OVERRIDE']), name: z.string().trim().min(2).max(160) }).strict();
export const TimetableSlotSchema = z.object({ dayOfWeek: z.number().int().min(1).max(7), localStartTime: LocalTimeSchema, localEndTime: LocalTimeSchema, instructorId: z.string().regex(/^[a-f\d]{24}$/i), mode: z.enum(['OFFLINE','ONLINE','HYBRID']), roomId: z.string().regex(/^[a-f\d]{24}$/i).optional(), meetingUrl: z.string().url().refine((v) => v.startsWith('https://'), 'Meeting URL must use HTTPS').optional(), title: z.string().trim().max(160).optional() }).strict();
export const TimetableCreateSchema = z.object({ batchId: z.string().regex(/^[a-f\d]{24}$/i), calendarId: z.string().regex(/^[a-f\d]{24}$/i), name: z.string().trim().min(2).max(120), timezone: z.string().trim().min(1).max(80), effectiveFrom: z.coerce.date(), effectiveTo: z.coerce.date(), slots: z.array(TimetableSlotSchema).min(1).max(50) }).strict();
export const GenerateScheduleSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).strict();
export const OneOffClassSchema = z.object({ batchId: z.string().regex(/^[a-f\d]{24}$/i), title: z.string().trim().min(2).max(160), startAt: z.coerce.date(), endAt: z.coerce.date(), timezone: z.string().trim().min(1).max(80), instructorId: z.string().regex(/^[a-f\d]{24}$/i), mode: z.enum(['OFFLINE','ONLINE','HYBRID']), roomId: z.string().regex(/^[a-f\d]{24}$/i).optional(), meetingUrl: z.string().url().refine((v) => v.startsWith('https://'), 'Meeting URL must use HTTPS').optional() }).strict();
export const RescheduleClassSchema = z.object({ startAt: z.coerce.date(), endAt: z.coerce.date(), instructorId: z.string().regex(/^[a-f\d]{24}$/i).optional(), roomId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(), mode: z.enum(['OFFLINE','ONLINE','HYBRID']).optional(), meetingUrl: z.string().url().refine((v) => v.startsWith('https://'), 'Meeting URL must use HTTPS').nullable().optional(), reason: z.string().trim().min(3).max(500), expectedRevision: z.number().int().min(0) }).strict();
export const CancelClassSchema = z.object({ reason: z.string().trim().min(3).max(500), expectedRevision: z.number().int().min(0) }).strict();
export const CalendarRangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date(), batchId: z.string().regex(/^[a-f\d]{24}$/i).optional(), instructorId: z.string().regex(/^[a-f\d]{24}$/i).optional(), roomId: z.string().regex(/^[a-f\d]{24}$/i).optional(), mode: z.enum(['OFFLINE','ONLINE','HYBRID']).optional(), status: z.enum(['SCHEDULED','ACTIVE','FULL','COMPLETED','CANCELLED']).optional() }).strip();

// ==========================================
// PHASE 16: STUDENT LIFECYCLE & ACADEMIC JOURNEY VALIDATION SCHEMAS
// ==========================================

export const StudentLifecycleStatusEnum = z.enum([
  'PENDING_ACTIVATION',
  'ACTIVE',
  'ON_HOLD',
  'WITHDRAWN',
  'DROPPED',
  'COMPLETED',
  'REACTIVATED'
]);

export const ActivateStudentSchema = z.object({
  batchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID').optional(),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const TransferStudentBatchSchema = z.object({
  toBatchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid destination batch ID'),
  reason: z.string().trim().min(3, 'Transfer reason must be at least 3 characters').max(500),
  effectiveAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const HoldStudentSchema = z.object({
  reason: z.string().trim().min(3, 'Hold reason must be at least 3 characters').max(500),
  effectiveFrom: z.coerce.date().optional(),
  expectedResumeDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const ResumeStudentSchema = z.object({
  effectiveAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const WithdrawStudentSchema = z.object({
  reason: z.string().trim().min(3, 'Withdrawal reason must be at least 3 characters').max(500),
  effectiveAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const DropStudentSchema = z.object({
  reason: z.string().trim().min(3, 'Dropout reason must be at least 3 characters').max(500),
  effectiveAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const CompleteStudentSchema = z.object({
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const ReactivateStudentSchema = z.object({
  batchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID').optional(),
  reason: z.string().trim().min(3, 'Reactivation reason must be at least 3 characters').max(500),
  notes: z.string().trim().max(500).optional(),
  expectedRevision: z.number().int().min(0).optional()
}).strict();

export const StudentDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ALL', 'PENDING_ACTIVATION', 'ACTIVE', 'ON_HOLD', 'WITHDRAWN', 'DROPPED', 'COMPLETED', 'REACTIVATED']).optional().default('ALL'),
  courseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  batchId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'activatedAt', 'studentNumber', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).strip();

// ==========================================
// PHASE 19: ANALYTICS VALIDATION SCHEMAS
// ==========================================

export const AnalyticsDateRangeQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  timezone: z.string().trim().min(1).optional().default('Asia/Kolkata'),
  granularity: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().default('DAILY'),
  branchId: z.string().trim().optional(),
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course ID').optional(),
  batchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID').optional(),
  instructorId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid instructor ID').optional()
}).strip();

export const AnalyticsDashboardQuerySchema = AnalyticsDateRangeQuerySchema.extend({
  comparison: z.enum(['PREVIOUS_PERIOD', 'NONE']).optional().default('PREVIOUS_PERIOD')
}).strip();

export const AnalyticsStudentsQuerySchema = AnalyticsDateRangeQuerySchema.strip();
export const AnalyticsCRMQuerySchema = AnalyticsDateRangeQuerySchema.strip();
export const AnalyticsFinanceQuerySchema = AnalyticsDateRangeQuerySchema.strip();
export const AnalyticsAttendanceQuerySchema = AnalyticsDateRangeQuerySchema.extend({
  threshold: z.coerce.number().min(0).max(100).optional().default(75)
}).strip();
export const AnalyticsAcademicsQuerySchema = AnalyticsDateRangeQuerySchema.strip();
export const AnalyticsLearningQuerySchema = AnalyticsDateRangeQuerySchema.strip();
export const AnalyticsInstructorsQuerySchema = AnalyticsDateRangeQuerySchema.strip();
export const AnalyticsBranchCompareQuerySchema = AnalyticsDateRangeQuerySchema.strip();

export const ExecutiveDashboardQuerySchema = AnalyticsDashboardQuerySchema;
export const StudentsAnalyticsQuerySchema = AnalyticsStudentsQuerySchema;
export const CRMAnalyticsQuerySchema = AnalyticsCRMQuerySchema;
export const FinanceAnalyticsQuerySchema = AnalyticsFinanceQuerySchema;
export const DomainAttendanceAnalyticsQuerySchema = AnalyticsAttendanceQuerySchema;
export const AcademicsAnalyticsQuerySchema = AnalyticsAcademicsQuerySchema;
export const LearningAnalyticsQuerySchema = AnalyticsLearningQuerySchema;
export const InstructorsAnalyticsQuerySchema = AnalyticsInstructorsQuerySchema;
export const BranchComparisonQuerySchema = AnalyticsBranchCompareQuerySchema;

export const AnalyticsReportKeySchema = z.enum([
  'STUDENT_ROSTER',
  'STUDENT_LIFECYCLE_HISTORY',
  'LEAD_ACQUISITION',
  'ADMISSION_CONVERSIONS',
  'FINANCE_COLLECTIONS',
  'FINANCE_AGING_DUES',
  'ATTENDANCE_SUMMARY',
  'LOW_ATTENDANCE_STUDENTS',
  'ACADEMIC_CLASS_SCHEDULE',
  'INSTRUCTOR_WORKLOAD'
]);

export const AnalyticsReportQuerySchema = z.object({
  reportKey: AnalyticsReportKeySchema,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  timezone: z.string().trim().min(1).optional().default('Asia/Kolkata'),
  branchId: z.string().trim().optional(),
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course ID').optional(),
  batchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID').optional(),
  instructorId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid instructor ID').optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  threshold: z.coerce.number().min(0).max(100).optional().default(75)
}).strip();

export const AnalyticsExportSchema = z.object({
  reportKey: AnalyticsReportKeySchema,
  format: z.literal('CSV').default('CSV'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  timezone: z.string().trim().min(1).optional().default('Asia/Kolkata'),
  branchId: z.string().trim().optional(),
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course ID').optional(),
  batchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID').optional(),
  instructorId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid instructor ID').optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  threshold: z.coerce.number().min(0).max(100).optional().default(75)
}).strip();

// ==========================================
// PHASE 20: INSTITUTIONAL COMMUNICATION SCHEMAS
// ==========================================

export const CommunicationPrioritySchema = z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL');
export const CommunicationAnnouncementStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'CANCELLED', 'ARCHIVED']);
export const CommunicationAudienceTypeSchema = z.enum([
  'ALL_AUTHORIZED',
  'BRANCH',
  'BATCH',
  'COURSE',
  'STUDENTS',
  'INSTRUCTORS',
  'STAFF',
  'SPECIFIC_USERS'
]);

export const CommunicationAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  url: z.string().url('Invalid attachment URL'),
  sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024), // 25 MB max
  mimeType: z.string().min(1)
});

export const CommunicationAudienceCriteriaSchema = z.object({
  branchIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid branch ID')).optional(),
  batchIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID')).optional(),
  courseIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course ID')).optional(),
  userIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID')).optional(),
  roles: z.array(z.string()).optional()
}).optional();

const normalizeAudienceInput = (val: any) => {
  if (val && typeof val === 'object' && val.audience && typeof val.audience === 'object') {
    const { selector, ...restCriteria } = val.audience;
    return {
      ...val,
      audienceType: val.audienceType || selector,
      audienceCriteria: val.audienceCriteria || (Object.keys(restCriteria).length > 0 ? restCriteria : undefined)
    };
  }
  return val;
};

export const CreateAnnouncementSchema = z.preprocess(
  normalizeAudienceInput,
  z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title cannot exceed 200 characters').trim(),
    body: z.string().min(2, 'Body must be at least 2 characters').max(5000, 'Body cannot exceed 5000 characters'),
    priority: CommunicationPrioritySchema.optional().default('NORMAL'),
    audienceType: CommunicationAudienceTypeSchema,
    audienceCriteria: CommunicationAudienceCriteriaSchema,
    branchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid branch ID').optional(),
    channels: z.array(z.enum(['IN_APP', 'EMAIL'])).default(['IN_APP']),
    attachments: z.array(CommunicationAttachmentSchema).default([])
  }).strip()
);

export const UpdateAnnouncementSchema = z.preprocess(
  normalizeAudienceInput,
  z.object({
    title: z.string().min(2).max(200).trim().optional(),
    body: z.string().min(2).max(5000).optional(),
    priority: CommunicationPrioritySchema.optional(),
    audienceType: CommunicationAudienceTypeSchema.optional(),
    audienceCriteria: CommunicationAudienceCriteriaSchema,
    branchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid branch ID').optional().nullable(),
    channels: z.array(z.enum(['IN_APP', 'EMAIL'])).optional(),
    attachments: z.array(CommunicationAttachmentSchema).optional()
  }).strip()
);

export const ScheduleAnnouncementSchema = z.object({
  scheduledAt: z.coerce.date().refine((d) => d > new Date(), {
    message: 'Scheduled date must be in the future'
  }),
  timezone: z.string().trim().min(1).default('Asia/Kolkata')
}).strip();

export const AudiencePreviewSchema = z.preprocess(
  normalizeAudienceInput,
  z.object({
    audienceType: CommunicationAudienceTypeSchema,
    audienceCriteria: CommunicationAudienceCriteriaSchema,
    branchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid branch ID').optional()
  }).strip()
);

export const CreateConversationSchema = z.preprocess((val: any) => {
  if (val && typeof val === 'object') {
    const raw = { ...val };
    if (!raw.participantUserIds && raw.recipientUserIds) {
      raw.participantUserIds = raw.recipientUserIds;
    }
    return raw;
  }
  return val;
}, z.object({
  type: z.enum(['DIRECT', 'STUDENT_INSTRUCTOR', 'STUDENT_SUPPORT', 'STAFF']),
  participantUserIds: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID')).min(1, 'At least one participant required'),
  title: z.string().max(200).trim().optional(),
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid course ID').optional(),
  batchId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid batch ID').optional(),
  initialMessage: z.string().min(1).max(4000).trim().optional()
}).strip());

export const SendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(4000, 'Message cannot exceed 4000 characters').trim(),
  attachments: z.array(CommunicationAttachmentSchema).default([]),
  idempotencyKey: z.string().max(100).optional()
}).strip();

export const MarkReadSchema = z.object({
  itemType: z.enum(['ANNOUNCEMENT', 'CONVERSATION']),
  itemId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid item ID'),
  lastReadMessageSequence: z.number().int().min(0).optional()
}).strip();

export const InboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.enum(['ALL', 'ANNOUNCEMENT', 'CONVERSATION']).optional().default('ALL'),
  status: z.enum(['ALL', 'UNREAD', 'READ']).optional().default('ALL'),
  search: z.string().trim().optional()
}).strip();

export const AnnouncementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: CommunicationAnnouncementStatusSchema.optional(),
  priority: CommunicationPrioritySchema.optional(),
  branchId: z.string().trim().optional(),
  search: z.string().trim().optional()
}).strip();

export const ConversationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.enum(['DIRECT', 'STUDENT_INSTRUCTOR', 'STUDENT_SUPPORT', 'STAFF']).optional(),
  search: z.string().trim().optional()
}).strip();

// Phase 21 Automation Engine. Registries perform the trigger-specific field and action input checks.
export const AutomationConditionOperatorSchema = z.enum(['EQUALS','NOT_EQUALS','IN','NOT_IN','GREATER_THAN','GREATER_THAN_OR_EQUAL','LESS_THAN','LESS_THAN_OR_EQUAL','EXISTS','NOT_EXISTS']);
export const AutomationConditionSchema = z.object({ field: z.string().trim().min(1).max(100).regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/), operator: AutomationConditionOperatorSchema, value: z.union([z.string().max(500), z.number().finite(), z.boolean(), z.array(z.union([z.string().max(500), z.number().finite()])).max(50), z.null()]).optional() }).strict();
export const AutomationStepSchema = z.discriminatedUnion('type', [
  z.object({ stepId: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/), type: z.literal('ACTION'), actionType: z.string().trim().min(1).max(100), inputs: z.record(z.string(), z.unknown()).default({}) }).strict(),
  z.object({ stepId: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/), type: z.literal('DELAY'), delaySeconds: z.number().int().min(5).max(31_536_000) }).strict()
]);
export const CreateAutomationSchema = z.object({ name: z.string().trim().min(2).max(150), description: z.string().trim().max(1000).optional(), triggerType: z.string().trim().min(1).max(100), conditions: z.object({ mode: z.enum(['ALL','ANY']).default('ALL'), items: z.array(AutomationConditionSchema).max(25).default([]) }).default({ mode: 'ALL', items: [] }), steps: z.array(AutomationStepSchema).min(1).max(25), branchMode: z.enum(['ALL','SELECTED']).default('ALL'), branchIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).default([]) }).strict();
export const UpdateAutomationSchema = CreateAutomationSchema.partial().strict();
export const AutomationListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['DRAFT','ACTIVE','PAUSED','ARCHIVED']).optional(), search: z.string().trim().max(100).optional(), sort: z.enum(['updatedAt','createdAt','name']).default('updatedAt'), order: z.enum(['asc','desc']).default('desc') }).strip();
export const AutomationExecutionQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['PENDING','RUNNING','WAITING','COMPLETED','FAILED','CANCELLED','DEAD_LETTER']).optional() }).strip();
export const AutomationEventEnvelopeSchema = z.object({
  eventId: z.string().trim().min(8).max(200), eventType: z.string().trim().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/).max(100),
  tenantId: z.string().regex(/^[a-f\d]{24}$/i), occurredAt: z.coerce.date(), actorId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  resourceType: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9]*$/).max(80), resourceId: z.string().trim().min(1).max(100),
  branchId: z.string().regex(/^[a-f\d]{24}$/i).optional(), correlationId: z.string().trim().min(1).max(200), causationId: z.string().trim().min(1).max(200).optional(),
  depth: z.number().int().min(0).max(8).default(0), payloadVersion: z.number().int().min(1).max(100).default(1), payload: z.record(z.string(), z.unknown())
}).strict().superRefine((value, ctx) => { if (Buffer.byteLength(JSON.stringify(value.payload)) > 64 * 1024) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['payload'], message: 'Event payload exceeds 64 KiB' }); });

// Phase 22: External Academic & Live-Class Integration Schemas
export const IntegrationProviderSchema = z.enum([
  'GOOGLE_CLASSROOM',
  'GOOGLE_MEET',
  'ZOOM',
  'MICROSOFT_TEAMS'
]);

export const ConnectIntegrationSchema = z.object({
  code: z.string().min(1, 'Authorization code is required').optional(),
  state: z.string().optional(),
  redirectUri: z.string().url().optional(),
  scopeType: z.enum(['TENANT', 'BRANCH', 'USER']).default('TENANT'),
  branchId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  credentials: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accountEmail: z.string().email().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    webhookSecret: z.string().optional()
  }).optional()
}).strip();

export const LinkClassroomCourseSchema = z.object({
  connectionId: z.string().regex(/^[a-f\d]{24}$/i),
  batchId: z.string().regex(/^[a-f\d]{24}$/i),
  externalCourseId: z.string().min(1, 'External Classroom course ID is required').trim(),
  syncDirection: z.enum(['BIDIRECTIONAL', 'DIDM_TO_EXTERNAL', 'EXTERNAL_TO_DIDM', 'READ_ONLY_EXTERNAL']).default('BIDIRECTIONAL'),
  gradePolicy: z.enum(['DIDM_AUTHORITATIVE', 'CLASSROOM_AUTHORITATIVE', 'MANUAL_MERGE']).default('DIDM_AUTHORITATIVE')
}).strip();

export const SyncClassroomResourceSchema = z.object({
  syncRoster: z.boolean().default(true),
  syncCoursework: z.boolean().default(true),
  syncSubmissions: z.boolean().default(true),
  syncGrades: z.boolean().default(true),
  gradePolicy: z.enum(['DIDM_AUTHORITATIVE', 'CLASSROOM_AUTHORITATIVE', 'MANUAL_MERGE']).optional()
}).strip();

export const ResolveClassroomConflictSchema = z.object({
  conflictKey: z.string().min(1).optional().default('grade_conflict'),
  resolution: z.enum(['ACCEPT_DIDM', 'ACCEPT_EXTERNAL', 'MANUAL_OVERRIDE', 'KEEP_DIDM']),
  overrideValue: z.any().optional()
}).strip();

export const CreateClassMeetingSchema = z.object({
  provider: z.enum(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS']),
  connectionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  topic: z.string().max(200).optional(),
  agenda: z.string().max(1000).optional(),
  password: z.string().max(50).optional()
}).strip();

export const RescheduleClassMeetingSchema = z.object({
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  reason: z.string().max(500).optional()
}).strip();

export const ImportAttendanceEvidenceSchema = z.object({
  minimumDurationMinutes: z.coerce.number().int().min(1).max(720).default(15),
  autoMarkThresholdPercent: z.coerce.number().min(0).max(100).default(60)
}).strip();

export const IntegrationOperationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  provider: IntegrationProviderSchema.optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYABLE']).optional(),
  canonicalResourceId: z.string().optional()
}).strip();

export const IntegrationSyncRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  provider: IntegrationProviderSchema.optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED']).optional()
}).strip();

export const GoogleClassroomCourseQuerySchema = z.object({
  connectionId: z.string().regex(/^[a-f\d]{24}$/i),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  pageToken: z.string().optional()
}).strip();
