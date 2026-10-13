import { Types } from 'mongoose';
import {
  OrganizationSettingsModel,
  TenantModel,
  WebsiteConfigModel,
  UserModel,
  CourseModel,
  OrganizationStorageModel,
  OrganizationBrandingModel,
  OrganizationWebsiteModel,
  OrganizationMemberModel,
  OrganizationEmailSettingsModel,
  OrganizationDomainModel,
  IOrganizationSettingsDocument
} from '@edtech/database';
import {
  UpdateOrganizationProfileSchema,
  UpdateLmsPreferencesSchema
} from '@edtech/validation';
import { AuditService } from './audit.service';

export interface SetupChecklistItem {
  key: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_CONFIGURED' | 'OPTIONAL';
  completed: boolean;
  actionLabel: string;
  actionUrl: string;
}

export interface SetupProgressResult {
  completedSteps: number;
  totalSteps: number;
  completionPercentage: number;
  launchReadiness: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY';
  checklist: SetupChecklistItem[];
}

export class OrganizationSettingsService {
  /**
   * Retrieves or initializes tenant-isolated Organization Settings.
   */
  public static async getSettings(tenantId: string): Promise<IOrganizationSettingsDocument> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    let settings = await OrganizationSettingsModel.findOne({ tenantId });

    if (!settings) {
      // Lookup Tenant record for initial profile name
      const tenant = await TenantModel.findById(tenantId);
      const initialName = tenant?.name || tenant?.branding?.companyName || 'DIDM LMS Organization';

      settings = await OrganizationSettingsModel.create({
        tenantId,
        profile: {
          organizationName: initialName,
          supportEmail: tenant?.slug ? `support@${tenant.slug}.lms` : 'support@didm.edu',
          supportPhone: '',
          address: '',
          timezone: 'UTC',
          defaultLanguage: 'English',
          currency: 'USD'
        },
        lmsPreferences: {
          allowStudentSelfRegistration: false,
          requireEmailVerification: true,
          allowInstructorRegistration: false,
          maintenanceMode: false
        }
      });
    }

