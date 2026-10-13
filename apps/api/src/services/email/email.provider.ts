export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerifyConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<SendEmailResult>;
  verifyConnection(): Promise<VerifyConnectionResult>;
  getProviderName(): string;
}
