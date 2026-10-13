import { EmailProvider, EmailMessage, SendEmailResult, VerifyConnectionResult } from './email.provider';
import { ResendProvider } from './resend.provider';
import { BrevoProvider } from './brevo.provider';
import { SmtpProvider } from './smtp.provider';
import { EmailCryptoService } from './email.crypto';
import { OrganizationEmailSettingsModel, IOrganizationEmailSettingsDocument } from '@edtech/database';
import { logger } from '@edtech/utils';

// Simple in-memory rate limiting map for test-email endpoint
const testEmailRateLimitMap = new Map<string, number>();

export class EmailService {
  /**
   * Instantiates an active EmailProvider for a given tenant email settings document.
   */
  public static createProvider(settingsDoc: IOrganizationEmailSettingsDocument): EmailProvider {
    const { provider, fromName, fromEmail, replyTo, resend, brevo, smtp } = settingsDoc;

    if (provider === 'RESEND') {
      const apiKey = resend?.apiKeyEncrypted ? EmailCryptoService.decryptSecret(resend.apiKeyEncrypted) : '';
      return new ResendProvider({ apiKey, fromName, fromEmail, replyTo });
    }

    if (provider === 'BREVO') {
      const apiKey = brevo?.apiKeyEncrypted ? EmailCryptoService.decryptSecret(brevo.apiKeyEncrypted) : '';
      return new BrevoProvider({ apiKey, fromName, fromEmail, replyTo });
    }

    if (provider === 'SMTP') {
      const username = smtp?.usernameEncrypted ? EmailCryptoService.decryptSecret(smtp.usernameEncrypted) : '';
      const password = smtp?.passwordEncrypted ? EmailCryptoService.decryptSecret(smtp.passwordEncrypted) : '';
      return new SmtpProvider({
        host: smtp?.host || '',
        port: smtp?.port || 587,
        secure: smtp?.secure || false,
        username,
        password,
        fromName,
        fromEmail,
        replyTo
      });
    }

    throw new Error(`Unsupported email provider type: ${provider}`);
  }

  /**
   * Verifies the connection for a tenant's configured email provider.
   */
  public static async verifyTenantEmail(tenantId: string): Promise<VerifyConnectionResult> {
    const settings = await OrganizationEmailSettingsModel.findOne({ tenantId });
    if (!settings || settings.status === 'NOT_CONFIGURED') {
      return { success: false, error: 'Email provider is not configured for this organization' };
    }

    try {
      const provider = this.createProvider(settings);
      const result = await provider.verifyConnection();

      if (result.success) {
        settings.status = 'VERIFIED';
        settings.lastVerifiedAt = new Date();
        settings.lastError = null;
      } else {
        settings.status = 'ERROR';
        settings.lastError = EmailCryptoService.redactSecrets(result.error || 'Verification failed');
      }
      await settings.save();

      return result;
    } catch (err: any) {
      const redacted = EmailCryptoService.redactSecrets(err.message);
      settings.status = 'ERROR';
      settings.lastError = redacted;
      await settings.save();
      return { success: false, error: redacted };
    }
  }

  /**
   * Sends a test email to a designated recipient with rate-limiting.
   */
  public static async sendTestEmail(tenantId: string, recipientEmail: string): Promise<SendEmailResult> {
    // Check rate limit: 1 test email per tenant per 5 seconds
    const now = Date.now();
    const lastSent = testEmailRateLimitMap.get(tenantId) || 0;
    if (now - lastSent < 5000) {
      return { success: false, error: 'Rate limit exceeded. Please wait 5 seconds before sending another test email.' };
    }

    const settings = await OrganizationEmailSettingsModel.findOne({ tenantId });
    if (!settings || settings.status === 'NOT_CONFIGURED') {
      return { success: false, error: 'Email provider is not configured for this organization' };
    }

    testEmailRateLimitMap.set(tenantId, now);

    try {
      const provider = this.createProvider(settings);
      const testSubject = `Test Email from ${settings.fromName || 'DIDM LMS'}`;
      const testHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 12px;">
          <h2 style="color: #BE1E2E;">DIDM LMS Email Integration Verified</h2>
          <p>This is a test email sent from <strong>${settings.fromName}</strong> using provider <strong>${settings.provider}</strong>.</p>
          <p style="font-size: 12px; color: #64748b;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `;

      const result = await provider.sendEmail({
        to: recipientEmail,
        subject: testSubject,
        html: testHtml,
        fromName: settings.fromName,
        fromEmail: settings.fromEmail,
        replyTo: settings.replyTo
      });

      if (result.success) {
        settings.status = 'VERIFIED';
        settings.lastVerifiedAt = new Date();
        settings.lastError = null;
        await settings.save();
      }

      return result;
    } catch (err: any) {
      return { success: false, error: EmailCryptoService.redactSecrets(err.message) };
    }
  }
}
