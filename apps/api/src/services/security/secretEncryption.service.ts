import crypto from 'crypto';
import { logger } from '@edtech/utils';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const DEFAULT_KEY_PHRASE = 'didm-lms-platform-storage-secret-key-32bytes';

function getEncryptionKey(): Buffer {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length > 0) {
    return crypto.createHash('sha256').update(envKey.trim()).digest();
  }
  return crypto.createHash('sha256').update(DEFAULT_KEY_PHRASE).digest();
}

export class SecretEncryptionService {
  /**
   * Encrypts a plaintext secret string using AES-256-GCM authenticated encryption.
   */
  public static encryptSecret(plaintext: string): string {
    if (!plaintext) return '';
    try {
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err: any) {
      logger.error(`[SecretEncryption] Encryption failure: ${err.message}`);
      throw new Error('Failed to encrypt secret credential');
    }
  }

  /**
   * Decrypts an AES-256-GCM encrypted payload back to plaintext.
   */
  public static decryptSecret(encryptedPayload: string): string {
    if (!encryptedPayload) return '';

    // Handle legacy or plain values safely if not formatted as iv:tag:ciphertext
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      return encryptedPayload;
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

      return decrypted;
    } catch (err: any) {
      logger.error(`[SecretEncryption] Decryption failure: ${err.message}`);
      throw new Error('Failed to decrypt secret credential');
    }
  }

  /**
   * Safely masks a sensitive secret identifier for client UI presentation.
   */
  public static maskSecret(secret?: string): string {
    if (!secret || secret.trim().length === 0) return '';
    const trimmed = secret.trim();
    if (trimmed.length <= 4) return '••••••••';
    return `••••••••${trimmed.slice(-4)}`;
  }
}
