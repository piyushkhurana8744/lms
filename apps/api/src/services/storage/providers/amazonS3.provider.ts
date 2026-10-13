import { S3StorageProvider, S3ProviderOptions } from '../s3Storage.provider';

export class AmazonS3Provider extends S3StorageProvider {
  constructor(options?: S3ProviderOptions) {
    super(options || {});
  }
}

export { S3StorageProvider };
