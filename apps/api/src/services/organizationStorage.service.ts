import { Types } from 'mongoose';
import { OrganizationStorageModel, IOrganizationStorageDocument } from '@edtech/database';
import {
  UpdateOrganizationStorageSchema,
  TestOrganizationStorageSchema
} from '@edtech/validation';
import {
  IOrganizationStorageResponse,
  IStorageTestResult,
  StorageProvider,
  StorageConnectionStatus
} from '@edtech/types';
import { SecretEncryptionService } from './security/secretEncryption.service';
import { R2StorageProvider } from './storage/r2Storage.provider';
import { S3StorageProvider } from './storage/s3Storage.provider';
import { CloudinaryStorageProvider } from './storage/cloudinaryStorage.provider';
import { LocalStorageProvider } from './storage/localStorage.provider';
import { StorageProviderFactory } from './storage/storageProviderFactory';
import { AuditService } from './audit.service';
import { NotFoundError, BadRequestError } from '../errors/appError';

export class OrganizationStorageService {
  /**
   * Sanitizes database storage configuration document for client response.
   * NEVER returns encrypted or plaintext secret credentials.
   */
  private static sanitizeStorageResponse(
    doc: IOrganizationStorageDocument | null,
    tenantId: string
  ): IOrganizationStorageResponse {
    if (!doc) {
      return {
        id: '',
        tenantId,
        provider: 'CLOUDFLARE_R2',
        status: 'NOT_CONFIGURED',
        isEnabled: false
      };
    }

    const r2DecryptedAccessKey = doc.r2?.accessKeyIdEncrypted
      ? SecretEncryptionService.decryptSecret(doc.r2.accessKeyIdEncrypted)
      : '';

    const s3DecryptedAccessKey = doc.s3?.accessKeyIdEncrypted
      ? SecretEncryptionService.decryptSecret(doc.s3.accessKeyIdEncrypted)
      : '';

    const cloudinaryDecryptedApiSecret = doc.cloudinary?.apiSecretEncrypted
      ? SecretEncryptionService.decryptSecret(doc.cloudinary.apiSecretEncrypted)
      : '';

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      provider: doc.provider as StorageProvider,
      status: doc.status as StorageConnectionStatus,
      r2: doc.r2
        ? {
            accountId: doc.r2.accountId,
            endpoint: doc.r2.endpoint,
            bucket: doc.r2.bucket,
            accessKeyIdMasked: SecretEncryptionService.maskSecret(r2DecryptedAccessKey),
            secretAccessKeyConfigured: Boolean(doc.r2.secretAccessKeyEncrypted),
            publicBaseUrl: doc.r2.publicBaseUrl
          }
        : undefined,
      s3: doc.s3
        ? {
            bucket: doc.s3.bucket,
            region: doc.s3.region,
            endpoint: doc.s3.endpoint,
            accessKeyIdMasked: SecretEncryptionService.maskSecret(s3DecryptedAccessKey),
            secretAccessKeyConfigured: Boolean(doc.s3.secretAccessKeyEncrypted),
            publicBaseUrl: doc.s3.publicBaseUrl
          }
        : undefined,
      cloudinary: doc.cloudinary
        ? {
            cloudName: doc.cloudinary.cloudName,
            apiKey: doc.cloudinary.apiKey,
            apiSecretMasked: SecretEncryptionService.maskSecret(cloudinaryDecryptedApiSecret),
            apiSecretConfigured: Boolean(doc.cloudinary.apiSecretEncrypted),
            folderPrefix: doc.cloudinary.folderPrefix
          }
        : undefined,
      isEnabled: doc.isEnabled,
      lastTestedAt: doc.lastTestedAt,
      lastConnectedAt: doc.lastConnectedAt,
      lastError: doc.lastError,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Instantiates in-memory storage provider instance from validated payload or stored DB credentials.
   */
  private static async buildInMemoryProvider(
    tenantId: string,
    provider: StorageProvider,
    r2Payload?: any,
    s3Payload?: any,
    cloudinaryPayload?: any
  ) {
    const existingDoc = await OrganizationStorageModel.findOne({ tenantId });

    if (provider === 'CLOUDFLARE_R2') {
      const accountId = r2Payload?.accountId || existingDoc?.r2?.accountId || '';
      const endpoint = r2Payload?.endpoint || existingDoc?.r2?.endpoint || '';
      const bucketName = r2Payload?.bucket || existingDoc?.r2?.bucket || '';
      const publicBaseUrl = r2Payload?.publicBaseUrl || existingDoc?.r2?.publicBaseUrl || '';

      const accessKeyId = r2Payload?.accessKeyId
        ? r2Payload.accessKeyId
        : existingDoc?.r2?.accessKeyIdEncrypted
        ? SecretEncryptionService.decryptSecret(existingDoc.r2.accessKeyIdEncrypted)
        : '';

      const secretAccessKey = r2Payload?.secretAccessKey
        ? r2Payload.secretAccessKey
        : existingDoc?.r2?.secretAccessKeyEncrypted
        ? SecretEncryptionService.decryptSecret(existingDoc.r2.secretAccessKeyEncrypted)
        : '';

      if (!bucketName || !accessKeyId || !secretAccessKey) {
        throw new BadRequestError('Cloudflare R2 requires bucket, accessKeyId, and secretAccessKey');
      }

      return new R2StorageProvider({
        accountId,
        endpoint,
        bucketName,
        accessKeyId,
        secretAccessKey,
        publicBaseUrl
      });
    } else if (provider === 'AMAZON_S3' || provider === 'AWS_S3') {
      const bucket = s3Payload?.bucket || existingDoc?.s3?.bucket || '';
      const region = s3Payload?.region || existingDoc?.s3?.region || 'us-east-1';
      const endpoint = s3Payload?.endpoint || existingDoc?.s3?.endpoint || '';
      const publicBaseUrl = s3Payload?.publicBaseUrl || existingDoc?.s3?.publicBaseUrl || '';

      const accessKeyId = s3Payload?.accessKeyId
        ? s3Payload.accessKeyId
        : existingDoc?.s3?.accessKeyIdEncrypted
        ? SecretEncryptionService.decryptSecret(existingDoc.s3.accessKeyIdEncrypted)
        : '';

      const secretAccessKey = s3Payload?.secretAccessKey
        ? s3Payload.secretAccessKey
        : existingDoc?.s3?.secretAccessKeyEncrypted
        ? SecretEncryptionService.decryptSecret(existingDoc.s3.secretAccessKeyEncrypted)
        : '';

      if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new BadRequestError('Amazon S3 requires bucket, accessKeyId, and secretAccessKey');
      }

      return new S3StorageProvider({
        bucket,
        region,
        endpoint,
        accessKeyId,
        secretAccessKey,
        publicBaseUrl
      });
    } else if (provider === 'CLOUDINARY') {
      const cloudName = cloudinaryPayload?.cloudName || existingDoc?.cloudinary?.cloudName || '';
      const apiKey = cloudinaryPayload?.apiKey || existingDoc?.cloudinary?.apiKey || '';
      const folderPrefix = cloudinaryPayload?.folderPrefix !== undefined
        ? cloudinaryPayload.folderPrefix
        : existingDoc?.cloudinary?.folderPrefix || '';

      const apiSecret = cloudinaryPayload?.apiSecret
        ? cloudinaryPayload.apiSecret
        : existingDoc?.cloudinary?.apiSecretEncrypted
        ? SecretEncryptionService.decryptSecret(existingDoc.cloudinary.apiSecretEncrypted)
        : '';

      if (!cloudName || !apiKey || !apiSecret) {
        throw new BadRequestError('Cloudinary requires cloudName, apiKey, and apiSecret');
      }

      return new CloudinaryStorageProvider({
        cloudName,
        apiKey,
        apiSecret,
        folderPrefix
      });
    } else {
      return new LocalStorageProvider();
    }
  }

