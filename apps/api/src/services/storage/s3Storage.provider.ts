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
import { logger } from '@edtech/utils';

export interface S3ProviderOptions {
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  signedUrlExpiresIn?: number;
}

export class S3StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private publicBaseUrl?: string;
  private defaultExpiresIn: number;

  constructor(options?: S3ProviderOptions) {
    const opts = options || {};
    if (!opts.bucket) throw new Error('Amazon S3 bucket name is required');
    if (!opts.accessKeyId) throw new Error('Amazon S3 Access Key ID is required');
    if (!opts.secretAccessKey) throw new Error('Amazon S3 Secret Access Key is required');

    this.bucketName = opts.bucket;
    this.publicBaseUrl = opts.publicBaseUrl;
    this.defaultExpiresIn = opts.signedUrlExpiresIn || 3600;

    const s3Config: any = {
      region: opts.region || 'us-east-1',
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey
      }
    };

    if (opts.endpoint && opts.endpoint.trim().length > 0) {
      s3Config.endpoint = opts.endpoint.trim();
    }

    this.s3Client = new S3Client(s3Config);
    logger.info(`[S3StorageProvider] Initialized for Amazon S3 bucket '${this.bucketName}' (${opts.region || 'us-east-1'})`);
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

    logger.info(`[S3StorageProvider] File uploaded to S3: ${safeKey}`);

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
      logger.info(`[S3StorageProvider] File deleted from S3: ${safeKey}`);
    } catch (err: any) {
      logger.error(`[S3StorageProvider] Failed to delete file '${storageKey}' from S3: ${err.message}`);
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
      logger.error(`[S3StorageProvider] Connection test failed for bucket '${this.bucketName}': ${err.message}`);
      throw new Error(`Amazon S3 connection test failed: ${err.message || 'Unable to access bucket'}`);
    }
  }
}
