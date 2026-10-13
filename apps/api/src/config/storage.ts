import { logger } from '@edtech/utils';

export interface StorageConfig {
  provider: 'local' | 'r2';
  r2: {
    accountId: string;
    bucketName: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl?: string;
    signedUrlExpiresIn: number;
    endpoint: string;
  };
}

export function getStorageConfig(): StorageConfig {
  const providerRaw = (process.env.STORAGE_PROVIDER || 'local').toLowerCase().trim();

  if (providerRaw !== 'local' && providerRaw !== 'r2') {
    throw new Error(`[StorageConfig Fatal Error] Invalid STORAGE_PROVIDER: '${providerRaw}'. Must be 'local' or 'r2'.`);
  }

  const provider = providerRaw as 'local' | 'r2';

  const accountId = process.env.R2_ACCOUNT_ID || '';
  const bucketName = process.env.R2_BUCKET_NAME || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || '';
  const signedUrlExpiresIn = parseInt(process.env.R2_SIGNED_URL_EXPIRES_IN || '3600', 10);

  const endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '';

  if (provider === 'r2') {
    const missingKeys: string[] = [];
    if (!accountId) missingKeys.push('R2_ACCOUNT_ID');
    if (!bucketName) missingKeys.push('R2_BUCKET_NAME');
    if (!accessKeyId) missingKeys.push('R2_ACCESS_KEY_ID');
    if (!secretAccessKey) missingKeys.push('R2_SECRET_ACCESS_KEY');

    if (missingKeys.length > 0) {
      const errMsg = `[StorageConfig Fatal Error] Cloudflare R2 configured (STORAGE_PROVIDER=r2) but missing required environment variables: ${missingKeys.join(', ')}`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
  }

  return {
    provider,
    r2: {
      accountId,
      bucketName,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl,
      signedUrlExpiresIn,
      endpoint
    }
  };
}
