import { EmailProvider, EmailMessage, SendEmailResult, VerifyConnectionResult } from './email.provider';
import { logger } from '@edtech/utils';
import { EmailCryptoService } from './email.crypto';

export class BrevoProvider implements EmailProvider {
  private apiKey: string;
  private defaultFromName: string;
  private defaultFromEmail: string;
  private defaultReplyTo?: string;

  constructor(config: { apiKey: string; fromName: string; fromEmail: string; replyTo?: string }) {
    this.apiKey = config.apiKey;
    this.defaultFromName = config.fromName;
    this.defaultFromEmail = config.fromEmail;
    this.defaultReplyTo = config.replyTo;
  }

  public getProviderName(): string {
    return 'BREVO';
  }

  public async verifyConnection(): Promise<VerifyConnectionResult> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return { success: false, error: 'Brevo API key is required' };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Brevo credentials verified successfully' };
      }

      const body = await response.json().catch(() => ({}));
      const errMsg = body.message || `HTTP ${response.status} Brevo authorization failed`;
      return { success: false, error: EmailCryptoService.redactSecrets(errMsg) };
    } catch (err: any) {
      logger.error(`[BrevoProvider] Connection verification error: ${EmailCryptoService.redactSecrets(err.message)}`);
      return { success: false, error: 'Failed to connect to Brevo API. Check your API key and network.' };
    }
  }

  public async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Brevo API key is unconfigured' };
    }

    const fromName = message.fromName || this.defaultFromName;
    const fromEmail = message.fromEmail || this.defaultFromEmail;
    const replyTo = message.replyTo || this.defaultReplyTo;

    try {
      const payload: any = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html
      };

      if (message.text) payload.textContent = message.text;
      if (replyTo) payload.replyTo = { email: replyTo };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const body: any = await response.json().catch(() => ({}));

      if (response.ok && (body.messageId || body.messageIds)) {
        return { success: true, messageId: body.messageId || body.messageIds?.[0] };
      }

      const errorMsg = body.message || body.code || `Brevo API returned status ${response.status}`;
      return { success: false, error: EmailCryptoService.redactSecrets(errorMsg) };
    } catch (err: any) {
      logger.error(`[BrevoProvider] Email send error: ${EmailCryptoService.redactSecrets(err.message)}`);
      return { success: false, error: 'Failed to send email via Brevo' };
    }
  }
}
