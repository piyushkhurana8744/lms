import {
  TenantModel,
  OrganizationSettingsModel,
  OrganizationWebsiteModel,
  RoleModel
} from '@edtech/database';
import { SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { Types } from 'mongoose';
import { logger } from '@edtech/utils';

export class TenantProvisioningService {
  /**
   * Safe, idempotent tenant provisioning service.
   * Ensures required default models and configurations exist without overwriting admin settings.
   */
  public static async provisionTenant(targetTenantId?: string): Promise<{
    tenantId: string;
    settingsInitialized: boolean;
    websiteInitialized: boolean;
    rolesInitialized: boolean;
  }> {
    if (!targetTenantId || !Types.ObjectId.isValid(targetTenantId)) {
      throw new Error('Valid tenant ID required for provisioning');
    }

    const tenantObjectId = new Types.ObjectId(targetTenantId);
    let settingsInitialized = false;
    let websiteInitialized = false;
    let rolesInitialized = false;

    // 1. Ensure Tenant Document exists
    const tenantDoc = await TenantModel.findById(tenantObjectId);
    if (!tenantDoc) {
      throw new Error(`Tenant '${targetTenantId}' does not exist`);
    }

    const tenantName = tenantDoc.name || 'DIDM LMS Organization';

    // 2. Provision OrganizationSettings idempotently (do not overwrite if exists)
    const existingSettings = await OrganizationSettingsModel.findOne({ tenantId: tenantObjectId });
    if (!existingSettings) {
      await OrganizationSettingsModel.create({
        tenantId: tenantObjectId,
        profile: {
          organizationName: tenantName,
          supportEmail: '',
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
        },
        notifications: {
          welcomeEmail: true,
          studentRegistration: true,
          instructorInvitation: true,
          passwordReset: true,
          courseEnrollment: true,
          courseCompletion: true,
          certificateIssued: true,
          adminAlerts: true
        },
        onboarding: {
          status: 'NOT_STARTED',
          currentStep: 0,
          completedSteps: [],
          skippedSteps: [],
          startedAt: null,
          completedAt: null,
          lastVisitedAt: null
        }
      });
      settingsInitialized = true;
    }

    // 3. Provision OrganizationWebsite idempotently (draft status defaults)
    const existingWebsite = await OrganizationWebsiteModel.findOne({ tenantId: tenantObjectId });
    if (!existingWebsite) {
      await OrganizationWebsiteModel.create({
        tenantId: tenantObjectId,
        status: 'DRAFT',
        branding: {
          organizationName: tenantName,
          tagline: 'Empowering Learners Worldwide',
          primaryColor: '#BE1E2E',
          secondaryColor: '#1F2937',
          accentColor: '#F59E0B',
          backgroundColor: '#FFFFFF',
          textColor: '#111827',
          fontFamily: 'Inter',
          headingFont: 'Inter',
          bodyFont: 'Inter',
          borderRadius: 'MEDIUM'
        },
        homepage: {
          hero: {
            enabled: true,
            eyebrow: 'Leading Digital Education',
            title: 'Master Skills That Drive Your Future',
            subtitle: 'Industry-aligned certified courses taught by domain experts',
            primaryButton: { label: 'Explore Courses', url: '/courses' },
            secondaryButton: { label: 'Contact Us', url: '/contact' }
          },
          about: {
            enabled: true,
            title: 'About Our Academy',
            description: 'We offer flexible, career-focused learning solutions tailored for ambitious professionals.'
          },
          featuredCourses: {
            enabled: true,
            title: 'Featured Courses',
            subtitle: 'Hand-picked courses from top instructors',
            courseIds: [],
            limit: 6
          },
          cta: {
            enabled: true,
            title: 'Ready to Start Learning?',
            description: 'Join thousands of students building their skills.',
            buttonLabel: 'Browse Catalog',
            buttonUrl: '/courses'
          },
          showCategories: true,
          showTestimonials: true
        },
        contact: {
          email: '',
          phone: '',
          address: ''
        },
        footer: {
          description: 'Empowering learners worldwide with practical, high-impact digital skills.',
          copyrightText: `© ${new Date().getFullYear()} ${tenantName}. All rights reserved.`,
          links: [],
          socialLinks: {}
        },
        seo: {
          title: `${tenantName} — Online Learning Platform`,
          description: `Official learning portal for ${tenantName}. Explore courses and interactive resources.`,
          keywords: ['learning', 'courses', 'education', 'skills']
        },
        navigation: {
          items: [
            { label: 'Home', url: '/', enabled: true, order: 1 },
            { label: 'Courses', url: '/courses', enabled: true, order: 2 },
            { label: 'About', url: '/about', enabled: true, order: 3 },
            { label: 'Contact', url: '/contact', enabled: true, order: 4 }
          ]
        }
      });
      websiteInitialized = true;
    }

    // 4. Ensure System Roles exist for Tenant
    const existingRoleCount = await RoleModel.countDocuments({ tenantId: tenantObjectId });
    if (existingRoleCount === 0) {
      await RoleModel.insertMany([
        {
          tenantId: tenantObjectId,
          name: 'Tenant Admin',
          slug: 'tenant-admin',
          description: 'Default full administrator role for tenant',
          permissions: SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN,
          isSystemRole: true
        },
        {
          tenantId: tenantObjectId,
          name: 'Instructor',
          slug: 'instructor',
          description: 'Default instructor role for tenant',
          permissions: SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR,
          isSystemRole: true
        },
        {
          tenantId: tenantObjectId,
          name: 'Student',
          slug: 'student',
          description: 'Default student role for tenant',
          permissions: SYSTEM_ROLE_PERMISSIONS.STUDENT,
          isSystemRole: true
        }
      ]);
      rolesInitialized = true;
    }

    logger.info(`Tenant provisioning check complete for tenant ${targetTenantId}`);

    return {
      tenantId: targetTenantId,
      settingsInitialized,
      websiteInitialized,
      rolesInitialized
    };
  }
}
