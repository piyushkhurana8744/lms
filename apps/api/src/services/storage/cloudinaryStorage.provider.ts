import crypto from 'crypto';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, StorageUploadInput, StorageUploadResult, StorageSignedUrlOptions } from './storage.provider';
import { logger } from '@edtech/utils';

export interface CloudinaryProviderOptions {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  folderPrefix?: string;
}

export class CloudinaryStorageProvider implements StorageProvider {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private folderPrefix?: string;

  constructor(options?: CloudinaryProviderOptions) {
    const opts = options || {};
    if (!opts.cloudName) throw new Error('Cloudinary cloudName is required');
    if (!opts.apiKey) throw new Error('Cloudinary apiKey is required');
    if (!opts.apiSecret) throw new Error('Cloudinary apiSecret is required');

    this.cloudName = opts.cloudName.trim();
    this.apiKey = opts.apiKey.trim();
    this.apiSecret = opts.apiSecret.trim();

    if (opts.folderPrefix) {
      this.folderPrefix = this.sanitizeFolderPrefix(opts.folderPrefix);
    }

    cloudinary.config(this.getCloudinaryOptions());

    logger.info(`[CloudinaryStorageProvider] Initialized for cloudName '${this.cloudName}'`);
  }

  private getCloudinaryOptions() {
    return {
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
      timeout: 300000
    };
  }

  private sanitizeFolderPrefix(prefix: string): string {
    if (!prefix) return '';
    if (prefix.includes('../') || prefix.includes('..\\') || path.isAbsolute(prefix)) {
      throw new Error('Path traversal detected in folderPrefix');
    }
    return prefix.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9-_/]/g, '');
  }

  private sanitizePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('../') || storageKey.includes('..\\') || path.isAbsolute(storageKey)) {
      throw new Error('Path traversal detected in storageKey');
    }
    return storageKey;
  }

  public async upload(input: StorageUploadInput): Promise<StorageUploadResult & { providerMetadata?: Record<string, any> }> {
    const { tenantId, buffer, mimeType } = input;

    const cleanTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '');
    let folder = `tenants/${cleanTenantId}/media`;

    if (this.folderPrefix && this.folderPrefix.trim().length > 0) {
      folder = `${folder}/${this.folderPrefix}`;
    }

    const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const publicId = `${folder}/${randomId}`;

    cloudinary.config(this.getCloudinaryOptions());

    const isLarge = buffer.length > 5 * 1024 * 1024;

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, any> = {
        ...this.getCloudinaryOptions(),
        public_id: publicId,
        resource_type: 'auto',
        overwrite: true,
        timeout: 300000,
        ...(isLarge ? { chunk_size: 6000000 } : {})
      };

      const rawUploader = cloudinary.uploader as any;
      const uploadFn = (
        isLarge && typeof rawUploader.upload_chunked_stream === 'function'
          ? rawUploader.upload_chunked_stream
          : rawUploader.upload_stream
      ).bind(cloudinary.uploader);


      const stream = uploadFn(uploadOptions, (error: any, result: any) => {
        if (error || !result) {
          logger.error(`[CloudinaryStorageProvider] Upload failed: ${error?.message || 'Unknown error'}`);
          return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Upload failed'}`));
        }

        logger.info(`[CloudinaryStorageProvider] Uploaded file to Cloudinary: ${result.public_id}`);

        resolve({
          storageKey: result.public_id,
          url: result.secure_url || result.url,
          providerMetadata: {
            resourceType: result.resource_type,
            publicId: result.public_id,
            format: result.format,
            secureUrl: result.secure_url
          }
        });
      });

      stream.on('error', (streamError: any) => {
        logger.error(`[CloudinaryStorageProvider] Stream error: ${streamError?.message || streamError}`);
        reject(new Error(`Cloudinary stream error: ${streamError?.message || 'Stream error'}`));
      });

      stream.end(buffer);
    });
  }



  public async delete(storageKey: string): Promise<void> {
    const safeKey = this.sanitizePath(storageKey);
    const options = this.getCloudinaryOptions();

    // Try destroying across possible Cloudinary resource types (image, video, raw)
    const resourceTypes = ['image', 'video', 'raw'];
    let deleted = false;

    for (const resType of resourceTypes) {
      try {
        const result = await cloudinary.uploader.destroy(safeKey, {
          ...options,
          resource_type: resType,
          invalidate: true
        });

        if (result.result === 'ok') {
          logger.info(`[CloudinaryStorageProvider] Deleted asset '${safeKey}' with resource_type '${resType}'`);
          deleted = true;
          break;
        }
      } catch (err: any) {
        // Continue to next resource type if error occurs
      }
    }

    if (!deleted) {
      logger.warn(`[CloudinaryStorageProvider] Delete target '${safeKey}' finished without explicit ok confirmation`);
    }
  }

  public async getSignedUrl(storageKey: string, _options?: StorageSignedUrlOptions | number): Promise<string> {
    const safeKey = this.sanitizePath(storageKey);
    const options = this.getCloudinaryOptions();

    return cloudinary.url(safeKey, {
      ...options,
      secure: true
    });
  }

  public async testConnection(): Promise<boolean> {
    try {
      const options = this.getCloudinaryOptions();
      const result = await cloudinary.api.ping(options);
      if (result && result.status === 'ok') {
        return true;
      }
      throw new Error('Cloudinary ping status not ok');
    } catch (err: any) {
      logger.error(`[CloudinaryStorageProvider] Connection test failed for cloudName '${this.cloudName}': ${err.message}`);
      throw new Error(`Cloudinary connection test failed: ${err.message || 'Unable to connect'}`);
    }
  }
}
