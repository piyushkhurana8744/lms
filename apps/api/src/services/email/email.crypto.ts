import crypto from 'crypto';
import { logger } from '@edtech/utils';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const DEFAULT_KEY_PHRASE = 'didm-lms-email-secret-key-32bytes-default';

function getEncryptionKey(): Buffer {
  const envKey =
    process.env.EMAIL_ENCRYPTION_KEY ||
    process.env.CREDENTIALS_ENCRYPTION_KEY ||
    process.env.STORAGE_ENCRYPTION_KEY;

  if (envKey && envKey.trim().length > 0) {
    return crypto.createHash('sha256').update(envKey.trim()).digest();
  }
  return crypto.createHash('sha256').update(DEFAULT_KEY_PHRASE).digest();
}

export class EmailCryptoService {
  /**
   * Validates encryption key configuration on application startup.
   */
  public static validateKeyConfig(): boolean {
    const key = getEncryptionKey();
    if (!key || key.length !== 32) {
      logger.error('[EmailCryptoService] Invalid encryption key length. AES-256 requires 32-byte key.');
      return false;
    }
    return true;
  }

  /**
   * Encrypts plaintext string or secret object using AES-256-GCM authenticated encryption.
   */
  public static encryptSecret(data: Record<string, any> | string): string {
    if (!data) return '';
    try {
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: any) {
      logger.error(`[EmailCryptoService] Secret encryption failure: ${EmailCryptoService.redactSecrets(err.message)}`);
      throw new Error('Failed to encrypt email credentials');
    }
  }

  /**
   * Decrypts AES-256-GCM payload back to plaintext string or parsed JSON object.
   */
  public static decryptSecret<T = any>(encryptedPayload: string): T {
    if (!encryptedPayload) return '' as any;

    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      return encryptedPayload as any;
    }

    try {
      const [ivHex, authTagHex, encryptedHex] = parts;
      const key = getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted) as T;
      } catch {
        return decrypted as any;
      }
    } catch (err: any) {
      logger.error(`[EmailCryptoService] Secret decryption failure: ${EmailCryptoService.redactSecrets(err.message)}`);
      throw new Error('Failed to decrypt email credentials');
    }
  }

  /**
   * Redacts sensitive secret tokens, passwords, and API keys from logs or error messages.
   */
  public static redactSecrets(message: string): string {
    if (!message) return '';
    return message
      .replace(/(apiKey|password|apiSecret|token|secret|username)=(["']?)[^\s&"']+\2/gi, '$1=$2••••••••$2')
      .replace(/("(?:apiKey|password|apiSecret|token|secret)"\s*:\s*)"[^"]+"/gi, '$1"••••••••"');
  }

  /**
   * Masks a secret string for safe frontend display (e.g. "••••••••1a2b").
   */
  public static maskSecret(secret?: string): string {
    if (!secret || secret.trim().length === 0) return '';
    const trimmed = secret.trim();
    if (trimmed.length <= 4) return '••••••••';
    return `••••••••${trimmed.slice(-4)}`;
  }
}
