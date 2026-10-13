import { IEmailProvider, IEmailOptions } from './email.interface';
import { logger } from '@edtech/utils';

export class MockEmailProvider implements IEmailProvider {
  public async sendEmail(options: IEmailOptions): Promise<boolean> {
    logger.info(`[MockEmailProvider] Email Dispatched to: ${options.to}`, {
      subject: options.subject,
      contentSnippet: options.text || options.html.substring(0, 100)
    });
    return true;
  }
}
