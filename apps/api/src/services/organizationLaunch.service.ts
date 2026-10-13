import {
  TenantModel,
  OrganizationSettingsModel,
  OrganizationWebsiteModel,
  OrganizationStorageModel,
  OrganizationEmailSettingsModel,
  OrganizationDomainModel,
  OrganizationMemberModel,
  CourseModel
} from '@edtech/database';
import {
  IOrganizationLaunchReadinessResponse,
  IOrganizationLaunchResponse,
  ILaunchCheckItem,
  ILaunchBlockerItem,
  ILaunchWarningItem,
  OrganizationLifecycleStatus,
  LaunchReadinessStatus
} from '@edtech/types';
import { getWorkspaceContext, logger } from '@edtech/utils';
import { AuditService } from './audit.service';
import { BadRequestError, NotFoundError } from '../errors/appError';
import { Types } from 'mongoose';

export class OrganizationLaunchService {
  /**
   * Safe tenant resolver from WorkspaceContext.
   */
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx || !ctx.currentTenantId || !Types.ObjectId.isValid(ctx.currentTenantId)) {
      throw new Error('Workspace context missing from execution scope.');
    }
    return ctx.currentTenantId;
  }

  /**
   * Evaluates launch readiness across all organization systems.
   */
  public static async getLaunchReadiness(): Promise<IOrganizationLaunchReadinessResponse> {
    const tenantId = this.getTenantId();

    const [
      tenantDoc,
      settingsDoc,
      websiteDoc,
      storageDoc,
      emailDoc,
      domainDoc,
      memberCount,
      publishedCourseCount
    ] = await Promise.all([
      TenantModel.findById(tenantId).lean(),
      OrganizationSettingsModel.findOne({ tenantId }).lean(),
      OrganizationWebsiteModel.findOne({ tenantId }).lean(),
      OrganizationStorageModel.findOne({ tenantId }).lean(),
      OrganizationEmailSettingsModel.findOne({ tenantId }).lean(),
      OrganizationDomainModel.findOne({ tenantId }).lean(),
      OrganizationMemberModel.countDocuments({ tenantId, status: 'ACTIVE' }),
      CourseModel.countDocuments({ tenantId, status: 'PUBLISHED' })
    ]);

    if (!tenantDoc) {
      throw new NotFoundError('Organization tenant not found');
    }

    // 1. Profile Check
    const isProfileDone = Boolean(
      settingsDoc?.profile?.organizationName && settingsDoc?.profile?.supportEmail
    );

    // 2. Website & Branding Check
    const isBrandingDone = Boolean(
      websiteDoc && websiteDoc.status === 'PUBLISHED' && websiteDoc.branding?.organizationName
    );

    // 3. Storage Check
    const isStorageDone = Boolean(
      storageDoc && storageDoc.isEnabled && storageDoc.status === 'CONNECTED'
    );

    // 4. Email Check
    const isEmailDone = Boolean(emailDoc && emailDoc.status === 'VERIFIED');

    // 5. Course Check
    const isCourseDone = publishedCourseCount > 0;

    // 6. Onboarding Check
    const isOnboardingDone = Boolean(
      settingsDoc?.onboarding?.status === 'COMPLETED' || settingsDoc?.onboarding?.status === 'SKIPPED'
    );

    // 7. Domain Check (Optional unless custom domain explicitly configured & pending verification)
    const isDomainDone = Boolean(
      domainDoc && domainDoc.platformSubdomain && (domainDoc.status === 'ACTIVE' || domainDoc.status === 'VERIFIED')
    );
    const isDomainRequired = Boolean(domainDoc?.customDomain && domainDoc?.status !== 'VERIFIED' && domainDoc?.status !== 'ACTIVE');

    // 8. Team Check (Optional)
    const isTeamDone = memberCount > 1;

    const checks: ILaunchCheckItem[] = [
      {
        key: 'organization_profile',
        label: 'Organization Profile',
        description: 'Organization legal name, support email, and locale settings',
        status: isProfileDone ? 'READY' : 'PENDING',
        required: true,
        completed: isProfileDone,
        actionUrl: '/admin/organization'
      },
      {
        key: 'website_branding',
        label: 'Website & Branding',
        description: 'Published website CMS layout, logo, primary colors, and storefront branding',
        status: isBrandingDone ? 'READY' : 'PENDING',
        required: true,
        completed: isBrandingDone,
        actionUrl: '/admin/organization/branding'
      },
      {
        key: 'storage',
        label: 'Storage Configuration',
        description: 'Connected media storage provider (Cloudflare R2, AWS S3, or Cloudinary)',
        status: isStorageDone ? 'READY' : 'PENDING',
        required: true,
        completed: isStorageDone,
        actionUrl: '/admin/organization/storage'
      },
      {
        key: 'email',
        label: 'Email Configuration',
        description: 'Verified transactional email service (Resend, Brevo, or custom SMTP)',
        status: isEmailDone ? 'READY' : 'PENDING',
        required: true,
        completed: isEmailDone,
        actionUrl: '/admin/organization/email'
      },
      {
        key: 'course',
        label: 'First Published Course',
        description: 'At least one published course curriculum in your catalog',
        status: isCourseDone ? 'READY' : 'PENDING',
        required: true,
        completed: isCourseDone,
        actionUrl: '/admin/courses/create'
      },
      {
        key: 'onboarding',
        label: 'Onboarding Completion',
        description: 'Completed or acknowledged setup onboarding wizard',
        status: isOnboardingDone ? 'READY' : 'PENDING',
        required: true,
        completed: isOnboardingDone,
        actionUrl: '/admin/onboarding'
      },
      {
        key: 'domain',
        label: 'Domain & Routing',
        description: 'Platform subdomain and optional custom CNAME mapping',
        status: isDomainDone ? 'READY' : isDomainRequired ? 'PENDING' : 'OPTIONAL',
        required: isDomainRequired,
        completed: isDomainDone,
        actionUrl: '/admin/organization/domain'
      },
      {
        key: 'team',
        label: 'Team & Roles',
        description: 'Workspace administrative team, staff, and instructors',
        status: isTeamDone ? 'READY' : 'OPTIONAL',
        required: false,
        completed: isTeamDone,
        actionUrl: '/admin/team'
      }
    ];

    const requiredChecks = checks.filter((c) => c.required);
    const requiredTotal = requiredChecks.length;
    const requiredCompleted = requiredChecks.filter((c) => c.completed).length;
    const totalCompleted = checks.filter((c) => c.completed).length;
    const completionPercentage = Math.min(100, Math.round((totalCompleted / checks.length) * 100));

    const canLaunch = requiredCompleted === requiredTotal;

    const blockers: ILaunchBlockerItem[] = requiredChecks
      .filter((c) => !c.completed)
      .map((c) => ({
        key: c.key,
        label: c.label,
        reason: this.getBlockerReason(c.key),
        actionUrl: c.actionUrl
      }));

    const warnings: ILaunchWarningItem[] = checks
      .filter((c) => !c.required && !c.completed)
      .map((c) => ({
        key: c.key,
        label: c.label,
        reason: this.getWarningReason(c.key),
        actionUrl: c.actionUrl
      }));

    const organizationStatus = (tenantDoc.organizationStatus || 'SETUP') as OrganizationLifecycleStatus;
    let readinessStatus: LaunchReadinessStatus = 'NOT_READY';

    if (organizationStatus === 'LIVE') {
      readinessStatus = 'LIVE';
    } else if (canLaunch) {
      readinessStatus = 'READY';
    }

    return {
      organizationStatus,
      readinessStatus,
      completionPercentage,
      requiredCompleted,
      requiredTotal,
      canLaunch,
      checks,
      blockers,
      warnings,
      lastEvaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Helper to map friendly blocker reasons.
   */
  private static getBlockerReason(key: string): string {
    switch (key) {
      case 'organization_profile':
        return 'Organization profile details (name and support email) need attention before launch.';
      case 'website_branding':
        return 'Publish your website CMS configuration and branding layout before launch.';
      case 'storage':
        return 'A storage provider has not been configured or connected yet.';
      case 'email':
        return 'Email delivery is not configured or verified yet.';
      case 'course':
        return 'Publish at least one course before launching your LMS.';
      case 'onboarding':
        return 'Complete or finish the initial organization setup onboarding wizard.';
      case 'domain':
        return 'Your custom domain is not verified yet.';
      default:
        return 'Configuration required before launch.';
    }
  }

  /**
   * Helper to map friendly warning reasons.
   */
  private static getWarningReason(key: string): string {
    switch (key) {
      case 'domain':
        return 'Custom domain is optional. Your platform subdomain is active.';
      case 'team':
        return 'Inviting team members and instructors is recommended for collaboration.';
      default:
        return 'Optional configuration not completed yet.';
    }
  }

  /**
   * Executes atomic, idempotent organization launch.
   */
  public static async launchOrganization(actorId: string): Promise<IOrganizationLaunchResponse> {
    const tenantId = this.getTenantId();

    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Organization tenant not found');
    }

    // Idempotent Check: If already LIVE, return immediately without re-firing launch events
    if (tenant.organizationStatus === 'LIVE') {
      return {
        alreadyLive: true,
        organizationStatus: 'LIVE',
        launchedAt: tenant.launchedAt,
        launchedBy: tenant.launchedBy ? tenant.launchedBy.toString() : actorId
      };
    }

    // Perform FRESH readiness evaluation immediately before launch
    const readiness = await this.getLaunchReadiness();

    if (!readiness.canLaunch) {
      // Audit blocked launch attempt
      await AuditService.logEvent({
        actorId,
        tenantId,
        action: 'organization.launch.blocked',
        resource: 'Tenant',
        resourceId: tenantId,
        metadata: {
          blockers: readiness.blockers.map((b) => b.key)
        }
      });

      const err: any = new Error('Your LMS is not ready to launch.');
      err.statusCode = 409;
      err.code = 'ORGANIZATION_NOT_READY';
      err.blockers = readiness.blockers;
      throw err;
    }

    // Audit launch started
    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.launch.started',
      resource: 'Tenant',
      resourceId: tenantId,
      metadata: {
        completionPercentage: readiness.completionPercentage,
        requiredCompleted: readiness.requiredCompleted,
        requiredTotal: readiness.requiredTotal
      }
    });

    // Atomic Status Transition to LIVE
    const updatedTenant = await TenantModel.findOneAndUpdate(
      { _id: tenantId, organizationStatus: { $ne: 'LIVE' } },
      {
        $set: {
          organizationStatus: 'LIVE',
          launchedAt: new Date(),
          launchedBy: new Types.ObjectId(actorId)
        }
      },
      { new: true }
    );

    const finalTenant = updatedTenant || (await TenantModel.findById(tenantId));

    // Audit launch success
    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.launched',
      resource: 'Tenant',
      resourceId: tenantId,
      metadata: {
        completionPercentage: readiness.completionPercentage,
        requiredCompleted: readiness.requiredCompleted,
        requiredTotal: readiness.requiredTotal
      }
    });

    return {
      alreadyLive: false,
      organizationStatus: 'LIVE',
      launchedAt: finalTenant?.launchedAt,
      launchedBy: actorId,
      completionPercentage: 100
    };
  }
}
