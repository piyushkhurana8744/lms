import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './localStorage.provider';
import { R2StorageProvider } from './r2Storage.provider';
import { getStorageConfig } from '../../config/storage';
import { logger } from '@edtech/utils';

let cachedProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = getStorageConfig();

  if (config.provider === 'r2') {
    logger.info('[StorageFactory] Instantiating Cloudflare R2 Storage Provider');
    cachedProvider = new R2StorageProvider();
  } else {
    logger.info('[StorageFactory] Instantiating Local File Storage Provider');
    cachedProvider = new LocalStorageProvider();
  }

  return cachedProvider;
}

export function resetStorageProviderCache(): void {
  cachedProvider = null;
}
