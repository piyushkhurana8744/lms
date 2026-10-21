// Standard API Response Envelopes
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
  error: null;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

// Health & Infrastructure Status Probes
export interface ILivenessStatus {
  status: 'alive';
  timestamp: string;
  uptimeSeconds: number;
}

export interface IReadinessStatus {
  status: 'ready' | 'unhealthy';
  timestamp: string;
  services: {
    api: 'healthy';
    database: 'connected' | 'disconnected' | 'connecting';
    redis: 'connected' | 'disconnected' | 'disabled';
    transactions: 'available' | 'unavailable';
  };
}

export interface IHealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    api: 'healthy' | 'unhealthy';
    database: 'connected' | 'disconnected' | 'connecting';
    redis: 'connected' | 'disconnected' | 'disabled';
    transactions: 'available' | 'unavailable';
  };
  environment: string;
}

// Minimal JWT Token Payload
export interface ITokenPayload {
  sub: string; // userId
  sessionId: string;
  tenantId: string | null;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Centralized Workspace Context Abstraction
export interface IWorkspaceContext {
  currentTenantId: string;
  currentUserId: string;
  isPlatformContext: boolean;
  allowedTenantIds: string[];
}

// User Context & Models
export interface IUser {
  id: string;
  tenantId: string | null;
  activeTenantId?: string | null;
  allowedTenantIds?: string[];
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  emailVerified: boolean;
  isSuperAdmin: boolean;
  impersonatedBy?: string | null;
  isImpersonated?: boolean;
  impersonationReason?: string | null;
  roles: string[];
  permissions?: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tenant Context & Models
export interface ITenant {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  isCustomDomainVerified?: boolean;
  planId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  branding?: ITenantBranding;
  whiteLabel?: { enabled: boolean };
  createdAt: Date;
  updatedAt: Date;
}

// Role Context & Models
export interface IRole {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Course Domain Models & Types (STEP 3A)
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type CourseStatus = 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type CourseVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';

export interface ICourse {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  categoryId?: string;
  level: CourseLevel;
  language: string;
  durationMinutes: number;
  status: CourseStatus;
  visibility: CourseVisibility;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
  visibility?: CourseVisibility;
  level?: CourseLevel;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Course Module Domain Models & Types (STEP 3B)
export type CourseModuleStatus = 'ACTIVE' | 'ARCHIVED';

export interface ICourseModule {
  id: string;
  tenantId: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  status: CourseModuleStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCourseModulePayload {
  title: string;
  description?: string;
}

export interface IUpdateCourseModulePayload {
  title?: string;
  description?: string;
}

export interface IReorderModulesPayload {
  moduleIds: string[];
}

// Media Management Models & Types (STEP 3E)
export type MediaType = 'VIDEO' | 'PDF' | 'AUDIO' | 'IMAGE';
export type MediaStatus = 'UPLOADING' | 'READY' | 'FAILED' | 'DELETED';

export interface IMedia {
  id: string;
  tenantId: string;
  uploadedBy: string;
  originalFileName: string;
  storageKey: string;
  storageProvider?: StorageProvider;
  providerMetadata?: Record<string, any>;
  mimeType: string;
  sizeBytes: number;
  mediaType: MediaType;
  status: MediaStatus;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Lesson Domain Models & Discriminated Types (STEP 3C & 3E)
export type LessonType = 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
export type LessonStatus = 'ACTIVE' | 'INACTIVE';

export interface ITextContent {
  bodyHtml?: string;
}

export interface IVideoContent {
  mediaId?: string;
  url?: string;
  provider?: string;
  durationSeconds?: number;
  posterUrl?: string;
}

export interface IPdfContent {
  mediaId?: string;
  url?: string;
  fileName?: string;
  pageCount?: number;
}

export interface IAudioContent {
  mediaId?: string;
  url?: string;
  durationSeconds?: number;
}

export interface IExternalResourceContent {
  url: string;
  provider?: 'YOUTUBE' | 'VIMEO' | 'WEBSITE' | 'OTHER' | string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  videoId?: string;
  openInNewTab?: boolean;
}


export interface ILiveContent {
  meetingUrl?: string;
  provider?: string;
  startAt?: Date | string;
  endAt?: Date | string;
}

export type ILessonContent =
  | ITextContent
  | IVideoContent
  | IPdfContent
  | IAudioContent
  | IExternalResourceContent
  | ILiveContent;

export interface ILesson {
  id: string;
  tenantId: string;
  courseId: string;
  moduleId: string;
  title: string;
  description?: string;
  type: LessonType;
  content?: ILessonContent;
  order: number;
  status: LessonStatus;
  isPreview: boolean;
  estimatedDurationMinutes: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateLessonPayload {
  title: string;
  description?: string;
  type: LessonType;
  content?: ILessonContent;
  isPreview?: boolean;
  estimatedDurationMinutes?: number;
}

export interface IUpdateLessonPayload {
  title?: string;
  description?: string;
  type?: LessonType;
  content?: ILessonContent;
  isPreview?: boolean;
  estimatedDurationMinutes?: number;
}

export interface IReorderLessonsPayload {
  lessonIds: string[];
}

export interface ILessonFilterQuery {
  status?: LessonStatus;
  type?: LessonType;
}

// Session Metadata Model
export interface ISession {
  id: string;
  userId: string;
  tenantId: string | null;
  activeTenantId?: string | null;
  impersonatedBy?: string | null;
  originalSessionId?: string | null;
  impersonationReason?: string | null;
  currentRefreshTokenHash: string;
  previousRefreshTokenHash?: string;
  tokenVersion: number;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
}

// Platform Command Center Aggregated Metrics Summary
export interface ICommandCenterSummary {
  timestamp: string;
  metrics: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalRegisteredUsers: number;
    databaseState: string;
  };
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: Date;
  }>;
}

// Audit Log Model
export interface IAuditLog {
  id: string;
  actorId: string;
  tenantId: string | 'PLATFORM';
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Parent Platform Brand Defaults
export const DIDM_PLATFORM_BRANDING = {
  platformName: 'DIDM',
  companyName: 'DIDM',
  logoUrl: '/didmlogo.png',
  faviconUrl: '/didmfavicon.png',
  primaryColor: '#BE1E2E',
  secondaryColor: '#FFFFFF',
  backgroundColor: '#F8FAFC',
  textColor: '#0F172A',
  borderColor: '#E2E8F0',
  accentColor: '#BE1E2E',
  showPlatformBranding: true,
  tagline: 'Digital Institute of Digital Marketing LMS Platform'
} as const;

export interface IResolvedBranding {
  isWhiteLabel: boolean;
  companyName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  platformName: string;
  showPlatformBranding: boolean;
  fontFamily?: string;
  surfaceColor?: string;
}


export interface ITenantTheme {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
}

export interface ITenantBranding {
  companyName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  customCss?: string;
  theme?: ITenantTheme;
  showPlatformBranding?: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

export interface IThemeContext {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  setMode: (mode: ThemeMode) => void;
}

export interface IAuthContext {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  impersonate: (userId: string, reason?: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission?: (permissions: string[]) => boolean;
  hasAllPermissions?: (permissions: string[]) => boolean;
}

export interface IEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailProvider {
  sendEmail(options: IEmailOptions): Promise<boolean>;
}

// Enrollment & Student Learning Models & Types (STEP 4)
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface IEnrollment {
  id: string;
  tenantId: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date | null;
  lastAccessedAt?: Date | null;
  lastLessonId?: string | null;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILessonProgress {
  id: string;
  tenantId: string;
  studentId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastPositionSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentCourse {
  enrollment: IEnrollment;
  course: ICourse;
}

export interface IStudentProgress {
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastLessonId?: string | null;
  lessonProgresses: ILessonProgress[];
}

export interface IEnrollCoursePayload {
  courseId: string;
}

export interface IMarkLessonCompletePayload {
  lessonId: string;
}

export interface IUpdateLearningProgressPayload {
  lessonId: string;
  positionSeconds?: number;
}

// Organization Storage Models & Types (STEP 4B & STEP 4C)
export type StorageProvider = 'LOCAL' | 'CLOUDFLARE_R2' | 'AWS_S3' | 'AMAZON_S3' | 'CLOUDINARY';
export type StorageConnectionStatus = 'NOT_CONFIGURED' | 'TESTING' | 'CONNECTED' | 'ERROR' | 'DISABLED';

export interface ICloudflareR2StorageConfig {
  accountId?: string;
  endpoint?: string;
  bucket?: string;
  accessKeyIdMasked?: string;
  secretAccessKeyConfigured?: boolean;
  publicBaseUrl?: string;
}

export interface IAmazonS3StorageConfig {
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyIdMasked?: string;
  secretAccessKeyConfigured?: boolean;
  publicBaseUrl?: string;
}

export interface ICloudinaryStorageConfig {
  cloudName?: string;
  apiKey?: string;
  apiSecretMasked?: string;
  apiSecretConfigured?: boolean;
  folderPrefix?: string;
}

export interface IOrganizationStorageResponse {
  id: string;
  tenantId: string;
  provider: StorageProvider;
  status: StorageConnectionStatus;
  r2?: ICloudflareR2StorageConfig;
  s3?: IAmazonS3StorageConfig;
  cloudinary?: ICloudinaryStorageConfig;
  isEnabled: boolean;
  lastTestedAt?: Date | string | null;
  lastConnectedAt?: Date | string | null;
  lastError?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IStorageTestResult {
  success: boolean;
  provider: StorageProvider;
  message: string;
  testedAt: string;
}

export interface IUpdateOrganizationStoragePayload {
  provider: StorageProvider;
  r2?: {
    accountId?: string;
    endpoint?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
  };
  s3?: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
  };
  cloudinary?: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
    folderPrefix?: string;
  };
  isEnabled?: boolean;
}

// Organization Branding & White-Label Website Models & Types (STEP 4C)
export interface IBrandColorConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
}

export interface IBrandingLoginPageConfig {
  showLogo: boolean;
  headline?: string;
  description?: string;
  backgroundImageMediaId?: string;
  backgroundImageUrl?: string;
}

export interface IBrandingBrowserConfig {
  title?: string;
  faviconMediaId?: string;
  faviconUrl?: string;
}

export interface IBrandingSocialConfig {
  ogImageMediaId?: string;
  ogImageUrl?: string;
  twitterImageMediaId?: string;
  twitterImageUrl?: string;
}

export interface IOrganizationBranding {
  id?: string;
  tenantId?: string;
  logoMediaId?: string;
  logoUrl?: string;
  faviconMediaId?: string;
  faviconUrl?: string;
  organizationName?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontFamily?: string;
  loginPage: IBrandingLoginPageConfig;
  browser: IBrandingBrowserConfig;
  social: IBrandingSocialConfig;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type WebsiteStatus = 'DRAFT' | 'PUBLISHED';
export type BorderRadiusOption = 'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE';

export interface IWebsiteBranding {
  logoMediaId?: string;
  logoUrl?: string;
  faviconMediaId?: string;
  faviconUrl?: string;
  organizationName: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: BorderRadiusOption;
}

export interface IWebsiteHeroButton {
  enabled: boolean;
  label?: string;
  href?: string;
}

export interface IWebsiteHero {
  enabled: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  backgroundMediaId?: string;
  backgroundUrl?: string;
  primaryButton: IWebsiteHeroButton;
  secondaryButton: IWebsiteHeroButton;
}

export interface IWebsiteHomepage {
  showFeaturedCourses: boolean;
  featuredCourseIds: string[];
  showCategories: boolean;
  showAbout: boolean;
  showTestimonials: boolean;
  showContact: boolean;
}

export interface IWebsiteAbout {
  title?: string;
  description?: string;
  imageMediaId?: string;
  imageUrl?: string;
}

export interface IWebsiteContact {
  email?: string;
  phone?: string;
  address?: string;
}

export interface IWebsiteSocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
}

export interface IWebsiteFooter {
  description?: string;
  copyrightText?: string;
}

export interface IWebsiteSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImageMediaId?: string;
  ogImageUrl?: string;
}

export interface IWebsiteNavigationLink {
  label: string;
  href: string;
  external?: boolean;
}

export type ICustomNavLink = IWebsiteNavigationLink;

export interface IWebsiteNavigation {
  links: IWebsiteNavigationLink[];
}

export interface IOrganizationWebsite {
  id?: string;
  tenantId?: string;
  status: WebsiteStatus;
  branding: IWebsiteBranding;
  hero: IWebsiteHero;
  homepage: IWebsiteHomepage;
  about: IWebsiteAbout;
  contact: IWebsiteContact;
  socialLinks: IWebsiteSocialLinks;
  footer: IWebsiteFooter;
  seo: IWebsiteSeo;
  navigation: IWebsiteNavigation;
  publishedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IUpdateWebsiteBrandingPayload {
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  organizationName?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: BorderRadiusOption;
}

export interface IUpdateWebsiteHeroPayload {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  backgroundMediaId?: string | null;
  primaryButton?: Partial<IWebsiteHeroButton>;
  secondaryButton?: Partial<IWebsiteHeroButton>;
}

export interface IUpdateWebsiteHomepagePayload {
  showFeaturedCourses?: boolean;
  featuredCourseIds?: string[];
  showCategories?: boolean;
  showAbout?: boolean;
  showTestimonials?: boolean;
  showContact?: boolean;
}

export interface IUpdateWebsiteAboutPayload {
  title?: string;
  description?: string;
  imageMediaId?: string | null;
}

export interface IUpdateWebsiteContactPayload {
  email?: string;
  phone?: string;
  address?: string;
}

export interface IUpdateWebsiteSocialPayload {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
}

export interface IUpdateWebsiteFooterPayload {
  description?: string;
  copyrightText?: string;
}

export interface IUpdateWebsiteSeoPayload {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImageMediaId?: string | null;
}

export interface IUpdateWebsiteNavigationPayload {
  links?: IWebsiteNavigationLink[];
}

export interface IUpdateOrganizationBrandingPayload {
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  organizationName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontFamily?: string;
  loginPage?: Partial<IBrandingLoginPageConfig>;
  browser?: Partial<IBrandingBrowserConfig>;
  social?: Partial<IBrandingSocialConfig>;
}

export interface IUpdateOrganizationWebsitePayload {
  enabled?: boolean;
  status?: WebsiteStatus;
  branding?: Partial<IWebsiteBranding>;
  hero?: Partial<IWebsiteHero>;
  homepage?: Partial<IWebsiteHomepage>;
  about?: Partial<IWebsiteAbout>;
  contact?: Partial<IWebsiteContact>;
  socialLinks?: Partial<IWebsiteSocialLinks>;
  footer?: Partial<IWebsiteFooter>;
  seo?: Partial<IWebsiteSeo>;
  navigation?: Partial<IWebsiteNavigation>;
}

export interface IPublicTenantBranding {
  organizationName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontFamily: string;
  loginPage: {
    showLogo: boolean;
    headline?: string;
    description?: string;
    backgroundImageUrl?: string;
  };
  browser: {
    title?: string;
    faviconUrl?: string;
  };
  social: {
    ogImageUrl?: string;
    twitterImageUrl?: string;
  };
}

export interface IPublicWebsiteConfig {
  status: WebsiteStatus;
  branding: IWebsiteBranding;
  hero: IWebsiteHero;
  homepage: {
    showFeaturedCourses: boolean;
    featuredCourses: any[];
    showCategories: boolean;
    showAbout: boolean;
    showTestimonials: boolean;
    showContact: boolean;
  };
  about: IWebsiteAbout;
  contact: IWebsiteContact;
  socialLinks: IWebsiteSocialLinks;
  footer: IWebsiteFooter;
  seo: IWebsiteSeo;
  navigation: IWebsiteNavigation;
  publishedAt?: Date | string;
}

// Organization Team & User Management Models & Types (STEP 4F)
export type OrganizationMemberRole = 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type OrganizationMemberStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
export type OrganizationInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface IOrganizationMemberUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status?: string;
  lastLoginAt?: Date | string | null;
}

export interface IEmployeePersonalDetails {
  dob?: Date | string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  alternatePhone?: string;
  emergencyContact?: {
    name?: string;
    relation?: string;
    phone?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface IEmployeeAcademicDetails {
  highestQualification?: string;
  skills?: string[];
  experienceYears?: number;
  bio?: string;
  linkedinUrl?: string;
}

export interface IEmployeeKycDetails {
  aadhaarNumber?: string;
  panNumber?: string;
  resumeUrl?: string;
}

export interface IEmployeeBankDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface IEmployeeDetails {
  employeeId?: string;
  designation?: string;
  department?: string;
  branch?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'VISITING' | 'INTERN';
  dateOfJoining?: Date | string;
  workMode?: 'ON_SITE' | 'REMOTE' | 'HYBRID';
  personal?: IEmployeePersonalDetails;
  academic?: IEmployeeAcademicDetails;
  kyc?: IEmployeeKycDetails;
  bank?: IEmployeeBankDetails;
}

export interface IOrganizationMember {
  id: string;
  tenantId: string;
  userId: string;
  user?: IOrganizationMemberUser;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  employeeDetails?: IEmployeeDetails;
  joinedAt: Date | string;
  invitedAt?: Date | string | null;
  invitedBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IOrganizationInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: OrganizationMemberRole;
  tokenHash?: string;
  expiresAt: Date | string;
  invitedBy: string;
  status: OrganizationInvitationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InviteMemberPayload {
  email: string;
  role: OrganizationMemberRole;
}

export interface CreateEmployeeMemberPayload {
  name: string;
  email: string;
  phone?: string;
  role: OrganizationMemberRole;
  employeeId?: string;
  designation?: string;
  department?: string;
  branch?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'VISITING' | 'INTERN';
  dateOfJoining?: Date | string;
  workMode?: 'ON_SITE' | 'REMOTE' | 'HYBRID';
  password?: string;
  personal?: IEmployeePersonalDetails;
  academic?: IEmployeeAcademicDetails;
  kyc?: IEmployeeKycDetails;
  bank?: IEmployeeBankDetails;
}

export interface UpdateEmployeeMemberPayload {
  name?: string;
  phone?: string;
  role?: OrganizationMemberRole;
  status?: OrganizationMemberStatus;
  employeeDetails?: IEmployeeDetails;
}

export interface UpdateMemberRolePayload {
  role: OrganizationMemberRole;
}

export interface UpdateMemberStatusPayload {
  status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
}

export interface TeamQueryFilter {
  search?: string;
  role?: OrganizationMemberRole | 'ALL';
  status?: OrganizationMemberStatus | 'ALL';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeamSummaryStats {
  totalMembers: number;
  adminsCount: number;
  instructorsCount: number;
  studentsCount: number;
  pendingInvitationsCount: number;
  suspendedCount: number;
}

// Organization Email & Notification Configuration Types (STEP 4G)
export type EmailProviderType = 'RESEND' | 'BREVO' | 'SMTP';
export type EmailConfigStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'VERIFIED' | 'ERROR';

export interface ISafeResendConfig {
  hasApiKey: boolean;
}

export interface ISafeBrevoConfig {
  hasApiKey: boolean;
}

export interface ISafeSmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  hasUsername: boolean;
  hasPassword: boolean;
}

export interface SafeOrganizationEmailSettings {
  id?: string;
  tenantId: string;
  provider: EmailProviderType;
  status: EmailConfigStatus;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  resend?: ISafeResendConfig;
  brevo?: ISafeBrevoConfig;
  smtp?: ISafeSmtpConfig;
  lastVerifiedAt?: Date | string | null;
  lastError?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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

export interface UpdateResendEmailConfigPayload {
  apiKey?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface UpdateBrevoEmailConfigPayload {
  apiKey?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface UpdateSmtpEmailConfigPayload {
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface UpdateOrganizationEmailPayload {
  provider: EmailProviderType;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  resend?: UpdateResendEmailConfigPayload;
  brevo?: UpdateBrevoEmailConfigPayload;
  smtp?: UpdateSmtpEmailConfigPayload;
}

export interface TestEmailPayload {
  recipientEmail: string;
}

// Organization Domain & White-label Foundation Types (STEP 4H)
export type DomainStatus = 'NOT_CONFIGURED' | 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
export type VerificationMethod = 'CNAME' | 'TXT';

export interface IDnsVerificationRecord {
  type: VerificationMethod;
  name: string;
  value: string;
  ttl?: string;
}

export interface IOrganizationDomain {
  id?: string;
  tenantId: string;
  platformSubdomain: string;
  customDomain?: string;
  status: DomainStatus;
  verificationToken: string;
  verificationMethod: VerificationMethod;
  verificationRecord?: IDnsVerificationRecord;
  verifiedAt?: Date | string | null;
  lastCheckedAt?: Date | string | null;
  lastError?: string | null;
  isPrimary: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type SafeOrganizationDomain = IOrganizationDomain;

export interface IWhiteLabelConfig {
  hidePlatformBranding: boolean;
  useCustomLogo: boolean;
  useCustomFavicon: boolean;
  useCustomColors: boolean;
  customSupportEmail?: string;
  publicPoweredByEnabled: boolean;
}

export interface ConfigureDomainPayload {
  customDomain: string;
}

export interface UpdateWhiteLabelPayload {
  hidePlatformBranding?: boolean;
  useCustomLogo?: boolean;
  useCustomFavicon?: boolean;
  useCustomColors?: boolean;
  customSupportEmail?: string;
  publicPoweredByEnabled?: boolean;
}

// Organization Onboarding Wizard Types (STEP 4I)
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SKIPPED' | 'COMPLETED';
export type OnboardingStepKey =
  | 'welcome'
  | 'profile'
  | 'branding'
  | 'storage'
  | 'email'
  | 'domain'
  | 'team'
  | 'course'
  | 'launch';

export interface IOrganizationOnboarding {
  status: OnboardingStatus;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  lastVisitedAt?: Date | string | null;
}

export interface IOnboardingStepDetail {
  key: OnboardingStepKey;
  stepIndex: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isSkipped: boolean;
  isRequired: boolean;
  actionUrl?: string;
}

export interface IOnboardingProgressResponse {
  status: OnboardingStatus;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  completionPercentage: number;
  canLaunch: boolean;
  steps: IOnboardingStepDetail[];
}

export interface UpdateOnboardingProgressPayload {
  currentStep?: number;
  completedSteps?: string[];
  skippedSteps?: string[];
}

// Organization Launch Readiness & Tenant Provisioning Types (STEP 4J)
export type OrganizationLifecycleStatus = 'SETUP' | 'READY' | 'LIVE' | 'SUSPENDED';
export type LaunchReadinessStatus = 'NOT_READY' | 'READY' | 'LIVE';
export type LaunchCheckStatus = 'READY' | 'PENDING' | 'OPTIONAL' | 'ERROR';

export interface ILaunchCheckItem {
  key: string;
  label: string;
  description: string;
  status: LaunchCheckStatus;
  required: boolean;
  completed: boolean;
  actionUrl: string;
}

export interface ILaunchBlockerItem {
  key: string;
  label: string;
  reason: string;
  actionUrl: string;
}

export interface ILaunchWarningItem {
  key: string;
  label: string;
  reason: string;
  actionUrl: string;
}

export interface IOrganizationLaunchReadinessResponse {
  organizationStatus: OrganizationLifecycleStatus;
  readinessStatus: LaunchReadinessStatus;
  completionPercentage: number;
  requiredCompleted: number;
  requiredTotal: number;
  canLaunch: boolean;
  checks: ILaunchCheckItem[];
  blockers: ILaunchBlockerItem[];
  warnings: ILaunchWarningItem[];
  lastEvaluatedAt: string;
}

export interface IOrganizationLaunchResponse {
  alreadyLive?: boolean;
  organizationStatus: OrganizationLifecycleStatus;
  launchedAt?: Date | string | null;
  launchedBy?: string | null;
  completionPercentage?: number;
}

// Batches & Class Management Models & Types
export type BatchMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';
export type BatchStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface IBatchClassroomDetails {
  branch?: string;
  roomNumber?: string;
  venueAddress?: string;
  contactPhone?: string;
}

export interface IBatchZoomDetails {
  meetingUrl?: string;
  meetingId?: string;
  passcode?: string;
  hostUrl?: string;
  instructions?: string;
}

export interface IBatchTiming {
  startTime: string;
  endTime: string;
  timezone?: string;
}

export interface IBatchCourseInfo {
  id: string;
  title: string;
  slug?: string;
  thumbnailUrl?: string;
}

export interface IBatchInstructorInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  designation?: string;
}

export interface IBatch {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  batchCode: string;
  courseId?: string;
  course?: IBatchCourseInfo;
  instructorId?: string;
  instructor?: IBatchInstructorInfo;
  mode: BatchMode;
  status: BatchStatus;
  startDate: Date | string;
  endDate?: Date | string;
  timing: IBatchTiming;
  daysOfWeek: string[];
  maxSeats: number;
  enrolledCount: number;
  showOnWebsite: boolean;
  classroomDetails?: IBatchClassroomDetails;
  zoomDetails?: IBatchZoomDetails;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBatchPayload {
  name: string;
  branchId: string;
  batchCode?: string;
  courseId?: string;
  instructorId?: string;
  mode: BatchMode;
  status?: BatchStatus;
  startDate: Date | string;
  endDate?: Date | string;
  timing: IBatchTiming;
  daysOfWeek: string[];
  maxSeats?: number;
  showOnWebsite?: boolean;
  classroomDetails?: IBatchClassroomDetails;
  zoomDetails?: IBatchZoomDetails;
  notes?: string;
}

export interface UpdateBatchPayload {
  name?: string;
  branchId?: string;
  batchCode?: string;
  courseId?: string;
  instructorId?: string;
  mode?: BatchMode;
  status?: BatchStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  timing?: IBatchTiming;
  daysOfWeek?: string[];
  maxSeats?: number;
  showOnWebsite?: boolean;
  classroomDetails?: IBatchClassroomDetails;
  zoomDetails?: IBatchZoomDetails;
  notes?: string;
}

export interface BatchQueryFilter {
  search?: string;
  courseId?: string;
  mode?: BatchMode | 'ALL';
  status?: BatchStatus | 'ALL';
  showOnWebsite?: boolean;
  page?: number;
  limit?: number;
}

// ==========================================
// CLASS DOMAIN MODELS & TYPES
// ==========================================

export type ClassMode = 'ONLINE' | 'OFFLINE' | 'HYBRID';

export type ClassStatus = 'SCHEDULED' | 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';

export interface IClassEnrolledStudent {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  enrolledAt: Date | string;
  status: 'ENROLLED' | 'CANCELLED';
}

export interface IClassZoomDetails {
  meetingUrl: string;
  meetingId?: string;
  passcode?: string;
  hostUrl?: string;
  instructions?: string;
  autoRecord?: boolean;
}

export interface IClassClassroomDetails {
  branch: string;
  roomNumber: string;
  floor?: string;
  venueAddress: string;
  centerContact?: string;
  facilities?: string[];
}

export interface IClassTiming {
  startTime: string; // e.g. "10:00 AM"
  endTime: string;   // e.g. "12:00 PM"
  timezone: string;  // e.g. "Asia/Kolkata"
}

export interface IClass {
  id: string;
  tenantId: string;
  name: string;
  classCode: string;
  courseId?: string;
  course?: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl?: string;
  };
  batchId?: string;
  batch?: {
    id: string;
    name: string;
    batchCode: string;
  };
  mode: ClassMode;
  capacity: number; // Strict seat cap
  enrolledCount: number;
  enrolledStudents?: IClassEnrolledStudent[];
  status: ClassStatus;
  startDate: Date | string;
  endDate?: Date | string;
  timing: IClassTiming;
  daysOfWeek: string[];
  showOnWebsite: boolean;
  zoomDetails?: IClassZoomDetails;
  classroomDetails?: IClassClassroomDetails;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateClassPayload {
  name: string;
  classCode?: string;
  courseId?: string;
  batchId?: string;
  mode: ClassMode;
  capacity: number; // Required strict seat limit
  status?: ClassStatus;
  startDate: Date | string;
  endDate?: Date | string;
  timing: IClassTiming;
  daysOfWeek: string[];
  showOnWebsite?: boolean;
  zoomDetails?: IClassZoomDetails;
  classroomDetails?: IClassClassroomDetails;
  notes?: string;
}

export interface UpdateClassPayload {
  name?: string;
  classCode?: string;
  courseId?: string;
  batchId?: string;
  mode?: ClassMode;
  capacity?: number;
  status?: ClassStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  timing?: IClassTiming;
  daysOfWeek?: string[];
  showOnWebsite?: boolean;
  zoomDetails?: IClassZoomDetails;
  classroomDetails?: IClassClassroomDetails;
  notes?: string;
}

export interface EnrollStudentInClassPayload {
  studentId: string;
}

export interface ClassQueryFilter {
  search?: string;
  courseId?: string;
  batchId?: string;
  mode?: ClassMode | 'ALL';
  status?: ClassStatus | 'ALL';
  isFull?: boolean;
  showOnWebsite?: boolean;
  page?: number;
  limit?: number;
}

// ==========================================
// PHASE 9: STUDENT LEARNING EXPERIENCE TYPES
// ==========================================

export interface IStudentDashboardStats {
  totalEnrolledCourses: number;
  inProgressCourses: number;
  completedCourses: number;
  completedLessons: number;
  totalLessons: number;
  overallProgressPercent: number;
}

export interface IStudentResumableLessonDTO {
  id: string;
  title: string;
  type: LessonType;
  moduleId: string;
  moduleTitle: string;
  estimatedDurationMinutes: number;
  lastPositionSeconds: number;
  status: LessonProgressStatus;
}

export interface IStudentCourseResumeInfo {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  thumbnailUrl?: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
  resumableLesson: IStudentResumableLessonDTO | null;
}

export interface IStudentUpcomingClassDTO {
  id: string;
  name: string;
  classCode: string;
  courseTitle: string;
  batchName?: string;
  mode: ClassMode;
  status: ClassStatus;
  startDate: Date | string;
  timing: IClassTiming;
  meetingUrl?: string;
  venueAddress?: string;
  branch?: string;
}

export interface IStudentPendingAssessmentDTO {
  id: string;
  title: string;
  slug: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  courseTitle?: string;
  durationMinutes?: number;
  passingScorePercent?: number;
  attemptCount: number;
  maxAttempts: number;
  latestScore?: number;
  dueDate?: Date | string;
}

export interface IStudentRecentSubmissionDTO {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  attemptNumber: number;
  score: number;
  maxScore: number;
  scorePercentage: number;
  passed?: boolean;
  status: 'SUBMITTED' | 'IN_REVIEW' | 'GRADED';
  feedback?: string;
  submittedAt: Date | string;
}

export interface IStudentDashboardSummary {
  stats: IStudentDashboardStats;
  continueLearning: IStudentCourseResumeInfo | null;
  upcomingClasses: IStudentUpcomingClassDTO[];
  pendingAssessments: IStudentPendingAssessmentDTO[];
  recentResults: IStudentRecentSubmissionDTO[];
}

export interface IStudentCurriculumLessonDTO {
  id: string;
  title: string;
  description: string;
  type: LessonType;
  order: number;
  estimatedDurationMinutes: number;
  isPreview: boolean;
  status: LessonProgressStatus;
  isCompleted: boolean;
  lastPositionSeconds: number;
}

export interface IStudentCurriculumModuleDTO {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: IStudentCurriculumLessonDTO[];
}

export interface IStudentCourseDetailDTO {
  course: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string;
    thumbnailUrl?: string;
    level: CourseLevel;
    language: string;
    durationMinutes: number;
    status: CourseStatus;
  };
  enrollment: {
    id: string;
    status: EnrollmentStatus;
    enrolledAt: Date | string;
    completedAt?: Date | string | null;
    lastAccessedAt?: Date | string | null;
    lastLessonId?: string | null;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
  };
  modules: IStudentCurriculumModuleDTO[];
  assessments: Array<{
    id: string;
    title: string;
    slug: string;
    type: 'QUIZ' | 'ASSIGNMENT';
    durationMinutes?: number;
    passingScorePercent?: number;
    maxAttempts?: number;
  }>;
}

export interface IStudentLessonPlayerDTO {
  course: {
    id: string;
    title: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
  };
  lesson: {
    id: string;
    moduleId: string;
    title: string;
    description: string;
    type: LessonType;
    content: ILessonContent;
    estimatedDurationMinutes: number;
    isPreview: boolean;
    status: LessonProgressStatus;
    isCompleted: boolean;
    lastPositionSeconds: number;
  };
  navigation: {
    prevLessonId: string | null;
    nextLessonId: string | null;
    hasPrev: boolean;
    hasNext: boolean;
  };
  curriculum: IStudentCurriculumModuleDTO[];
}

// ==========================================
// PHASE 10: CRM & ADMISSIONS ENGINE TYPES
// ==========================================

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

export type LeadActivityType =
  | 'LEAD_CREATED'
  | 'NOTE_ADDED'
  | 'CALL'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'FOLLOW_UP_CREATED'
  | 'FOLLOW_UP_COMPLETED'
  | 'STAGE_CHANGED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'DEMO_SCHEDULED'
  | 'APPLICATION_STARTED'
  | 'ADMISSION_CREATED'
  | 'CONVERTED'
  | 'LOST'
  | 'REOPENED';

export type FollowUpType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'DEMO' | 'COUNSELLING' | 'GENERAL';
export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type FollowUpOutcome =
  | 'CONNECTED'
  | 'NO_ANSWER'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALLBACK_REQUESTED'
  | 'DEMO_BOOKED'
  | 'FEES_DISCUSSION'
  | 'CONVERTED'
  | 'OTHER';

export type AdmissionStatus =
  | 'DRAFT'
  | 'APPLICATION_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'ADMITTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ILead {
  id: string;
  tenantId: string;
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
  courseInterestId?: string;
  courseInterest?: {
    id: string;
    title: string;
    slug?: string;
  };
  batchInterestId?: string;
  batchInterest?: {
    id: string;
    name: string;
  };
  preferredMode?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  branchId?: string;
  stage: LeadStage;
  assignedTo?: string;
  counsellor?: {
    id: string;
    name: string;
    email: string;
  };
  assignedAt?: Date | string;
  assignedBy?: string;
  lostAt?: Date | string;
  lostReason?: LostReason;
  lostReasonDetail?: string;
  admissionId?: string;
  studentUserId?: string;
  convertedAt?: Date | string;
  lastInquiryAt?: Date | string;
  nextFollowUp?: ILeadFollowUp;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ILeadActivity {
  id: string;
  tenantId: string;
  leadId: string;
  type: LeadActivityType;
  title: string;
  note?: string;
  metadata?: Record<string, any>;
  actorId?: string;
  actorName?: string;
  createdAt: Date | string;
}

export interface ILeadFollowUp {
  id: string;
  tenantId: string;
  leadId: string;
  lead?: {
    id: string;
    fullName: string;
    phone: string;
    stage: LeadStage;
  };
  assignedTo: string;
  counsellor?: {
    id: string;
    name: string;
  };
  type: FollowUpType;
  dueAt: Date | string;
  note?: string;
  status: FollowUpStatus;
  completedAt?: Date | string;
  completedBy?: string;
  outcome?: FollowUpOutcome;
  outcomeNote?: string;
  createdAt: Date | string;
  isOverdue?: boolean;
}

export interface IAdmission {
  id: string;
  tenantId: string;
  admissionNumber?: string;
  leadId: string;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
    dob?: Date | string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    guardianName?: string;
    guardianPhone?: string;
  };
  courseId: string;
  course?: {
    id: string;
    title: string;
  };
  batchId?: string;
  batch?: {
    id: string;
    name: string;
  };
  branchId?: string;
  assignedCounsellor?: string;
  counsellor?: {
    id: string;
    name: string;
  };
  status: AdmissionStatus;
  applicationDate: Date | string;
  approvedAt?: Date | string;
  approvedBy?: string;
  admittedAt?: Date | string;
  admittedBy?: string;
  studentUserId?: string;
  enrollmentId?: string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateLeadPayload {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  source?: LeadSource;
  sourceDetail?: string;
  campaign?: string;
  medium?: string;
  referralName?: string;
  courseInterestId?: string;
  batchInterestId?: string;
  preferredMode?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  branchId?: string;
  stage?: LeadStage;
  assignedTo?: string;
  initialNote?: string;
}

export interface UpdateLeadPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  source?: LeadSource;
  sourceDetail?: string;
  campaign?: string;
  medium?: string;
  referralName?: string;
  courseInterestId?: string;
  batchInterestId?: string;
  preferredMode?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  branchId?: string;
}

export interface ChangeLeadStagePayload {
  stage: LeadStage;
  lostReason?: LostReason;
  lostReasonDetail?: string;
  note?: string;
}

export interface AssignLeadPayload {
  assignedTo: string;
  note?: string;
}

export interface AddLeadNotePayload {
  title?: string;
  note: string;
  type?: LeadActivityType;
}

export interface ScheduleFollowUpPayload {
  assignedTo?: string;
  type?: FollowUpType;
  dueAt: Date | string;
  note?: string;
}

export interface CompleteFollowUpPayload {
  outcome?: FollowUpOutcome;
  outcomeNote?: string;
  scheduleNextDueAt?: Date | string;
  scheduleNextNote?: string;
}

export interface CreateAdmissionPayload {
  applicant?: {
    fullName?: string;
    email?: string;
    phone?: string;
    dob?: Date | string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
    guardianName?: string;
    guardianPhone?: string;
  };
  courseId: string;
  batchId?: string;
  branchId?: string;
  assignedCounsellor?: string;
  notes?: string;
}

export interface ConvertAdmissionPayload {
  batchId?: string;
  sendWelcomeEmail?: boolean;
}

export interface LeadFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  stage?: LeadStage | 'ALL';
  source?: LeadSource | 'ALL';
  assignedTo?: string;
  branchId?: string;
  courseId?: string;
  isMyLeads?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FollowUpFilterQuery {
  page?: number;
  limit?: number;
  assignedTo?: string;
  status?: FollowUpStatus | 'ALL';
  isOverdue?: boolean;
  dueToday?: boolean;
  type?: FollowUpType;
}

export interface AdmissionFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdmissionStatus | 'ALL';
  courseId?: string;
  batchId?: string;
  branchId?: string;
  assignedCounsellor?: string;
}

export interface CRMDashboardSummary {
  stats: {
    totalLeads: number;
    newLeads: number;
    contactedLeads: number;
    qualifiedLeads: number;
    followUpsPending: number;
    followUpsOverdue: number;
    followUpsToday: number;
    admissionsInProgress: number;
    convertedStudents: number;
    lostLeads: number;
  };
  pipelineCounts: Record<LeadStage, number>;
  sourceBreakdown: Array<{ source: LeadSource; count: number }>;
  recentLeads: ILead[];
  todaysFollowUps: ILeadFollowUp[];
}

export interface PublicLeadInquiryPayload {
  fullName: string;
  email?: string;
  phone: string;
  courseInterestId?: string;
  branchId?: string;
  city?: string;
  source?: LeadSource;
  sourceDetail?: string;
  campaign?: string;
  medium?: string;
  message?: string;
}

// ==========================================
// PHASE 11: FEES, PAYMENTS & FINANCE TYPES
// ==========================================

export type FeeComponentType = 'TUITION' | 'ADMISSION' | 'EXAMINATION' | 'REGISTRATION' | 'MATERIAL' | 'LIBRARY' | 'OTHER';
export type DiscountType = 'FLAT' | 'PERCENTAGE' | 'SCHOLARSHIP' | 'PROMOTIONAL';
export type InstallmentStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type FeePlanStatus = 'DRAFT' | 'ACTIVE' | 'FULLY_PAID' | 'DEFAULTED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE' | 'ONLINE_GATEWAY' | 'OTHER';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'REVERSED';
export type LedgerEntryType = 'CHARGE' | 'PAYMENT' | 'DISCOUNT' | 'SCHOLARSHIP' | 'REFUND' | 'ADJUSTMENT' | 'REVERSAL';
export type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED';
export type PaymentGatewayType = 'RAZORPAY' | 'STRIPE' | 'MANUAL';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type AttendanceSource = 'MANUAL' | 'SYSTEM' | 'IMPORT' | 'QR' | 'RFID' | 'BIOMETRIC';
export type AttendanceSessionStatus = 'OPEN' | 'FINALIZED';
export interface AttendanceRecordDTO { id: string; studentId: string; studentName?: string; studentEmail?: string; status?: AttendanceStatus; source: AttendanceSource; remarks?: string; lateMinutes?: number; markedAt?: Date; correctionCount: number; }
export interface AttendanceRosterDTO { session: { id: string; classId: string; batchId?: string; status: AttendanceSessionStatus; sessionDate: Date; expected: number; marked: number; finalizedAt?: Date }; records: AttendanceRecordDTO[]; counts: { expected: number; marked: number; unmarked: number; present: number; absent: number; late: number; excused: number }; }
export interface AttendanceSummaryDTO { totalFinalizedEligibleSessions: number; attended: number; present: number; absent: number; late: number; excused: number; attendancePercentage: number | null; }

export interface IFeeComponent {
  name: string;
  type: FeeComponentType;
  amountMinor: number;
  isRefundable?: boolean;
}

export interface IInstallmentTemplate {
  sequence: number;
  label: string;
  percentage?: number;
  amountMinor?: number;
  dueDaysAfterAdmission: number;
}

export interface IFeeStructure {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  courseId: string;
  course?: { id: string; title: string };
  batchId?: string;
  branchId?: string;
  currency: string;
  totalAmountMinor: number;
  components: IFeeComponent[];
  installmentTemplates: IInstallmentTemplate[];
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IStudentInstallment {
  id?: string;
  sequence: number;
  label: string;
  dueDate: Date | string;
  amountMinor: number;
  paidAmountMinor: number;
  status: InstallmentStatus;
  paidAt?: Date | string;
  isOverdue?: boolean;
}

export interface IStudentFeePlan {
  id: string;
  tenantId: string;
  studentUserId: string;
  student?: { id: string; name: string; email: string; phone?: string };
  admissionId?: string;
  enrollmentId?: string;
  courseId: string;
  course?: { id: string; title: string };
  batchId?: string;
  batch?: { id: string; name: string };
  branchId?: string;
  feeStructureId?: string;
  currency: string;
  baseAmountMinor: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmountMinor: number;
  discountReason?: string;
  discountApprovedBy?: string;
  discountApprovedAt?: Date | string;
  netPayableMinor: number;
  paidAmountMinor: number;
  outstandingBalanceMinor: number;
  installments: IStudentInstallment[];
  status: FeePlanStatus;
  notes?: string;
  nextDue?: {
    dueDate: Date | string;
    amountMinor: number;
    label: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPaymentAllocation {
  studentFeePlanId: string;
  installmentId?: string;
  amountMinor: number;
}

export interface IPayment {
  id: string;
  tenantId: string;
  paymentNumber: string;
  studentUserId: string;
  student?: { id: string; name: string; email: string; phone?: string };
  studentFeePlanId: string;
  amountMinor: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  receivedAt: Date | string;
  collectedBy?: string;
  collector?: { id: string; name: string };
  verifiedBy?: string;
  verifiedAt?: Date | string;
  gatewayProvider?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  allocations: IPaymentAllocation[];
  receiptId?: string;
  receiptNumber?: string;
  refundedAmountMinor: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IFinancialLedger {
  id: string;
  tenantId: string;
  studentUserId: string;
  studentFeePlanId: string;
  paymentId?: string;
  receiptId?: string;
  refundId?: string;
  entryType: LedgerEntryType;
  description: string;
  amountMinor: number;
  currency: string;
  isDebit: boolean;
  runningBalanceMinor: number;
  actorId?: string;
  actor?: { id: string; name: string };
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

export interface IReceipt {
  id: string;
  tenantId: string;
  receiptNumber: string;
  paymentId: string;
  studentUserId: string;
  studentFeePlanId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  transactionReference?: string;
  issuedAt: Date | string;
  studentSnapshot: {
    fullName: string;
    email?: string;
    phone: string;
    studentId?: string;
  };
  courseSnapshot: {
    courseId: string;
    title: string;
    batchName?: string;
  };
  organizationSnapshot: {
    organizationName: string;
    address?: string;
    taxNumber?: string;
    contactPhone?: string;
    contactEmail?: string;
  };
  status: 'ISSUED' | 'CANCELLED';
  notes?: string;
  issuedBy?: string;
  createdAt: Date | string;
}

export interface IRefund {
  id: string;
  tenantId: string;
  refundNumber: string;
  paymentId: string;
  paymentNumber?: string;
  studentUserId: string;
  studentFeePlanId: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  gatewayProvider?: string;
  gatewayRefundId?: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date | string;
  processedAt?: Date | string;
  failureReason?: string;
  createdAt: Date | string;
}

export interface IPaymentGatewayConfig {
  provider: PaymentGatewayType;
  isEnabled: boolean;
  isLiveMode: boolean;
  razorpay?: {
    keyId: string;
    isKeySecretConfigured: boolean;
    isWebhookSecretConfigured: boolean;
  };
  stripe?: {
    publishableKey: string;
    isSecretKeyConfigured: boolean;
    isWebhookSecretConfigured: boolean;
  };
}

// Payloads & Query Filters
export interface CreateFeeStructurePayload {
  name: string;
  code?: string;
  courseId: string;
  batchId?: string;
  branchId?: string;
  currency?: string;
  components: IFeeComponent[];
  installmentTemplates?: IInstallmentTemplate[];
}

export interface UpdateFeeStructurePayload {
  name?: string;
  code?: string;
  currency?: string;
  components?: IFeeComponent[];
  installmentTemplates?: IInstallmentTemplate[];
  status?: 'ACTIVE' | 'ARCHIVED';
}

export interface CreateStudentFeePlanPayload {
  studentUserId: string;
  admissionId?: string;
  enrollmentId?: string;
  courseId: string;
  batchId?: string;
  branchId?: string;
  feeStructureId?: string;
  currency?: string;
  baseAmountMinor: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountReason?: string;
  installments?: Array<{
    sequence: number;
    label: string;
    dueDate: Date | string;
    amountMinor: number;
  }>;
  notes?: string;
}

export interface RecordManualPaymentPayload {
  studentFeePlanId: string;
  amountMinor: number;
  method: PaymentMethod;
  transactionReference?: string;
  receivedAt?: Date | string;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateOnlineOrderPayload {
  studentFeePlanId: string;
  installmentId?: string;
  amountMinor?: number; // Optional; defaults to outstanding installment or plan amount
  idempotencyKey?: string;
}

export interface VerifyOnlinePaymentPayload {
  paymentId: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  gatewaySignature: string;
}

export interface RequestRefundPayload {
  paymentId: string;
  amountMinor: number;
  reason: string;
}

export interface FinanceDashboardSummary {
  stats: {
    totalCollectedMinor: number;
    totalOutstandingMinor: number;
    totalOverdueMinor: number;
    collectedTodayMinor: number;
    onlineCollectionsMinor: number;
    offlineCollectionsMinor: number;
    totalRefundedMinor: number;
    activePlansCount: number;
    fullyPaidPlansCount: number;
  };
  recentPayments: IPayment[];
  upcomingDues: Array<{
    studentFeePlanId: string;
    studentName: string;
    studentPhone: string;
    courseTitle: string;
    dueDate: Date | string;
    amountMinor: number;
    installmentLabel: string;
    isOverdue: boolean;
  }>;
  monthlyTrends: Array<{
    month: string;
    collectedMinor: number;
  }>;
}

export interface FeePlanFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: FeePlanStatus | 'ALL';
  courseId?: string;
  branchId?: string;
  hasOutstanding?: boolean;
}

export interface PaymentFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentStatus | 'ALL';
  method?: PaymentMethod | 'ALL';
  studentUserId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DueFilterQuery {
  page?: number;
  limit?: number;
  filterType?: 'ALL' | 'TODAY' | 'OVERDUE' | 'THIS_WEEK' | 'UPCOMING';
  courseId?: string;
  branchId?: string;
}

// ==========================================
// PHASE 19: ANALYTICS & REPORTING TYPES
// ==========================================

export type AnalyticsGranularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type AnalyticsComparisonType = 'PREVIOUS_PERIOD' | 'NONE';

export interface MetricValueChange {
  current: number;
  previous?: number;
  delta?: number;
  percentageChange?: number | null;
}

export interface AnalyticsTimeSeriesPoint {
  bucket: string; // ISO date / period key, e.g. "2026-10-01"
  label: string;
  value: number;
  count?: number;
}

export interface AnalyticsDimensionBreakdown {
  id: string;
  name: string;
  code?: string;
  value: number;
  count?: number;
  percentage?: number;
}

export interface AnalyticsDateRangeFilter {
  from: string | Date;
  to: string | Date;
  timezone?: string;
  granularity?: AnalyticsGranularity;
  branchId?: string;
  courseId?: string;
  batchId?: string;
  instructorId?: string;
}

export interface ExecutiveDashboardResponse {
  timezone: string;
  period: { from: string; to: string; previousFrom?: string; previousTo?: string };
  scope: { mode: 'ALL' | 'SELECTED'; branchIds: string[]; branchName?: string };
  students?: {
    activeTotal: number;
    newlyAdmitted: MetricValueChange;
    onHold: number;
    completed: number;
    trend: AnalyticsTimeSeriesPoint[];
  };
  crm?: {
    leadsCreated: MetricValueChange;
    leadsConverted: MetricValueChange;
    conversionRate: number; // percentage
    overdueFollowUps: number;
    funnel: Array<{ stage: string; count: number; conversionRate?: number }>;
  };
  finance?: {
    collectedMinor: MetricValueChange;
    outstandingMinor: number;
    overdueMinor: number;
    refundedMinor: number;
    netCollectionsMinor: number;
    currency: string;
    trend: AnalyticsTimeSeriesPoint[];
  };
  attendance?: {
    overallPercentage: number | null;
    totalExpected: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    trend: AnalyticsTimeSeriesPoint[];
  };
  academics?: {
    scheduledClasses: number;
    completedClasses: number;
    cancelledClasses: number;
    rescheduledClasses: number;
    activeBatchesCount: number;
  };
  learning?: {
    activeEnrollments: number;
    courseCompletionRate: number;
    lessonCompletions: number;
    averageAssessmentScore: number | null;
  };
  instructors?: {
    totalActiveInstructors: number;
    totalTeachingHours: number;
    pendingAttendanceClasses: number;
    pendingGradingSubmissions: number;
  };
}

export interface StudentsAnalyticsResponse {
  period: { from: string; to: string };
  activeStudents: number;
  newlyAdmitted: MetricValueChange;
  onHold: number;
  withdrawn: number;
  dropped: number;
  completed: number;
  branchDistribution: AnalyticsDimensionBreakdown[];
  courseDistribution: AnalyticsDimensionBreakdown[];
  batchDistribution: AnalyticsDimensionBreakdown[];
  lifecycleTrend: AnalyticsTimeSeriesPoint[];
}

export interface CRMAnalyticsResponse {
  period: { from: string; to: string };
  leadsCreated: MetricValueChange;
  admissionsTotal: MetricValueChange;
  conversionRate: number;
  leadsBySource: AnalyticsDimensionBreakdown[];
  leadsByStage: AnalyticsDimensionBreakdown[];
  counsellorDistribution: AnalyticsDimensionBreakdown[];
  overdueFollowUpsCount: number;
  funnel: Array<{ stage: string; count: number; dropOffCount?: number; stageConversionRate?: number }>;
  trend: AnalyticsTimeSeriesPoint[];
}

export interface FinanceAnalyticsResponse {
  period: { from: string; to: string };
  currency: string;
  collectedAmountMinor: MetricValueChange;
  outstandingAmountMinor: number;
  overdueAmountMinor: number;
  refundedAmountMinor: number;
  netCollectionsMinor: number;
  paymentMethodBreakdown: AnalyticsDimensionBreakdown[];
  branchCollections: AnalyticsDimensionBreakdown[];
  courseCollections: AnalyticsDimensionBreakdown[];
  trend: AnalyticsTimeSeriesPoint[];
}

export interface AttendanceAnalyticsResponse {
  period: { from: string; to: string };
  overallPercentage: number | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalFinalizedSessions: number;
  branchBreakdown: AnalyticsDimensionBreakdown[];
  batchBreakdown: AnalyticsDimensionBreakdown[];
  trend: AnalyticsTimeSeriesPoint[];
  lowAttendanceSummary: {
    threshold: number;
    studentsBelowThresholdCount: number;
  };
}

export interface AcademicsAnalyticsResponse {
  period: { from: string; to: string };
  scheduledClasses: number;
  completedClasses: number;
  cancelledClasses: number;
  rescheduledClasses: number;
  activeBatchesCount: number;
  branchClassVolume: AnalyticsDimensionBreakdown[];
  modeBreakdown: AnalyticsDimensionBreakdown[];
  trend: AnalyticsTimeSeriesPoint[];
}

export interface LearningAnalyticsResponse {
  period: { from: string; to: string };
  activeEnrollments: number;
  courseCompletionRate: number;
  totalLessonCompletions: number;
  inactiveStudentsCount: number;
  courseProgressDistribution: Array<{ range: string; count: number; percentage: number }>;
  assessmentMetrics: {
    publishedCount: number;
    submissionsCount: number;
    submissionRate: number;
    gradedCount: number;
    pendingGradingCount: number;
    averageScorePercent: number | null;
  };
  certificatesIssued: number;
  certificatesRevoked: number;
}

export interface InstructorsAnalyticsResponse {
  period: { from: string; to: string };
  activeInstructorsCount: number;
  scheduledWorkloadHours: number;
  completedWorkloadHours: number;
  totalClassesAssigned: number;
  pendingAttendanceCount: number;
  pendingGradingCount: number;
  instructorWorkloadDistribution: AnalyticsDimensionBreakdown[];
}

export interface BranchComparisonResponse {
  period: { from: string; to: string };
  branches: Array<{
    branchId: string;
    branchName: string;
    branchCode: string;
    isPrimary: boolean;
    activeStudents?: number;
    admissions?: number;
    collectionsMinor?: number;
    attendancePercentage?: number | null;
    scheduledClasses?: number;
  }>;
}

export type AnalyticsReportKey =
  | 'STUDENT_ROSTER'
  | 'STUDENT_LIFECYCLE_HISTORY'
  | 'LEAD_ACQUISITION'
  | 'ADMISSION_CONVERSIONS'
  | 'FINANCE_COLLECTIONS'
  | 'FINANCE_AGING_DUES'
  | 'ATTENDANCE_SUMMARY'
  | 'LOW_ATTENDANCE_STUDENTS'
  | 'ACADEMIC_CLASS_SCHEDULE'
  | 'INSTRUCTOR_WORKLOAD';

export interface AnalyticsReportQuery {
  reportKey: AnalyticsReportKey;
  from?: string | Date;
  to?: string | Date;
  timezone?: string;
  branchId?: string;
  courseId?: string;
  batchId?: string;
  instructorId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  threshold?: number;
}

export interface AnalyticsReportResponse<T = any> {
  reportKey: AnalyticsReportKey;
  generatedAt: string;
  timezone: string;
  data: T[];
  summary?: Record<string, any>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AnalyticsExportPayload {
  reportKey: AnalyticsReportKey;
  format: 'CSV';
  from?: string | Date;
  to?: string | Date;
  timezone?: string;
  branchId?: string;
  courseId?: string;
  batchId?: string;
  instructorId?: string;
  status?: string;
  search?: string;
}

export interface IAnalyticsExport {
  id: string;
  tenantId: string;
  requestedBy: string;
  reportKey: AnalyticsReportKey;
  format: 'CSV';
  querySnapshot: Record<string, any>;
  status: 'PENDING' | 'READY' | 'FAILED';
  rowCount?: number;
  downloadUrl?: string;
  failureReason?: string;
  createdAt: Date | string;
  completedAt?: Date | string;
  expiresAt: Date | string;
}

// ==========================================
// PHASE 20: INSTITUTIONAL COMMUNICATION TYPES
// ==========================================

export type CommunicationPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';
export type CommunicationAnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED' | 'ARCHIVED';
export type CommunicationAudienceType =
  | 'ALL_AUTHORIZED'
  | 'BRANCH'
  | 'BATCH'
  | 'COURSE'
  | 'STUDENTS'
  | 'INSTRUCTORS'
  | 'STAFF'
  | 'SPECIFIC_USERS';

export type ConversationType = 'DIRECT' | 'STUDENT_INSTRUCTOR' | 'STUDENT_SUPPORT' | 'STAFF';

export interface ICommunicationAttachment {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export interface ICommunicationAudienceCriteria {
  branchIds?: string[];
  batchIds?: string[];
  courseIds?: string[];
  userIds?: string[];
  roles?: string[];
}

export interface ICommunicationAudienceSnapshot {
  recipientUserIds: string[];
  recipientCount: number;
  resolvedAt: string | Date;
}

export interface ICommunicationDeliverySummary {
  recipientCount: number;
  queuedCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
}

export interface ICommunicationAudiencePreview {
  recipientCount: number;
  audienceType: CommunicationAudienceType;
  description: string;
}

export interface ICommunicationAnnouncement {
  id: string;
  tenantId: string;
  branchId?: string;
  senderUserId: string;
  senderName?: string;
  senderMemberId?: string;
  senderRole?: string;
  title: string;
  body: string;
  priority: CommunicationPriority;
  status: CommunicationAnnouncementStatus;
  audienceType: CommunicationAudienceType;
  audienceCriteria?: ICommunicationAudienceCriteria;
  audienceSnapshot?: ICommunicationAudienceSnapshot;
  channels: string[];
  attachments: ICommunicationAttachment[];
  scheduledAt?: string | Date;
  publishedAt?: string | Date;
  cancelledAt?: string | Date;
  archivedAt?: string | Date;
  deliverySummary?: ICommunicationDeliverySummary;
  revision: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICommunicationParticipant {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  joinedAt: string | Date;
  leftAt?: string | Date;
  status: 'ACTIVE' | 'INACTIVE';
  lastReadAt?: string | Date;
}

export interface ICommunicationConversation {
  id: string;
  tenantId: string;
  branchId?: string;
  type: ConversationType;
  fingerprint?: string;
  title?: string;
  participants: ICommunicationParticipant[];
  participantUserIds: string[];
  courseId?: string;
  courseTitle?: string;
  batchId?: string;
  batchName?: string;
  lastMessageAt?: string | Date;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  messageCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
  unreadCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICommunicationMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  senderUserId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  body: string;
  attachments: ICommunicationAttachment[];
  idempotencyKey?: string;
  sequenceNumber: number;
  sentAt: string | Date;
  editedAt?: string | Date;
  isDeleted: boolean;
  deletedAt?: string | Date;
  deletedByUserId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICommunicationInboxItem {
  id: string;
  itemType: 'ANNOUNCEMENT' | 'CONVERSATION';
  announcementId?: string;
  conversationId?: string;
  title: string;
  preview: string;
  priority?: CommunicationPriority;
  senderName?: string;
  senderAvatarUrl?: string;
  timestamp: string | Date;
  isRead: boolean;
  readAt?: string | Date | null;
  actionUrl: string;
  metadata?: Record<string, any>;
}

export interface ICommunicationUnreadCount {
  unreadCount: number;
  totalUnread: number;
  announcementsUnread: number;
  conversationsUnread: number;
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  priority?: CommunicationPriority;
  audience: ICommunicationAudienceCriteria;
  channels?: ('IN_APP' | 'EMAIL')[];
  attachments?: ICommunicationAttachment[];
  scheduledAt?: string | Date | null;
  scheduledTimezone?: string;
  branchId?: string | null;
}

export interface UpdateAnnouncementInput {
  title?: string;
  body?: string;
  priority?: CommunicationPriority;
  audience?: ICommunicationAudienceCriteria;
  channels?: ('IN_APP' | 'EMAIL')[];
  attachments?: ICommunicationAttachment[];
  scheduledAt?: string | Date | null;
  scheduledTimezone?: string;
  branchId?: string | null;
}

export interface CreateConversationInput {
  type: ConversationType;
  recipientUserIds: string[];
  title?: string;
  courseId?: string;
  batchId?: string;
  branchId?: string;
  initialMessage?: string;
}

export interface SendMessageInput {
  body: string;
  attachments?: ICommunicationAttachment[];
  idempotencyKey?: string;
}

// Phase 21: deterministic automation contracts shared by API, worker and web.
export type AutomationStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type AutomationExecutionStatus = 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DEAD_LETTER';
export type AutomationConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'EXISTS' | 'NOT_EXISTS';
export interface AutomationCondition { field: string; operator: AutomationConditionOperator; value?: string | number | boolean | string[] | number[] | null; }
export interface AutomationStep { stepId: string; type: 'ACTION' | 'DELAY'; actionType?: string; inputs?: Record<string, unknown>; delaySeconds?: number; }
export interface AutomationDefinitionInput { name: string; description?: string; triggerType: string; conditions?: { mode: 'ALL' | 'ANY'; items: AutomationCondition[] }; steps: AutomationStep[]; branchMode?: 'ALL' | 'SELECTED'; branchIds?: string[]; }
export interface AutomationEventEnvelope { eventId: string; eventType: string; tenantId: string; occurredAt: string | Date; actorId?: string; resourceType: string; resourceId: string; branchId?: string; correlationId: string; causationId?: string; depth: number; payloadVersion: number; payload: Record<string, unknown>; }

// Phase 22: External Academic & Live-Class Integration Platform
export type IntegrationProvider = 'GOOGLE_CLASSROOM' | 'GOOGLE_MEET' | 'ZOOM' | 'MICROSOFT_TEAMS';
export type IntegrationConnectionStatus = 'CONNECTED' | 'RECONNECT_REQUIRED' | 'REAUTH_REQUIRED' | 'MISSING_SCOPE' | 'EXPIRED' | 'DISCONNECTED' | 'DEMO' | 'ERROR' | 'DISABLED';
export type IntegrationScopeType = 'TENANT' | 'BRANCH' | 'USER';

export interface ILiveMeetingCapabilities {
  canCreateMeeting?: boolean;
  canUpdateMeeting?: boolean;
  canDeleteMeeting?: boolean;
  canEndActiveConference?: boolean;
  supportsCalendarEvents?: boolean;
  supportsParticipantEvidence?: boolean;
  supportsRecordingMetadata?: boolean;
  supportsTranscriptMetadata?: boolean;
  supportsUpdate: boolean;
  supportsCancel: boolean;
  supportsParticipants: boolean;
  supportsRecordings: boolean;
  supportsTranscripts: boolean;
  supportsWebhooks: boolean;
}

export interface IProviderMetadataDTO {
  provider: IntegrationProvider;
  category: 'ACADEMIC_PLATFORM' | 'LIVE_MEETING';
  displayName: string;
  description: string;
  capabilities: ILiveMeetingCapabilities;
  supportedScopes: IntegrationScopeType[];
  requiresOAuth: boolean;
  deploymentConfigured?: boolean;
  configurationStatus?: 'READY' | 'SETUP_REQUIRED';
  setupStatus?: 'DEPLOYMENT_NOT_CONFIGURED' | 'INVALID_CONFIGURATION' | 'READY_TO_CONNECT';
  configurationMessage?: string;
  missingConfiguration?: string[];
  invalidConfiguration?: string[];
  callbackUrl?: string;
  webhookUrl?: string;
  requiredScopes?: string[];
  setupGuideUrl?: string;
  requiredAuthorization?: string;
}

export interface IIntegrationConnectionDTO {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  scopeType: IntegrationScopeType;
  branchId?: string | null;
  userId?: string | null;
  externalAccountId?: string;
  externalTenantId?: string;
  scopes: string[];
  connectedBy?: string;
  connectedAt?: string | Date;
  lastRefreshAt?: string | Date;
  expiresAt?: string | Date;
  lastHealthCheckAt?: string | Date;
  lastErrorCategory?: string;
  lastErrorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ExternalAcademicResourceType = 'COURSE' | 'BATCH' | 'COURSEWORK' | 'TEACHER' | 'STUDENT' | 'SUBMISSION';
export type ExternalSyncDirection = 'BIDIRECTIONAL' | 'DIDM_TO_EXTERNAL' | 'EXTERNAL_TO_DIDM' | 'READ_ONLY_EXTERNAL';
export type ExternalResourceSyncStatus = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR' | 'UNLINKED';
export type GradeSyncPolicy = 'DIDM_AUTHORITATIVE' | 'CLASSROOM_AUTHORITATIVE' | 'MANUAL_MERGE';

export interface IExternalAcademicResourceDTO {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId: string;
  resourceType: ExternalAcademicResourceType;
  canonicalResourceId: string;
  externalResourceId: string;
  branchId?: string | null;
  syncDirection: ExternalSyncDirection;
  status: ExternalResourceSyncStatus;
  lastSyncedAt?: string | Date;
  externalVersion?: string;
  conflictData?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type ExternalMeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'UNKNOWN';
export type ExternalMeetingSyncStatus = 'SYNCED' | 'PENDING' | 'FAILED';

export interface IExternalMeetingDTO {
  id: string;
  tenantId: string;
  branchId?: string | null;
  classId: string;
  provider: IntegrationProvider;
  connectionId: string;
  organizerUserId: string;
  externalMeetingId: string;
  externalCalendarEventId?: string;
  joinUrl: string;
  providerStatus: ExternalMeetingStatus;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  timezone: string;
  syncStatus: ExternalMeetingSyncStatus;
  lastSyncedAt?: string | Date;
  providerVersion?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IJoinInformationDTO {
  classId: string;
  provider: IntegrationProvider;
  joinUrl: string;
  startUrl?: string; // only for instructors/admins
  isHost: boolean;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  status: ExternalMeetingStatus;
  syncStatus: ExternalMeetingSyncStatus;
}

export type IntegrationOperationType = 'CREATE_MEETING' | 'RESCHEDULE_MEETING' | 'CANCEL_MEETING' | 'SYNC_CLASSROOM' | 'SYNC_RECORDING' | 'RECONCILE';
export type IntegrationOperationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYABLE';
export type IntegrationErrorCategory =
  | 'AUTH_REQUIRED'
  | 'RATE_LIMITED'
  | 'TEMPORARY_PROVIDER_FAILURE'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'PERMISSION_DENIED'
  | 'INTERNAL';

export interface IIntegrationOperationDTO {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId?: string;
  operationType: IntegrationOperationType;
  canonicalResourceType: string;
  canonicalResourceId: string;
  idempotencyKey: string;
  status: IntegrationOperationStatus;
  attempts: number;
  externalResourceId?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
  nextRetryAt?: string | Date;
  errorCategory?: IntegrationErrorCategory;
  errorDetails?: string;
  correlationId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type IntegrationSyncRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';

export interface ISyncRunCounts {
  teachersSynced: number;
  studentsSynced: number;
  courseworkSynced: number;
  submissionsSynced: number;
  gradesSynced: number;
  conflictsDetected: number;
  errorsCount: number;
}

export interface IIntegrationSyncRunDTO {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  connectionId: string;
  scope: string;
  direction: ExternalSyncDirection;
  status: IntegrationSyncRunStatus;
  startedAt: string | Date;
  completedAt?: string | Date;
  counts: ISyncRunCounts;
  cursor?: string;
  errorCategory?: string;
  errorDetails?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IAttendanceEvidenceDTO {
  id: string;
  tenantId: string;
  branchId?: string | null;
  classId: string;
  provider: IntegrationProvider;
  externalMeetingId: string;
  participantExternalId: string;
  displayName: string;
  email?: string;
  joinTime: string | Date;
  leaveTime?: string | Date;
  durationMinutes: number;
  resolvedStudentId?: string | null;
  resolutionStatus: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT';
  importedToAttendanceSession: boolean;
  createdAt: string | Date;
}