  /**
   * Retrieves sanitized organization storage configuration.
   */
  public static async getStorageConfiguration(tenantId: string): Promise<IOrganizationStorageResponse> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }
    const doc = await OrganizationStorageModel.findOne({ tenantId });
    return this.sanitizeStorageResponse(doc, tenantId);
  }

  /**
   * Tests storage provider connection in memory without persisting unverified credentials.
   */
  public static async testStorageConnection(
    tenantId: string,
    payload: unknown
  ): Promise<IStorageTestResult> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const validated = TestOrganizationStorageSchema.parse(payload);
    const providerInstance = await this.buildInMemoryProvider(
      tenantId,
      validated.provider as StorageProvider,
      validated.r2,
      validated.s3,
      validated.cloudinary
    );

    const testedAt = new Date().toISOString();
    const providerLabel = validated.provider === 'CLOUDFLARE_R2'
      ? 'Cloudflare R2'
      : validated.provider === 'CLOUDINARY'
      ? 'Cloudinary'
      : 'Amazon S3';

    try {
      await providerInstance.testConnection();

      await AuditService.logEvent({
        actorId: 'system',
        tenantId,
        action: 'organization.storage.connection_tested',
        resource: 'OrganizationStorage',
        metadata: { provider: validated.provider, result: 'SUCCESS' }
      });

      return {
        success: true,
        provider: validated.provider as StorageProvider,
        message: `${providerLabel} storage connection test successful`,
        testedAt
      };
    } catch (err: any) {
      await AuditService.logEvent({
        actorId: 'system',
        tenantId,
        action: 'organization.storage.connection_tested',
        resource: 'OrganizationStorage',
        metadata: { provider: validated.provider, result: 'FAILED', error: err.message }
      });

      throw new BadRequestError(`Unable to connect to ${providerLabel}: ${err.message || 'Verification failed'}`);
    }
  }

  /**
   * Encrypts and persists tenant-isolated storage configuration after testing connection.
   */
  public static async saveStorageConfiguration(
    tenantId: string,
    actorId: string,
    payload: unknown
  ): Promise<IOrganizationStorageResponse> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const validated = UpdateOrganizationStorageSchema.parse(payload);
    let doc = await OrganizationStorageModel.findOne({ tenantId });
    const isNew = !doc;
    const oldProvider = doc?.provider;

    if (!doc) {
      doc = new OrganizationStorageModel({
        tenantId,
        provider: validated.provider,
        status: 'TESTING',
        isEnabled: validated.isEnabled !== undefined ? validated.isEnabled : true,
        createdBy: actorId
      });
    }

    doc.provider = validated.provider;
    if (validated.isEnabled !== undefined) doc.isEnabled = validated.isEnabled;
    doc.updatedBy = actorId;

    if (validated.provider === 'CLOUDFLARE_R2') {
      if (!doc.r2) doc.r2 = {};
      if (validated.r2?.accountId !== undefined) doc.r2.accountId = validated.r2.accountId;
      if (validated.r2?.endpoint !== undefined) doc.r2.endpoint = validated.r2.endpoint;
      if (validated.r2?.bucket !== undefined) doc.r2.bucket = validated.r2.bucket;
      if (validated.r2?.publicBaseUrl !== undefined) doc.r2.publicBaseUrl = validated.r2.publicBaseUrl;

      if (validated.r2?.accessKeyId) {
        doc.r2.accessKeyIdEncrypted = SecretEncryptionService.encryptSecret(validated.r2.accessKeyId);
      }
      if (validated.r2?.secretAccessKey) {
        doc.r2.secretAccessKeyEncrypted = SecretEncryptionService.encryptSecret(validated.r2.secretAccessKey);
      }
    } else if (validated.provider === 'AMAZON_S3' || validated.provider === 'AWS_S3') {
      if (!doc.s3) doc.s3 = {};
      if (validated.s3?.bucket !== undefined) doc.s3.bucket = validated.s3.bucket;
      if (validated.s3?.region !== undefined) doc.s3.region = validated.s3.region;
      if (validated.s3?.endpoint !== undefined) doc.s3.endpoint = validated.s3.endpoint;
      if (validated.s3?.publicBaseUrl !== undefined) doc.s3.publicBaseUrl = validated.s3.publicBaseUrl;

      if (validated.s3?.accessKeyId) {
        doc.s3.accessKeyIdEncrypted = SecretEncryptionService.encryptSecret(validated.s3.accessKeyId);
      }
      if (validated.s3?.secretAccessKey) {
        doc.s3.secretAccessKeyEncrypted = SecretEncryptionService.encryptSecret(validated.s3.secretAccessKey);
      }
    } else if (validated.provider === 'CLOUDINARY') {
      if (!doc.cloudinary) doc.cloudinary = {};
      if (validated.cloudinary?.cloudName !== undefined) doc.cloudinary.cloudName = validated.cloudinary.cloudName;
      if (validated.cloudinary?.apiKey !== undefined) doc.cloudinary.apiKey = validated.cloudinary.apiKey;
      if (validated.cloudinary?.folderPrefix !== undefined) doc.cloudinary.folderPrefix = validated.cloudinary.folderPrefix;

      if (validated.cloudinary?.apiSecret) {
        doc.cloudinary.apiSecretEncrypted = SecretEncryptionService.encryptSecret(validated.cloudinary.apiSecret);
      }
    }

    // Save temporary record state
    await doc.save();

    // Perform connection test using updated credentials
    try {
      const providerInstance = await this.buildInMemoryProvider(
        tenantId,
        validated.provider as StorageProvider,
        validated.r2,
        validated.s3,
        validated.cloudinary
      );
      await providerInstance.testConnection();

      doc.status = 'CONNECTED';
      doc.lastConnectedAt = new Date();
      doc.lastTestedAt = new Date();
      doc.lastError = '';
      await doc.save();

      StorageProviderFactory.clearCache(tenantId);

      // Audit Log Events
      await AuditService.logEvent({
        actorId,
        tenantId,
        action: isNew ? 'organization.storage.configured' : 'organization.storage.updated',
        resource: 'OrganizationStorage',
        resourceId: doc._id.toString(),
        metadata: { provider: validated.provider, status: 'CONNECTED' }
      });

      if (!isNew && oldProvider && oldProvider !== validated.provider) {
        await AuditService.logEvent({
          actorId,
          tenantId,
          action: 'organization.storage.provider_changed',
          resource: 'OrganizationStorage',
          resourceId: doc._id.toString(),
          metadata: { previousProvider: oldProvider, newProvider: validated.provider }
        });
      }

      return this.sanitizeStorageResponse(doc, tenantId);
    } catch (err: any) {
      doc.status = 'ERROR';
      doc.lastTestedAt = new Date();
      doc.lastError = err.message;
      await doc.save();

      StorageProviderFactory.clearCache(tenantId);

      throw new BadRequestError(`Storage configuration failed connection test: ${err.message}`);
    }
  }

  /**
   * Enables tenant storage provider.
   */
  public static async enableStorage(tenantId: string, actorId: string): Promise<IOrganizationStorageResponse> {
    const doc = await OrganizationStorageModel.findOne({ tenantId });
    if (!doc) throw new NotFoundError('Storage configuration not found');

    doc.isEnabled = true;
    doc.status = 'CONNECTED';
    doc.updatedBy = actorId;
    await doc.save();

    StorageProviderFactory.clearCache(tenantId);

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.storage.enabled',
      resource: 'OrganizationStorage',
      resourceId: doc._id.toString()
    });

    return this.sanitizeStorageResponse(doc, tenantId);
  }

  /**
   * Disables tenant storage provider.
   */
  public static async disableStorage(tenantId: string, actorId: string): Promise<IOrganizationStorageResponse> {
    const doc = await OrganizationStorageModel.findOne({ tenantId });
    if (!doc) throw new NotFoundError('Storage configuration not found');

    doc.isEnabled = false;
    doc.status = 'DISABLED';
    doc.updatedBy = actorId;
    await doc.save();

    StorageProviderFactory.clearCache(tenantId);

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.storage.disabled',
      resource: 'OrganizationStorage',
      resourceId: doc._id.toString()
    });

    return this.sanitizeStorageResponse(doc, tenantId);
  }

  /**
   * Deletes tenant storage configuration.
   */
  public static async deleteStorageConfiguration(tenantId: string, actorId: string): Promise<void> {
    const doc = await OrganizationStorageModel.findOne({ tenantId });
    if (!doc) throw new NotFoundError('Storage configuration not found');

    await OrganizationStorageModel.deleteOne({ tenantId });
    StorageProviderFactory.clearCache(tenantId);

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.storage.disconnected',
      resource: 'OrganizationStorage',
      resourceId: doc._id.toString(),
      metadata: { provider: doc.provider }
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.storage.deleted',
      resource: 'OrganizationStorage',
      resourceId: doc._id.toString()
    });
  }
}
