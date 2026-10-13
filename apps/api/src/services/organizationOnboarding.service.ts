import {
  OrganizationSettingsModel,
  OrganizationWebsiteModel,
  OrganizationStorageModel,
  OrganizationEmailSettingsModel,
  OrganizationDomainModel,
  OrganizationMemberModel,
  CourseModel
} from '@edtech/database';
import {
  IOnboardingProgressResponse,
  IOnboardingStepDetail,
  UpdateOnboardingProgressPayload
} from '@edtech/types';
import { UpdateOnboardingProgressSchema } from '@edtech/validation';
import { getWorkspaceContext, logger } from '@edtech/utils';
import { AuditService } from './audit.service';
import { NotFoundError, BadRequestError } from '../errors/appError';

export class OrganizationOnboardingService {
  /**
   * Evaluates setup steps dynamically against live organization models and settings.
   */
  public static async getOnboardingProgress(): Promise<IOnboardingProgressResponse> {
    const tenantId = getWorkspaceContext().currentTenantId;
    let settings = await OrganizationSettingsModel.findOne({ tenantId });

    if (!settings) {
      settings = await OrganizationSettingsModel.create({
        tenantId,
        profile: { organizationName: 'DIDM LMS Organization' },
        onboarding: {
          status: 'NOT_STARTED',
          currentStep: 0,
          completedSteps: [],
          skippedSteps: []
        }
      });
    }

    const onboarding = settings.onboarding || {
      status: 'NOT_STARTED',
      currentStep: 0,
      completedSteps: [],
      skippedSteps: []
    };

    // Live checks against database models
    const websiteDoc = await OrganizationWebsiteModel.findOne({ tenantId }).lean();
    const storageDoc = await OrganizationStorageModel.findOne({ tenantId }).lean();
    const emailDoc = await OrganizationEmailSettingsModel.findOne({ tenantId }).lean();
    const domainDoc = await OrganizationDomainModel.findOne({ tenantId }).lean();
    const memberCount = await OrganizationMemberModel.countDocuments({ tenantId, status: 'ACTIVE' });
    const publishedCourseCount = await CourseModel.countDocuments({ tenantId, status: 'PUBLISHED' });

    const isProfileDone = Boolean(
      settings.profile?.organizationName && settings.profile?.supportEmail
    );
    const isBrandingDone = Boolean(
      websiteDoc && websiteDoc.status === 'PUBLISHED' && websiteDoc.branding?.organizationName
    );
    const isStorageDone = Boolean(
      storageDoc && storageDoc.isEnabled && storageDoc.status === 'CONNECTED'
    );
    const isEmailDone = Boolean(emailDoc && emailDoc.status === 'VERIFIED');
    const isDomainDone = Boolean(
      domainDoc && domainDoc.platformSubdomain && (domainDoc.status === 'ACTIVE' || domainDoc.status === 'VERIFIED')
    );
    const isTeamDone = memberCount > 1;
    const isCourseDone = publishedCourseCount > 0;

    const completedSet = new Set(onboarding.completedSteps || []);
    const skippedSet = new Set(onboarding.skippedSteps || []);

    if (isProfileDone) completedSet.add('profile');
    if (isBrandingDone) completedSet.add('branding');
    if (isStorageDone) completedSet.add('storage');
    if (isEmailDone) completedSet.add('email');
    if (isDomainDone) completedSet.add('domain');
    if (isTeamDone) completedSet.add('team');
    if (isCourseDone) completedSet.add('course');

    const steps: IOnboardingStepDetail[] = [
      {
        key: 'welcome',
        stepIndex: 0,
        title: 'Welcome to LMS',
        description: 'Welcome banner and platform setup introduction.',
        isCompleted: true,
        isSkipped: false,
        isRequired: true
      },
      {
        key: 'profile',
        stepIndex: 1,
        title: 'Organization Profile',
        description: 'Set company name, support email, phone, and locale settings.',
        isCompleted: completedSet.has('profile'),
        isSkipped: skippedSet.has('profile'),
        isRequired: true,
        actionUrl: '/admin/organization'
      },
      {
        key: 'branding',
        stepIndex: 2,
        title: 'Website & Branding',
        description: 'Customize logo, favicon, colors, and homepage layout.',
        isCompleted: completedSet.has('branding'),
        isSkipped: skippedSet.has('branding'),
        isRequired: false,
        actionUrl: '/admin/organization/branding'
      },
      {
        key: 'storage',
        stepIndex: 3,
        title: 'Storage Configuration',
        description: 'Connect Cloudflare R2, S3, or Cloudinary for media asset hosting.',
        isCompleted: completedSet.has('storage'),
        isSkipped: skippedSet.has('storage'),
        isRequired: false,
        actionUrl: '/admin/organization/storage'
      },
      {
        key: 'email',
        stepIndex: 4,
        title: 'Email Configuration',
        description: 'Configure Resend, Brevo, or SMTP for transactional emails.',
        isCompleted: completedSet.has('email'),
        isSkipped: skippedSet.has('email'),
        isRequired: false,
        actionUrl: '/admin/organization/email'
      },
      {
        key: 'domain',
        stepIndex: 5,
        title: 'Domain & Routing',
        description: 'Platform address and optional custom domain CNAME mapping.',
        isCompleted: completedSet.has('domain'),
        isSkipped: skippedSet.has('domain'),
        isRequired: false,
        actionUrl: '/admin/organization/domain'
      },
      {
        key: 'team',
        stepIndex: 6,
        title: 'Team & Roles',
        description: 'Invite instructors, admins, and staff members.',
        isCompleted: completedSet.has('team'),
        isSkipped: skippedSet.has('team'),
        isRequired: false,
        actionUrl: '/admin/team'
      },
      {
        key: 'course',
        stepIndex: 7,
        title: 'First Course',
        description: 'Create and publish your first course curriculum.',
        isCompleted: completedSet.has('course'),
        isSkipped: skippedSet.has('course'),
        isRequired: false,
        actionUrl: '/admin/courses/create'
      },
      {
        key: 'launch',
        stepIndex: 8,
        title: 'Launch Readiness Checklist',
        description: 'Final verification and launch completion.',
        isCompleted: onboarding.status === 'COMPLETED',
        isSkipped: false,
        isRequired: true
      }
    ];

    const completedCount = steps.filter((s) => s.isCompleted).length;
    const completionPercentage = Math.min(100, Math.round((completedCount / steps.length) * 100));
    const canLaunch = isProfileDone;

    return {
      status: onboarding.status,
      currentStep: onboarding.currentStep,
      completedSteps: Array.from(completedSet),
      skippedSteps: Array.from(skippedSet),
      startedAt: onboarding.startedAt ? onboarding.startedAt.toISOString() : null,
      completedAt: onboarding.completedAt ? onboarding.completedAt.toISOString() : null,
      completionPercentage,
      canLaunch,
      steps
    };
  }

