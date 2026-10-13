import crypto from 'crypto';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, StorageUploadInput, StorageUploadResult, StorageSignedUrlOptions } from './storage.provider';
import { getStorageConfig } from '../../config/storage';
import { logger } from '@edtech/utils';

export interface R2ProviderOptions {
  accountId?: string;
  endpoint?: string;
  bucketName?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  signedUrlExpiresIn?: number;
}

export class R2StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private publicBaseUrl?: string;
  private defaultExpiresIn: number;

  constructor(customOptions?: R2ProviderOptions) {
    let accountId = customOptions?.accountId;
    let endpoint = customOptions?.endpoint;
    let bucketName = customOptions?.bucketName;
    let accessKeyId = customOptions?.accessKeyId;
    let secretAccessKey = customOptions?.secretAccessKey;
    let publicBaseUrl = customOptions?.publicBaseUrl;
    let signedUrlExpiresIn = customOptions?.signedUrlExpiresIn || 3600;

    if (!bucketName || !accessKeyId || !secretAccessKey) {
      const config = getStorageConfig();
      accountId = accountId || config.r2.accountId;
      endpoint = endpoint || config.r2.endpoint;
      bucketName = bucketName || config.r2.bucketName;
      accessKeyId = accessKeyId || config.r2.accessKeyId;
      secretAccessKey = secretAccessKey || config.r2.secretAccessKey;
      publicBaseUrl = publicBaseUrl || config.r2.publicBaseUrl;
      signedUrlExpiresIn = config.r2.signedUrlExpiresIn || 3600;
    }

    if (!bucketName) throw new Error('Cloudflare R2 bucket name is required');
    if (!accessKeyId) throw new Error('Cloudflare R2 Access Key ID is required');
    if (!secretAccessKey) throw new Error('Cloudflare R2 Secret Access Key is required');

    this.bucketName = bucketName;
    this.publicBaseUrl = publicBaseUrl;
    this.defaultExpiresIn = signedUrlExpiresIn;

    const computedEndpoint = endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: computedEndpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    logger.info(`[R2StorageProvider] Initialized for Cloudflare R2 bucket '${this.bucketName}'`);
  }

  private sanitizePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('..') || path.isAbsolute(storageKey)) {
      throw new Error('Path traversal detected');
    }
    const normalized = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new Error('Path traversal detected');
    }
    return normalized;
  }

  public async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const { tenantId, buffer, mimeType, extension } = input;

    const cleanTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '');
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const randomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    const relativeKey = `tenants/${cleanTenantId}/media/${yyyy}/${mm}/${randomId}${cleanExt}`;
    const safeKey = this.sanitizePath(relativeKey);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: safeKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream'
      })
    );

    logger.info(`[R2StorageProvider] File uploaded to R2: ${safeKey}`);

    const signedUrl = await this.getSignedUrl(safeKey);

    return {
      storageKey: safeKey,
      url: signedUrl
    };
  }

  public async delete(storageKey: string): Promise<void> {
    try {
      const safeKey = this.sanitizePath(storageKey);
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: safeKey
        })
      );
      logger.info(`[R2StorageProvider] File deleted from R2: ${safeKey}`);
    } catch (err: any) {
      logger.error(`[R2StorageProvider] Failed to delete file '${storageKey}' from R2: ${err.message}`);
      throw err;
    }
  }

  public async getSignedUrl(storageKey: string, options?: StorageSignedUrlOptions | number): Promise<string> {
    const safeKey = this.sanitizePath(storageKey);

    if (this.publicBaseUrl && this.publicBaseUrl.trim().length > 0) {
      const baseUrl = this.publicBaseUrl.replace(/\/+$/, '');
      return `${baseUrl}/${safeKey}`;
    }

    const expiresIn = typeof options === 'number' ? options : options?.expiresIn || this.defaultExpiresIn;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: safeKey
    });

    return await getS3SignedUrl(this.s3Client, command, { expiresIn });
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          MaxKeys: 1
        })
      );
      return true;
    } catch (err: any) {
      logger.error(`[R2StorageProvider] Connection test failed for bucket '${this.bucketName}': ${err.message}`);
      throw new Error(`Cloudflare R2 connection test failed: ${err.message || 'Unable to access bucket'}`);
    }
  }
}
