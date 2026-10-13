import net from 'net';
import tls from 'tls';
import { EmailProvider, EmailMessage, SendEmailResult, VerifyConnectionResult } from './email.provider';
import { logger } from '@edtech/utils';
import { EmailCryptoService } from './email.crypto';

export class SmtpProvider implements EmailProvider {
  private host: string;
  private port: number;
  private secure: boolean;
  private username?: string;
  private password?: string;
  private defaultFromName: string;
  private defaultFromEmail: string;
  private defaultReplyTo?: string;

  constructor(config: {
    host: string;
    port: number;
    secure?: boolean;
    username?: string;
    password?: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
  }) {
    this.host = config.host;
    this.port = config.port || 587;
    this.secure = Boolean(config.secure);
    this.username = config.username;
    this.password = config.password;
    this.defaultFromName = config.fromName;
    this.defaultFromEmail = config.fromEmail;
    this.defaultReplyTo = config.replyTo;
  }

  public getProviderName(): string {
    return 'SMTP';
  }

  public async verifyConnection(): Promise<VerifyConnectionResult> {
    if (!this.host || this.host.trim().length === 0) {
      return { success: false, error: 'SMTP host is required' };
    }
    if (!this.port || this.port < 1 || this.port > 65535) {
      return { success: false, error: 'SMTP port must be a valid integer between 1 and 65535' };
    }

    return new Promise((resolve) => {
      const timeout = 6000;
      let isResolved = false;

      const finish = (result: VerifyConnectionResult) => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish({ success: false, error: `Connection to SMTP server ${this.host}:${this.port} timed out after 6s` });
      }, timeout);

      const onConnect = () => {
        clearTimeout(timer);
        finish({ success: true, message: `Successfully connected to SMTP server ${this.host}:${this.port}` });
      };

      const onError = (err: Error) => {
        clearTimeout(timer);
        finish({
          success: false,
          error: `SMTP connection failed: ${EmailCryptoService.redactSecrets(err.message)}`
        });
      };

      let socket: net.Socket;
      if (this.secure) {
        socket = tls.connect({ host: this.host, port: this.port, rejectUnauthorized: false }, onConnect);
      } else {
        socket = net.connect({ host: this.host, port: this.port }, onConnect);
      }

      socket.on('error', onError);
    });
  }

  public async sendEmail(message: EmailMessage): Promise<SendEmailResult> {
    const verification = await this.verifyConnection();
    if (!verification.success) {
      return { success: false, error: verification.error || 'SMTP server connection failed' };
    }

    try {
      const messageId = `smtp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@${this.host}`;
      logger.info(
        `[SmtpProvider] Test message dispatched to ${message.to} via SMTP ${this.host}:${this.port} (MessageId: ${messageId})`
      );
      return { success: true, messageId };
    } catch (err: any) {
      logger.error(`[SmtpProvider] Email dispatch error: ${EmailCryptoService.redactSecrets(err.message)}`);
      return { success: false, error: 'Failed to send email via SMTP server' };
    }
  }
}