  /**
   * Persists wizard step progress, currentStep, and completed/skipped step keys.
   */
  public static async updateProgress(
    actorId: string,
    rawPayload: UpdateOnboardingProgressPayload
  ): Promise<IOnboardingProgressResponse> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const validated = UpdateOnboardingProgressSchema.parse(rawPayload);

    let settings = await OrganizationSettingsModel.findOne({ tenantId });
    if (!settings) {
      settings = new OrganizationSettingsModel({ tenantId, profile: { organizationName: 'DIDM LMS Organization' } });
    }

    if (!settings.onboarding) {
      settings.onboarding = {
        status: 'NOT_STARTED',
        currentStep: 0,
        completedSteps: [],
        skippedSteps: []
      };
    }

    if (settings.onboarding.status === 'NOT_STARTED') {
      settings.onboarding.status = 'IN_PROGRESS';
      settings.onboarding.startedAt = new Date();
      await AuditService.logEvent({
        actorId,
        tenantId,
        action: 'organization.onboarding.started',
        resource: 'OrganizationSettings',
        resourceId: settings._id.toString()
      });
    }

    if (validated.currentStep !== undefined) {
      settings.onboarding.currentStep = validated.currentStep;
    }

    if (validated.completedSteps) {
      settings.onboarding.completedSteps = Array.from(
        new Set([...(settings.onboarding.completedSteps || []), ...validated.completedSteps])
      );
    }

    if (validated.skippedSteps) {
      settings.onboarding.skippedSteps = Array.from(
        new Set([...(settings.onboarding.skippedSteps || []), ...validated.skippedSteps])
      );
    }

    settings.onboarding.lastVisitedAt = new Date();
    await settings.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.onboarding.step_completed',
      resource: 'OrganizationSettings',
      resourceId: settings._id.toString(),
      metadata: {
        currentStep: settings.onboarding.currentStep,
        completedSteps: settings.onboarding.completedSteps,
        skippedSteps: settings.onboarding.skippedSteps
      }
    });

    return this.getOnboardingProgress();
  }

  /**
   * Marks organization onboarding as COMPLETED.
   */
  public static async completeOnboarding(actorId: string): Promise<IOnboardingProgressResponse> {
    const tenantId = getWorkspaceContext().currentTenantId;
    let settings = await OrganizationSettingsModel.findOne({ tenantId });

    if (!settings) {
      throw new NotFoundError('Organization settings not found');
    }

    if (!settings.onboarding) {
      settings.onboarding = {
        status: 'NOT_STARTED',
        currentStep: 8,
        completedSteps: [],
        skippedSteps: []
      };
    }

    settings.onboarding.status = 'COMPLETED';
    settings.onboarding.currentStep = 8;
    settings.onboarding.completedAt = new Date();
    settings.onboarding.lastVisitedAt = new Date();
    await settings.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.onboarding.completed',
      resource: 'OrganizationSettings',
      resourceId: settings._id.toString(),
      metadata: {
        completedAt: settings.onboarding.completedAt
      }
    });

    return this.getOnboardingProgress();
  }

  /**
   * Marks organization onboarding as SKIPPED.
   */
  public static async skipOnboarding(actorId: string): Promise<IOnboardingProgressResponse> {
    const tenantId = getWorkspaceContext().currentTenantId;
    let settings = await OrganizationSettingsModel.findOne({ tenantId });

    if (!settings) {
      throw new NotFoundError('Organization settings not found');
    }

    if (!settings.onboarding) {
      settings.onboarding = {
        status: 'NOT_STARTED',
        currentStep: 0,
        completedSteps: [],
        skippedSteps: []
      };
    }

    settings.onboarding.status = 'SKIPPED';
    settings.onboarding.lastVisitedAt = new Date();
    await settings.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.onboarding.skipped',
      resource: 'OrganizationSettings',
      resourceId: settings._id.toString()
    });

    return this.getOnboardingProgress();
  }
}
