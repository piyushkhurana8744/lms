import { CloudinaryStorageProvider, CloudinaryProviderOptions } from '../cloudinaryStorage.provider';

export class CloudinaryProvider extends CloudinaryStorageProvider {
  constructor(options?: CloudinaryProviderOptions) {
    super(options || {});
  }
}

export { CloudinaryStorageProvider };
