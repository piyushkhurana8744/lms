import { OrganizationStorageModel } from '@edtech/database';
import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './localStorage.provider';
import { R2StorageProvider } from './r2Storage.provider';
import { S3StorageProvider } from './s3Storage.provider';
import { CloudinaryStorageProvider } from './cloudinaryStorage.provider';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { logger } from '@edtech/utils';

const tenantProviderCache = new Map<string, { provider: StorageProvider; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export class StorageProviderFactory {
  public static clearCache(tenantId?: string): void {
    if (tenantId) {
      tenantProviderCache.delete(tenantId);
    } else {
      tenantProviderCache.clear();
    }
  }

  public static async getTenantStorageProvider(tenantId: string): Promise<StorageProvider | null> {
    if (!tenantId) return null;

    // Check cache
    const cached = tenantProviderCache.get(tenantId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.provider;
    }

    const storageConfig = await OrganizationStorageModel.findOne({ tenantId });

    if (!storageConfig || !storageConfig.isEnabled || storageConfig.status !== 'CONNECTED') {
      const allowFallback = process.env.ALLOW_LOCAL_STORAGE_FALLBACK === 'true';
      if (allowFallback) {
        logger.warn(`[StorageProviderFactory] Tenant '${tenantId}' storage not connected. Falling back to local storage (ALLOW_LOCAL_STORAGE_FALLBACK=true).`);
        return new LocalStorageProvider();
      }
      return null;
    }

    const providerInstance = await StorageProviderFactory.createProviderInstance(storageConfig, storageConfig.provider);

    if (providerInstance) {
      tenantProviderCache.set(tenantId, { provider: providerInstance, cachedAt: Date.now() });
    }

    return providerInstance;
  }

  /**
   * Instantiates a storage provider for a specific provider type (e.g. for media deletion when an organization has switched providers).
   */
  public static async getTenantStorageProviderByProvider(tenantId: string, providerType?: string): Promise<StorageProvider | null> {
    if (!tenantId) return null;
    if (!providerType || providerType === 'LOCAL') {
      return new LocalStorageProvider();
    }

    const storageConfig = await OrganizationStorageModel.findOne({ tenantId });
    if (!storageConfig) {
      if (process.env.ALLOW_LOCAL_STORAGE_FALLBACK === 'true') {
        return new LocalStorageProvider();
      }
      return null;
    }

    // Try creating instance for requested providerType
    const instance = await StorageProviderFactory.createProviderInstance(storageConfig, providerType);
    if (instance) return instance;

    // Fallback to active provider if requested provider details missing
    return StorageProviderFactory.getTenantStorageProvider(tenantId);
  }

  private static async createProviderInstance(storageConfig: any, providerType: string): Promise<StorageProvider | null> {
    if ((providerType === 'CLOUDFLARE_R2') && storageConfig.r2) {
      const accessKeyId = SecretEncryptionService.decryptSecret(storageConfig.r2.accessKeyIdEncrypted || '');
      const secretAccessKey = SecretEncryptionService.decryptSecret(storageConfig.r2.secretAccessKeyEncrypted || '');

      if (storageConfig.r2.bucket && accessKeyId && secretAccessKey) {
        return new R2StorageProvider({
          accountId: storageConfig.r2.accountId,
          endpoint: storageConfig.r2.endpoint,
          bucketName: storageConfig.r2.bucket,
          accessKeyId,
          secretAccessKey,
          publicBaseUrl: storageConfig.r2.publicBaseUrl
        });
      }
    } else if ((providerType === 'AMAZON_S3' || providerType === 'AWS_S3') && storageConfig.s3) {
      const accessKeyId = SecretEncryptionService.decryptSecret(storageConfig.s3.accessKeyIdEncrypted || '');
      const secretAccessKey = SecretEncryptionService.decryptSecret(storageConfig.s3.secretAccessKeyEncrypted || '');

      if (storageConfig.s3.bucket && accessKeyId && secretAccessKey) {
        return new S3StorageProvider({
          bucket: storageConfig.s3.bucket || '',
          region: storageConfig.s3.region || 'us-east-1',
          endpoint: storageConfig.s3.endpoint,
          accessKeyId,
          secretAccessKey,
          publicBaseUrl: storageConfig.s3.publicBaseUrl
        });
      }
    } else if (providerType === 'CLOUDINARY' && storageConfig.cloudinary) {
      const apiSecret = SecretEncryptionService.decryptSecret(storageConfig.cloudinary.apiSecretEncrypted || '');

      if (storageConfig.cloudinary.cloudName && storageConfig.cloudinary.apiKey && apiSecret) {
        return new CloudinaryStorageProvider({
          cloudName: storageConfig.cloudinary.cloudName,
          apiKey: storageConfig.cloudinary.apiKey,
          apiSecret,
          folderPrefix: storageConfig.cloudinary.folderPrefix
        });
      }
    } else if (providerType === 'LOCAL') {
      return new LocalStorageProvider();
    }

    return null;
  }
}
