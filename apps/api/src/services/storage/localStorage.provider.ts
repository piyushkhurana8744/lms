import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageProvider, StorageUploadParams, StorageUploadResult } from './storage.provider';
import { logger } from '@edtech/utils';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_STORAGE !== 'true') {
      throw new Error('Local storage provider is disabled in production environments unless ALLOW_LOCAL_STORAGE=true');
    }
    this.baseDir = customBaseDir || path.join(process.cwd(), 'uploads', 'tenants');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private sanitizePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('..') || path.isAbsolute(storageKey)) {
      throw new Error('Path traversal detected');
    }
    const normalized = path.normalize(storageKey);
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new Error('Path traversal detected');
    }
    return normalized;
  }

  public async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const { tenantId, buffer, extension } = params;

    // Sanitize tenantId and extension
    const cleanTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '');
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;

    // Generate collision-free, unguessable storage key
    const randomId = crypto.randomBytes(16).toString('hex');
    const relativeKey = `${cleanTenantId}/${randomId}${cleanExt}`;
    const safeKey = this.sanitizePath(relativeKey);

    const fullPath = path.join(this.baseDir, safeKey);
    const dirName = path.dirname(fullPath);

    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, buffer);
    logger.info(`[LocalStorage] File stored at: ${safeKey}`);

    const url = `/api/v1/media/file/${encodeURIComponent(safeKey)}`;
    return {
      storageKey: safeKey,
      url
    };
  }

  public async delete(storageKey: string): Promise<boolean> {
    try {
      const safeKey = this.sanitizePath(storageKey);
      const fullPath = path.join(this.baseDir, safeKey);

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        logger.info(`[LocalStorage] File deleted: ${safeKey}`);
        return true;
      }
      return false;
    } catch (err: any) {
      logger.error(`[LocalStorage] Failed to delete file ${storageKey}: ${err.message}`);
      return false;
    }
  }

  public async read(storageKey: string): Promise<Buffer> {
    const safeKey = this.sanitizePath(storageKey);
    return fs.promises.readFile(path.join(this.baseDir, safeKey));
  }

  public async getSignedUrl(storageKey: string): Promise<string> {
    const safeKey = this.sanitizePath(storageKey);
    return `/api/v1/media/file/${encodeURIComponent(safeKey)}`;
  }

  public async testConnection(): Promise<boolean> {
    return true;
  }
}
