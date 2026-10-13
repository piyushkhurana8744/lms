import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { MediaService } from '../services/media.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../errors/appError';
import { getWorkspaceContext } from '@edtech/utils';

export class MediaController {
  public static async uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let buffer: Buffer | null = null;
      let originalFileName = '';
      let mimeType = '';

      if (req.file) {
        buffer = req.file.buffer;
        originalFileName = req.file.originalname;
        mimeType = req.file.mimetype;
      } else if (req.body && req.body.buffer) {
        buffer = Buffer.isBuffer(req.body.buffer)
          ? req.body.buffer
          : Buffer.from(req.body.buffer, 'base64');
        originalFileName = req.body.originalFileName || 'uploaded-file';
        mimeType = req.body.mimeType || 'application/octet-stream';
      }

      if (!buffer) {
        throw new BadRequestError('No file payload attached to request');
      }

      const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id || getWorkspaceContext()?.currentUserId;

      const media = await MediaService.uploadMedia({
        userId: userId?.toString() || getWorkspaceContext()?.currentUserId || '',
        originalFileName,
        mimeType,
        buffer
      });

      res.status(201).json({
        success: true,
        data: media,
        message: 'Media uploaded successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const mediaType = req.query.mediaType as any;
      const search = req.query.search as string;

      const result = await MediaService.listMedia({ page, limit, mediaType, search });

      res.json({
        success: true,
        data: result.media,
        meta: result.meta,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMediaById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mediaId = String(req.params.mediaId);
      const media = await MediaService.getMediaById(mediaId);

      res.json({
        success: true,
        data: media,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMediaSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mediaId = String(req.params.mediaId);
      const result = await MediaService.getMediaSignedUrl(mediaId);

      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mediaId = String(req.params.mediaId);
      const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id || getWorkspaceContext()?.currentUserId;

      await MediaService.deleteMedia(mediaId, userId?.toString() || getWorkspaceContext()?.currentUserId || '');

      res.json({
        success: true,
        data: { id: mediaId },
        message: 'Media deleted successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async serveMediaFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawKey = req.params.storageKey || (req.params as any)[0];
      if (!rawKey) {
        throw new BadRequestError('Storage key parameter is required');
      }

      const decodedKey = decodeURIComponent(rawKey);

      // Security Check: Path Traversal Prevention
      const normalizedKey = path.normalize(decodedKey).replace(/^(\.\.[\/\\])+/, '');
      if (normalizedKey.includes('..') || path.isAbsolute(normalizedKey)) {
        throw new ForbiddenError('Path traversal forbidden');
      }

      // Security Check: Verify tenant isolation
      const { currentTenantId } = getWorkspaceContext();
      const parts = normalizedKey.split('/');
      const fileTenantId = parts[0];

      if (fileTenantId !== currentTenantId) {
        throw new NotFoundError('Media file not found');
      }

      const fullPath = path.join(process.cwd(), 'uploads', 'tenants', normalizedKey);
      if (!fs.existsSync(fullPath)) {
        throw new NotFoundError('Media file not found on disk');
      }

      res.sendFile(fullPath);
    } catch (err) {
      next(err);
    }
  }
}
