import { Request, Response, NextFunction } from 'express';
import { PublicCourseQuerySchema } from '@edtech/validation';
import { PublicCourseService } from '../services/publicCourse.service';
import { BadRequestError, NotFoundError } from '../errors/appError';

export class PublicCourseController {
  /**
   * GET /api/v1/public/courses
   * Public course catalog listing for resolved tenant context.
   */
  public static async listCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const context = req.publicTenantContext;
      if (!context || !context.tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Website not found' }
        });
      }

      // Explicitly reject client-supplied tenantId overrides in query or body
      if (req.query.tenantId || (req.body && req.body.tenantId)) {
        delete req.query.tenantId;
        if (req.body) delete req.body.tenantId;
      }

      // Validate query payload using PublicCourseQuerySchema
      const parseResult = PublicCourseQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid course query parameters',
            details: parseResult.error.errors
          }
        });
      }

      const validatedQuery = parseResult.data;
      const result = await PublicCourseService.listPublicCourses(context, validatedQuery);

      return res.json({
        success: true,
        data: result.courses,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/courses/:slug
   * Public course detail by slug for resolved tenant context.
   */
  public static async getPublicCourseBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const context = req.publicTenantContext;
      if (!context || !context.tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Website not found' }
        });
      }

      const rawSlug = req.params.slug;
      const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
      if (!slug) {
        throw new BadRequestError('Course slug is required');
      }

      const course = await PublicCourseService.getPublicCourseBySlug(context, slug);

      return res.json({
        success: true,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/courses/:slug/curriculum
   * Public curriculum listing (active modules & lessons metadata) by slug.
   */
  public static async getPublicCurriculum(req: Request, res: Response, next: NextFunction) {
    try {
      const context = req.publicTenantContext;
      if (!context || !context.tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Website not found' }
        });
      }

      const rawSlug = req.params.slug;
      const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
      if (!slug) {
        throw new BadRequestError('Course slug is required');
      }

      const curriculum = await PublicCourseService.getPublicCurriculumBySlug(context, slug);

      return res.json({
        success: true,
        data: curriculum
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/courses/:slug/lessons/:lessonId/preview
   * Safe preview content for preview-enabled active lessons.
   */
  public static async getPublicLessonPreview(req: Request, res: Response, next: NextFunction) {
    try {
      const context = req.publicTenantContext;
      if (!context || !context.tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Website not found' }
        });
      }

      const rawSlug = req.params.slug;
      const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
      const rawLessonId = req.params.lessonId;
      const lessonId = Array.isArray(rawLessonId) ? rawLessonId[0] : rawLessonId;

      if (!slug || !lessonId) {
        throw new BadRequestError('Course slug and lesson ID are required');
      }

      const preview = await PublicCourseService.getPublicLessonPreview(context, slug, lessonId);

      return res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      next(error);
    }
  }
}

