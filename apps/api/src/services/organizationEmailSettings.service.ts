import {
  OrganizationEmailSettingsModel,
  OrganizationSettingsModel
} from '@edtech/database';
import {
  SafeOrganizationEmailSettings,
  UpdateOrganizationEmailPayload,
  INotificationPreferences
} from '@edtech/types';
import {
  UpdateOrganizationEmailSchema,
  TestEmailSchema,
  NotificationPreferencesSchema
} from '@edtech/validation';
import { getWorkspaceContext } from '@edtech/utils';
import { EmailCryptoService } from './email/email.crypto';
import { EmailService } from './email/email.service';
import { AuditService } from './audit.service';
import { BadRequestError, NotFoundError } from '../errors/appError';

export class OrganizationEmailSettingsService {
  /**
   * Helper to format database document into SafeOrganizationEmailSettings response envelope.
   */
  private static toSafeResponse(doc: any): SafeOrganizationEmailSettings {
    const isResend = doc.provider === 'RESEND';
    const isBrevo = doc.provider === 'BREVO';
    const isSmtp = doc.provider === 'SMTP';

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      provider: doc.provider,
      status: doc.status,
      fromName: doc.fromName,
      fromEmail: doc.fromEmail,
      replyTo: doc.replyTo || '',
      resend: {
        hasApiKey: Boolean(isResend && doc.resend?.apiKeyEncrypted)
      },
      brevo: {
        hasApiKey: Boolean(isBrevo && doc.brevo?.apiKeyEncrypted)
      },
      smtp: {
        host: doc.smtp?.host || '',
        port: doc.smtp?.port || 587,
        secure: doc.smtp?.secure || false,
        hasUsername: Boolean(isSmtp && doc.smtp?.usernameEncrypted),
        hasPassword: Boolean(isSmtp && doc.smtp?.passwordEncrypted)
      },
      lastVerifiedAt: doc.lastVerifiedAt ? doc.lastVerifiedAt.toISOString() : null,
      lastError: doc.lastError || null,
      createdAt: doc.createdAt?.toISOString(),
      updatedAt: doc.updatedAt?.toISOString()
    };
  }

  /**
   * Resolves tenant email settings (returns default safe metadata if unconfigured).
   */
  public static async getEmailSettings(): Promise<SafeOrganizationEmailSettings> {
    const tenantId = getWorkspaceContext().currentTenantId;
    let doc = await OrganizationEmailSettingsModel.findOne({ tenantId });

    if (!doc) {
      return {
        tenantId,
        provider: 'RESEND',
        status: 'NOT_CONFIGURED',
        fromName: 'DIDM LMS',
        fromEmail: 'noreply@didm.com',
        replyTo: '',
        resend: { hasApiKey: false },
        brevo: { hasApiKey: false },
        smtp: { host: '', port: 587, secure: false, hasUsername: false, hasPassword: false },
        lastVerifiedAt: null,
        lastError: null
      };
    }

    return this.toSafeResponse(doc);
  }

  /**
   * Updates organization email configuration and encrypts sensitive credentials.
   */
  public static async updateEmailSettings(
    actorId: string,
    rawPayload: UpdateOrganizationEmailPayload
  ): Promise<SafeOrganizationEmailSettings> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const validated = UpdateOrganizationEmailSchema.parse(rawPayload);

    let doc = await OrganizationEmailSettingsModel.findOne({ tenantId });
    const isNew = !doc;

    if (!doc) {
      doc = new OrganizationEmailSettingsModel({
        tenantId,
        provider: validated.provider,
        fromName: validated.fromName,
        fromEmail: validated.fromEmail,
        replyTo: validated.replyTo || '',
        status: 'CONFIGURED',
        createdBy: actorId
      });
    } else {
      doc.provider = validated.provider;
      doc.fromName = validated.fromName;
      doc.fromEmail = validated.fromEmail;
      doc.replyTo = validated.replyTo || '';
      doc.status = 'CONFIGURED';
      doc.updatedBy = actorId as any;
    }

    // Process provider-specific encrypted fields
    if (validated.provider === 'RESEND' && validated.resend?.apiKey) {
      doc.resend = {
        apiKeyEncrypted: EmailCryptoService.encryptSecret(validated.resend.apiKey)
      };
    } else if (validated.provider === 'BREVO' && validated.brevo?.apiKey) {
      doc.brevo = {
        apiKeyEncrypted: EmailCryptoService.encryptSecret(validated.brevo.apiKey)
      };
    } else if (validated.provider === 'SMTP' && validated.smtp) {
      const currentSmtp = doc.smtp || {};
      doc.smtp = {
        host: validated.smtp.host || currentSmtp.host || '',
        port: validated.smtp.port || currentSmtp.port || 587,
        secure: validated.smtp.secure !== undefined ? validated.smtp.secure : currentSmtp.secure || false,
        usernameEncrypted: validated.smtp.username
          ? EmailCryptoService.encryptSecret(validated.smtp.username)
          : currentSmtp.usernameEncrypted || '',
        passwordEncrypted: validated.smtp.password
          ? EmailCryptoService.encryptSecret(validated.smtp.password)
          : currentSmtp.passwordEncrypted || ''
      };
    }

    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: isNew ? 'organization.email.configured' : 'organization.email.updated',
      resource: 'OrganizationEmailSettings',
      resourceId: doc._id.toString(),
      metadata: {
        provider: doc.provider,
        fromEmail: doc.fromEmail
      }
    });

    return this.toSafeResponse(doc);
  }

  /**
   * Triggers credentials connection verification.
   */
  public static async verifyEmailSettings(actorId: string) {
    const tenantId = getWorkspaceContext().currentTenantId;
    const result = await EmailService.verifyTenantEmail(tenantId);

    const doc = await OrganizationEmailSettingsModel.findOne({ tenantId });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: result.success ? 'organization.email.verified' : 'organization.email.verification_failed',
      resource: 'OrganizationEmailSettings',
      resourceId: doc?._id.toString() || tenantId,
      metadata: {
        provider: doc?.provider,
        success: result.success
      }
    });

    return {
      success: result.success,
      message: result.message || (result.success ? 'Email provider verified successfully' : 'Verification failed'),
      error: result.error || null,
      settings: doc ? this.toSafeResponse(doc) : null
    };
  }

  /**
   * Sends a test email using active organization credentials.
   */
  public static async sendTestEmail(actorId: string, rawPayload: { recipientEmail: string }) {
    const tenantId = getWorkspaceContext().currentTenantId;
    const { recipientEmail } = TestEmailSchema.parse(rawPayload);

    const result = await EmailService.sendTestEmail(tenantId, recipientEmail);
    const doc = await OrganizationEmailSettingsModel.findOne({ tenantId });

    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to send test email');
    }

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.email.test_sent',
      resource: 'OrganizationEmailSettings',
      resourceId: doc?._id.toString() || tenantId,
      metadata: {
        recipientEmail,
        provider: doc?.provider
      }
    });

    return {
      success: true,
      message: `Test email sent successfully to ${recipientEmail}`,
      messageId: result.messageId
    };
  }

  /**
   * Safely deletes email provider configuration.
   */
  public static async deleteEmailSettings(actorId: string) {
    const tenantId = getWorkspaceContext().currentTenantId;
    const doc = await OrganizationEmailSettingsModel.findOne({ tenantId });

    if (!doc) {
      throw new NotFoundError('Email configuration not found');
    }

    doc.status = 'NOT_CONFIGURED';
    doc.resend = { apiKeyEncrypted: '' };
    doc.brevo = { apiKeyEncrypted: '' };
    doc.smtp = { host: '', port: 587, secure: false, usernameEncrypted: '', passwordEncrypted: '' };
    doc.lastError = null;
    doc.lastVerifiedAt = null;
    doc.updatedBy = actorId as any;
    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.email.deleted',
      resource: 'OrganizationEmailSettings',
      resourceId: doc._id.toString(),
      metadata: {
        provider: doc.provider
      }
    });

    return {
      success: true,
      message: 'Email configuration removed successfully',
      settings: this.toSafeResponse(doc)
    };
  }

  /**
   * Resolves notification preferences for the tenant workspace.
   */
  public static async getNotificationPreferences(): Promise<INotificationPreferences> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const orgSettings = await OrganizationSettingsModel.findOne({ tenantId });

    return orgSettings?.notifications || {
      welcomeEmail: true,
      studentRegistration: true,
      instructorInvitation: true,
      passwordReset: true,
      courseEnrollment: true,
      courseCompletion: true,
      certificateIssued: true,
      adminAlerts: true
    };
  }

  /**
   * Updates notification preferences for the tenant workspace.
   */
  public static async updateNotificationPreferences(
    actorId: string,
    rawPayload: Partial<INotificationPreferences>
  ): Promise<INotificationPreferences> {
    const tenantId = getWorkspaceContext().currentTenantId;
    const validated = NotificationPreferencesSchema.parse(rawPayload);

    let orgSettings = await OrganizationSettingsModel.findOne({ tenantId });

    if (!orgSettings) {
      orgSettings = new OrganizationSettingsModel({
        tenantId,
        profile: { organizationName: 'DIDM LMS Organization' },
        notifications: {
          welcomeEmail: true,
          studentRegistration: true,
          instructorInvitation: true,
          passwordReset: true,
          courseEnrollment: true,
          courseCompletion: true,
          certificateIssued: true,
          adminAlerts: true,
          ...validated
        }
      });
    } else {
      orgSettings.notifications = {
        welcomeEmail: true,
        studentRegistration: true,
        instructorInvitation: true,
        passwordReset: true,
        courseEnrollment: true,
        courseCompletion: true,
        certificateIssued: true,
        adminAlerts: true,
        ...(orgSettings.notifications || {}),
        ...validated
      };
    }

    await orgSettings.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.notifications.updated',
      resource: 'OrganizationSettings',
      resourceId: orgSettings._id.toString(),
      metadata: {
        updatedKeys: Object.keys(validated)
      }
    });

    return orgSettings.notifications!;
  }
}