    return settings;
  }

  /**
   * Updates tenant-isolated Organization Profile settings.
   */
  public static async updateProfile(
    tenantId: string,
    actorId: string,
    payload: unknown
  ): Promise<IOrganizationSettingsDocument> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const validated = UpdateOrganizationProfileSchema.parse(payload);
    const settings = await this.getSettings(tenantId);

    // Update profile fields
    if (validated.organizationName !== undefined) settings.profile.organizationName = validated.organizationName;
    if (validated.supportEmail !== undefined) settings.profile.supportEmail = validated.supportEmail;
    if (validated.supportPhone !== undefined) settings.profile.supportPhone = validated.supportPhone;
    if (validated.address !== undefined) settings.profile.address = validated.address;
    if (validated.timezone !== undefined) settings.profile.timezone = validated.timezone;
    if (validated.defaultLanguage !== undefined) settings.profile.defaultLanguage = validated.defaultLanguage;
    if (validated.currency !== undefined) settings.profile.currency = validated.currency;

    await settings.save();

    // Synchronize TenantModel.name if organizationName changed
    if (validated.organizationName) {
      await TenantModel.findByIdAndUpdate(tenantId, { name: validated.organizationName });
    }

    // Record Audit Event
    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.settings.profile_updated',
      resource: 'OrganizationSettings',
      resourceId: settings._id.toString(),
      metadata: validated
    });

    return settings;
  }

  /**
   * Updates tenant-isolated LMS Preferences.
   */
  public static async updatePreferences(
    tenantId: string,
    actorId: string,
    payload: unknown
  ): Promise<IOrganizationSettingsDocument> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const validated = UpdateLmsPreferencesSchema.parse(payload);
    const settings = await this.getSettings(tenantId);

    if (validated.allowStudentSelfRegistration !== undefined) {
      settings.lmsPreferences.allowStudentSelfRegistration = validated.allowStudentSelfRegistration;
    }
    if (validated.requireEmailVerification !== undefined) {
      settings.lmsPreferences.requireEmailVerification = validated.requireEmailVerification;
    }
    if (validated.allowInstructorRegistration !== undefined) {
      settings.lmsPreferences.allowInstructorRegistration = validated.allowInstructorRegistration;
    }
    if (validated.maintenanceMode !== undefined) {
      settings.lmsPreferences.maintenanceMode = validated.maintenanceMode;
    }

    await settings.save();

    // Record Audit Event
    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.settings.preferences_updated',
      resource: 'OrganizationSettings',
      resourceId: settings._id.toString(),
      metadata: validated
    });

    return settings;
  }

  /**
   * Dynamically calculates LMS setup progress and launch readiness checklist.
   */
  public static async getSetupProgress(tenantId: string): Promise<SetupProgressResult> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const settings = await this.getSettings(tenantId);
    const websiteConfig = await WebsiteConfigModel.findOne({ tenantId });
    const storageConfig = await OrganizationStorageModel.findOne({ tenantId });
    const brandingDoc = await OrganizationBrandingModel.findOne({ tenantId });
    const websiteDoc = await OrganizationWebsiteModel.findOne({ tenantId });
    const emailConfig = await OrganizationEmailSettingsModel.findOne({ tenantId });
    const domainDoc = await OrganizationDomainModel.findOne({ tenantId });

    const userCount = await UserModel.countDocuments({
      $or: [{ tenantId }, { allowedTenantIds: tenantId }]
    });
    const publishedCoursesCount = await CourseModel.countDocuments({
      tenantId,
      status: 'PUBLISHED'
    });

    const isProfileCompleted = Boolean(
      settings.profile?.organizationName && settings.profile?.supportEmail
    );

    const isBrandingCompleted = Boolean(
      websiteDoc &&
      websiteDoc.status === 'PUBLISHED' &&
      websiteDoc.branding?.organizationName &&
      websiteDoc.homepage
    );

    const isStorageConfigured = Boolean(
      storageConfig && storageConfig.isEnabled && storageConfig.status === 'CONNECTED'
    );

    const isEmailConfigured = Boolean(
      emailConfig && emailConfig.status === 'VERIFIED'
    );

    const isDomainConfigured = Boolean(
      domainDoc && domainDoc.platformSubdomain && (domainDoc.status === 'ACTIVE' || domainDoc.status === 'VERIFIED')
    );

    const activeAdminCount = await OrganizationMemberModel.countDocuments({
      tenantId,
      role: 'TENANT_ADMIN',
      status: 'ACTIVE'
    });
    const isTeamConfigured = activeAdminCount > 0 || userCount > 0;
    const isFirstCoursePublished = publishedCoursesCount > 0;

    const checklist: SetupChecklistItem[] = [
      {
        key: 'organization_profile',
        title: 'Organization Profile',
        description: 'Configure your organization details, contact info, and locale settings.',
        status: isProfileCompleted ? 'COMPLETED' : 'NOT_CONFIGURED',
        completed: isProfileCompleted,
        actionLabel: 'Manage',
        actionUrl: '/admin/organization'
      },
      {
        key: 'website_branding',
        title: 'Website & Branding',
        description: 'Customize company logo, primary colors, hero copy, and homepage sections.',
        status: isBrandingCompleted ? 'COMPLETED' : 'NOT_CONFIGURED',
        completed: isBrandingCompleted,
        actionLabel: 'Manage Branding',
        actionUrl: '/admin/organization/branding'
      },

      {
        key: 'storage_config',
        title: 'Storage Configuration',
        description: 'Connect Cloudflare R2, Amazon S3, or Cloudinary for tenant media asset hosting.',
        status: isStorageConfigured ? 'COMPLETED' : storageConfig?.status === 'ERROR' ? 'NOT_CONFIGURED' : 'NOT_CONFIGURED',
        completed: isStorageConfigured,
        actionLabel: 'Configure Storage',
        actionUrl: '/admin/organization/storage'
      },

      {
        key: 'email_config',
        title: 'Email Configuration',
        description: 'Set up transactional email delivery with Brevo, Resend, or SMTP.',
        status: isEmailConfigured ? 'COMPLETED' : 'NOT_CONFIGURED',
        completed: isEmailConfigured,
        actionLabel: 'Configure Email',
        actionUrl: '/admin/organization/email'
      },
      {
        key: 'domain_config',
        title: 'Domain Configuration',
        description: 'Configure custom domain DNS routing and SSL certificate.',
        status: isDomainConfigured ? 'COMPLETED' : 'NOT_CONFIGURED',
        completed: isDomainConfigured,
        actionLabel: 'Configure Domain',
        actionUrl: '/admin/organization/domain'
      },
      {
        key: 'team_roles',
        title: 'Team & Roles',
        description: 'Invite workspace administrators, instructors, and configure RBAC roles.',
        status: isTeamConfigured ? 'COMPLETED' : 'NOT_CONFIGURED',
        completed: isTeamConfigured,
        actionLabel: 'Manage Team',
        actionUrl: '/admin/team'
      },
      {
        key: 'first_course_published',
        title: 'First Course Published',
        description: 'Create and publish at least one course in your workspace catalog.',
        status: isFirstCoursePublished ? 'COMPLETED' : 'NOT_CONFIGURED',
        completed: isFirstCoursePublished,
        actionLabel: isFirstCoursePublished ? 'View Courses' : 'Create Course',
        actionUrl: isFirstCoursePublished ? '/admin/courses' : '/admin/courses/create'
      }
    ];

    const completedSteps = checklist.filter((item) => item.completed).length;
    const totalSteps = checklist.length;
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

    let launchReadiness: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY' = 'IN_PROGRESS';
    if (completedSteps === 0) {
      launchReadiness = 'NOT_STARTED';
    } else if (completedSteps === totalSteps || (isProfileCompleted && isBrandingCompleted && isTeamConfigured && isFirstCoursePublished)) {
      launchReadiness = 'READY';
    }

    return {
      completedSteps,
      totalSteps,
      completionPercentage,
      launchReadiness,
      checklist
    };
  }
}
