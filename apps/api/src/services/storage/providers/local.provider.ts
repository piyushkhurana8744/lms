import { LocalStorageProvider } from '../localStorage.provider';

export class LocalProvider extends LocalStorageProvider {
  constructor(customBaseDir?: string) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_STORAGE !== 'true') {
      throw new Error('Local storage provider is disabled in production environments unless ALLOW_LOCAL_STORAGE=true');
    }
    super(customBaseDir);
  }
}

export { LocalStorageProvider };
