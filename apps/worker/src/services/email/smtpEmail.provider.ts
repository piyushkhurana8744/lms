import { IEmailProvider, IEmailOptions } from './email.interface';
import nodemailer from 'nodemailer';
import { logger } from '@edtech/utils';

export class SmtpEmailProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || ''
          }
        : undefined
    });
  }

  public async sendEmail(options: IEmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"DIDM LMS" <no-reply@didm.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      logger.info(`[SmtpEmailProvider] Sent email to ${options.to}`);
      return true;
    } catch (error: any) {
      logger.error(`[SmtpEmailProvider Failure] ${error.message}`, error);
      return false;
    }
  }
}
