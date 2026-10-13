import crypto from 'crypto';
import { logger } from '@edtech/utils';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const DEFAULT_KEY_PHRASE = 'didm-lms-platform-storage-secret-key-32bytes';

function getEncryptionKey(): Buffer {
  const envKey =
    process.env.STORAGE_CREDENTIALS_ENCRYPTION_KEY ||
    process.env.STORAGE_ENCRYPTION_KEY ||
    process.env.CREDENTIALS_ENCRYPTION_KEY;

  if (envKey && envKey.trim().length > 0) {
    return crypto.createHash('sha256').update(envKey.trim()).digest();
  }
  return crypto.createHash('sha256').update(DEFAULT_KEY_PHRASE).digest();
}

export class StorageCredentialsService {
  /**
   * Validates encryption key configuration during application startup.
   */
  public static validateKeyConfig(): boolean {
    const key = getEncryptionKey();
    if (!key || key.length !== 32) {
      logger.error('[StorageCredentialsService] Invalid encryption key length. AES-256 requires 32-byte key.');
      return false;
    }
    return true;
  }

  /**
   * Encrypts plaintext string or JSON object credentials using AES-256-GCM authenticated encryption.
   */
  public static encryptCredentials(data: Record<string, any> | string): string {
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
      logger.error(`[StorageCredentialsService] Encryption failure: ${StorageCredentialsService.redactSecrets(err.message)}`);
      throw new Error('Failed to encrypt storage credentials');
    }
  }

  /**
   * Decrypts AES-256-GCM payload back to plaintext string or parsed JSON object.
   */
  public static decryptCredentials<T = any>(encryptedPayload: string): T {
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
      logger.error(`[StorageCredentialsService] Decryption failure: ${StorageCredentialsService.redactSecrets(err.message)}`);
      throw new Error('Failed to decrypt storage credentials');
    }
  }

  /**
   * Redacts sensitive secret tokens from error strings or logs.
   */
  public static redactSecrets(message: string): string {
    if (!message) return '';
    return message
      .replace(/(secretAccessKey|secretKey|secret|accessKey|apiKey|apiSecret|password|token)=(["']?)[^\s&"']+\2/gi, '$1=$2••••••••$2')
      .replace(/("(?:secretAccessKey|secretKey|secret|apiSecret|password|token)"\s*:\s*)"[^"]+"/gi, '$1"••••••••"');
  }

  /**
   * Safely masks a sensitive secret identifier for client response presentation.
   */
  public static maskSecret(secret?: string): string {
    if (!secret || secret.trim().length === 0) return '';
    const trimmed = secret.trim();
    if (trimmed.length <= 4) return '••••••••';
    return `••••••••${trimmed.slice(-4)}`;
  }
}
