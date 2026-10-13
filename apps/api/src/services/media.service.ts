import path from 'path';
import { Types } from 'mongoose';
import { MediaModel, IMediaDocument, OrganizationStorageModel } from '@edtech/database';
import { getWorkspaceContext, logger } from '@edtech/utils';
import { MediaType, StorageProvider } from '@edtech/types';
import { StorageProvider as IStorageProvider } from './storage/storage.provider';
import { FILE_LIMITS, getMediaTypeFromMime, isAllowedMimeAndExtension } from '../config/fileLimits';
import { AuditService } from './audit.service';
import { NotFoundError, BadRequestError } from '../errors/appError';
import { StorageProviderFactory } from './storage/storageProviderFactory';

export interface UploadMediaParams {
  userId: string;
  originalFileName: string;
  mimeType: string;
  buffer: Buffer;
}

export class MediaService {
  private static customStorageProvider: IStorageProvider | null = null;

  public static setStorageProvider(provider: IStorageProvider): void {
    MediaService.customStorageProvider = provider;
  }

  public static async getStorageProvider(tenantId?: string): Promise<IStorageProvider> {
    if (MediaService.customStorageProvider) {
      return MediaService.customStorageProvider;
    }

    const activeTenantId = tenantId || getWorkspaceContext()?.currentTenantId;
    if (activeTenantId) {
      const provider = await StorageProviderFactory.getTenantStorageProvider(activeTenantId);
      if (provider) {
        return provider;
      }
    }

    throw new BadRequestError('Organization storage is not configured. Configure Cloudflare R2, Amazon S3, or Cloudinary before uploading media.');
  }

  public static async uploadMedia(params: UploadMediaParams): Promise<IMediaDocument> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();
    const { originalFileName, mimeType, buffer } = params;

    if (!buffer || buffer.length === 0) {
      throw new BadRequestError('Empty or invalid file payload uploaded');
    }

    // Determine file extension
    const rawExt = path.extname(originalFileName).toLowerCase();
    const extension = rawExt || '.bin';

    // Identify Media Type from MIME
    const mediaType = getMediaTypeFromMime(mimeType);
    if (!mediaType) {
      throw new BadRequestError(`Unsupported MIME type: '${mimeType}'`);
    }

    // Validate MIME type and file extension alignment
    if (!isAllowedMimeAndExtension(mediaType, mimeType, extension)) {
      throw new BadRequestError(`MIME type '${mimeType}' does not match file extension '${extension}'`);
    }

    // Validate File Size Limits
    const maxSize = FILE_LIMITS.MAX_SIZE_BYTES[mediaType];
    if (buffer.length > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestError(`File size exceeds maximum limit of ${maxMb}MB for ${mediaType}`);
    }

    const provider = await MediaService.getStorageProvider(currentTenantId);

    // Resolve current active storage provider type from DB
    const storageConfig = await OrganizationStorageModel.findOne({ tenantId: currentTenantId });
    const activeStorageProvider: StorageProvider = (storageConfig?.provider as StorageProvider) || 'CLOUDFLARE_R2';

    let uploadResult: { storageKey: string; url: string; providerMetadata?: Record<string, any> } | null = null;

