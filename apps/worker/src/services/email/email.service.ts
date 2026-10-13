import { IEmailProvider, IEmailOptions } from './email.interface';
import { MockEmailProvider } from './mockEmail.provider';
import { SmtpEmailProvider } from './smtpEmail.provider';

export class EmailService {
  private static provider: IEmailProvider;

  public static getProvider(): IEmailProvider {
    if (!this.provider) {
      const providerType = (process.env.EMAIL_PROVIDER || 'mock').toLowerCase();
      if (providerType === 'smtp') {
        this.provider = new SmtpEmailProvider();
      } else {
        this.provider = new MockEmailProvider();
      }
    }
    return this.provider;
  }

  public static async sendEmail(options: IEmailOptions): Promise<boolean> {
    return this.getProvider().sendEmail(options);
  }
}
