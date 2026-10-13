import { EmailProvider, EmailMessage, SendEmailResult, VerifyConnectionResult } from './email.provider';
import { logger } from '@edtech/utils';
import { EmailCryptoService } from './email.crypto';

export class ResendProvider implements EmailProvider {
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
    return 'RESEND';
  }

  public async verifyConnection(): Promise<VerifyConnectionResult> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return { success: false, error: 'Resend API key is required' };
    }

    try {
      // Test API key by listing domains or checking API authorization
      const response = await fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok || response.status === 200 || response.status === 404) {
        return { success: true, message: 'Resend credentials verified successfully' };
      }

      const body = await response.json().catch(() => ({}));
      const errMsg = body.message || `HTTP ${response.status} Authorization failed`;
      return { success: false, error: EmailCryptoService.redactSecrets(errMsg) };
    } catch (err: any) {
      logger.error(`[ResendProvider] Connection verification error: ${EmailCryptoService.redactSecrets(err.message)}`);
      return { success: false, error: 'Failed to connect to Resend API. Check your API key and network connectivity.' };
    }
  }

  public async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Resend API key is unconfigured' };
    }

    const fromName = message.fromName || this.defaultFromName;
    const fromEmail = message.fromEmail || this.defaultFromEmail;
    const formattedFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const replyTo = message.replyTo || this.defaultReplyTo;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: formattedFrom,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: replyTo || undefined
        })
      });

      const body: any = await response.json().catch(() => ({}));

      if (response.ok && body.id) {
        return { success: true, messageId: body.id };
      }

      const errorMsg = body.message || body.name || `Resend API returned status ${response.status}`;
      return { success: false, error: EmailCryptoService.redactSecrets(errorMsg) };
    } catch (err: any) {
      logger.error(`[ResendProvider] Email send error: ${EmailCryptoService.redactSecrets(err.message)}`);
      return { success: false, error: 'Failed to send email via Resend' };
    }
  }
}