    try {
      uploadResult = await provider.upload({
        tenantId: currentTenantId,
        buffer,
        originalFileName,
        mimeType,
        extension
      });

      const rawUserId = params.userId || currentUserId;
      const uploaderId = (rawUserId && Types.ObjectId.isValid(rawUserId))
        ? rawUserId
        : (currentUserId && Types.ObjectId.isValid(currentUserId))
        ? currentUserId
        : new Types.ObjectId().toString();

      const media = await MediaModel.create({
        tenantId: currentTenantId,
        uploadedBy: uploaderId,
        originalFileName,
        storageKey: uploadResult.storageKey,
        storageProvider: activeStorageProvider,
        providerMetadata: uploadResult.providerMetadata || undefined,
        mimeType,
        sizeBytes: buffer.length,
        mediaType,
        status: 'READY',
        url: uploadResult.url
      });

      // Audit Log Event: media.uploaded
      await AuditService.logEvent({
        actorId: params.userId || currentUserId,
        tenantId: currentTenantId,
        action: 'media.uploaded',
        resource: 'Media',
        resourceId: media._id.toString(),
        metadata: {
          originalFileName,
          mediaType,
          sizeBytes: buffer.length,
          storageKey: uploadResult.storageKey,
          storageProvider: activeStorageProvider
        }
      });

      return media;
    } catch (err: any) {
      logger.error(`[MediaService] Upload failed for '${originalFileName}': ${err.message}`);
      if (uploadResult?.storageKey) {
        try {
          await provider.delete(uploadResult.storageKey);
        } catch (cleanupErr: any) {
          logger.error(`[MediaService] Failed to clean up storage object '${uploadResult.storageKey}': ${cleanupErr.message}`);
        }
      }
      throw err;
    }
  }

  public static async listMedia(query: {
    page?: number;
    limit?: number;
    mediaType?: MediaType;
    storageProvider?: StorageProvider | string;
    search?: string;
  }): Promise<{ media: IMediaDocument[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const { currentTenantId } = getWorkspaceContext();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      tenantId: currentTenantId,
      status: { $ne: 'DELETED' }
    };

    if (query.mediaType) {
      filter.mediaType = query.mediaType;
    }

    if (query.storageProvider) {
      filter.storageProvider = query.storageProvider;
    }

    if (query.search) {
      filter.originalFileName = { $regex: query.search.trim(), $options: 'i' };
    }

    const [media, total] = await Promise.all([
      MediaModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      MediaModel.countDocuments(filter)
    ]);

    return {
      media,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  public static async getMediaById(mediaId: string): Promise<IMediaDocument> {
    const { currentTenantId } = getWorkspaceContext();

    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId: currentTenantId,
      status: { $ne: 'DELETED' }
    });

    if (!media) {
      // Security Rule: Return 404 Not Found to prevent cross-tenant enumeration
      throw new NotFoundError('Media resource not found');
    }

    return media;
  }

  public static async getMediaSignedUrl(mediaId: string): Promise<{ url: string; expiresIn: number }> {
    const { currentTenantId } = getWorkspaceContext();

    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId: currentTenantId,
      status: 'READY'
    });

    if (!media) {
      // Security Rule: Return 404 Not Found for missing or cross-tenant media
      throw new NotFoundError('Media resource not found');
    }

    const provider = media.storageProvider
      ? (await StorageProviderFactory.getTenantStorageProviderByProvider(currentTenantId, media.storageProvider)) || (await MediaService.getStorageProvider(currentTenantId))
      : await MediaService.getStorageProvider(currentTenantId);

    const url = await provider.getSignedUrl(media.storageKey);

    return {
      url,
      expiresIn: 3600
    };
  }

  public static async deleteMedia(mediaId: string, userId: string): Promise<void> {
    const { currentTenantId, currentUserId } = getWorkspaceContext();

    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId: currentTenantId,
      status: { $ne: 'DELETED' }
    });

    if (!media) {
      // Security Rule: Return 404 Not Found for cross-tenant or missing media
      throw new NotFoundError('Media resource not found');
    }

    // Resolve provider specific to this media file's original storageProvider
    const provider = MediaService.customStorageProvider ||
      (await StorageProviderFactory.getTenantStorageProviderByProvider(currentTenantId, media.storageProvider)) ||
      (await MediaService.getStorageProvider(currentTenantId));

    // Delete storage object
    await provider.delete(media.storageKey);

    // Soft delete DB record
    media.status = 'DELETED';
    await media.save();

    // Audit Log Event: media.deleted
    await AuditService.logEvent({
      actorId: userId || currentUserId,
      tenantId: currentTenantId,
      action: 'media.deleted',
      resource: 'Media',
      resourceId: media._id.toString(),
      metadata: {
        storageKey: media.storageKey,
        storageProvider: media.storageProvider,
        originalFileName: media.originalFileName
      }
    });
  }
}
