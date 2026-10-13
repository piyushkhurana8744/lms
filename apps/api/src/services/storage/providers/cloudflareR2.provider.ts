import { R2StorageProvider, R2ProviderOptions } from '../r2Storage.provider';

export class CloudflareR2Provider extends R2StorageProvider {
  constructor(options?: R2ProviderOptions) {
    super(options || {});
  }
}

export { R2StorageProvider };
