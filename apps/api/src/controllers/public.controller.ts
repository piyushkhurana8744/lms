import { Request, Response, NextFunction } from 'express';
import { CourseModel, CourseModuleModel, LessonModel, TenantModel } from '@edtech/database';
import { tenantContextStorage, sanitizeHtml } from '@edtech/utils';
import { OrganizationBrandingService } from '../services/organizationBranding.service';
import { OrganizationWebsiteService } from '../services/organizationWebsite.service';
import { PublicWebsiteService } from '../services/publicWebsite.service';
import { publicTenantMiddleware } from '../middleware/publicTenant.middleware';

// Re-export for backward compatibility
export const publicTenantResolverMiddleware = publicTenantMiddleware;

export class PublicController {
  /**
   * GET /api/v1/public/site
   * Returns full tenant website CMS configuration and public organization context
   */
  static async getPublicSiteConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const tenant = req.publicTenantContext?.tenant || (await TenantModel.findById(tenantId).lean());
      if (!tenant || tenant.status !== 'ACTIVE') {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant workspace not active' }
        });
      }

      const publicOrganization = await PublicWebsiteService.getPublicOrganization(tenantId);
      const { WebsiteConfigModel } = await import('@edtech/database');
      let config = await WebsiteConfigModel.findOne({ tenantId }).lean();

      if (!config) {
        config = {
          tenantId: tenantId as any,
          branding: {
            companyName: publicOrganization?.branding.companyName || tenant.name,
            logoUrl: publicOrganization?.branding.logoUrl || '/didmlogo.png',
            faviconUrl: publicOrganization?.branding.faviconUrl || '/didmfavicon.png',
            primaryColor: publicOrganization?.branding.primaryColor || '#BE1E2E',
            secondaryColor: publicOrganization?.branding.secondaryColor || '#1F2937',
            accentColor: publicOrganization?.branding.accentColor || '#3B82F6',
            showPlatformBranding: tenant.branding?.showPlatformBranding ?? true
          },
          hero: {
            title: 'Accelerate Your Career with Industry Masterclasses',
            subtitle: 'Explore structured curriculum modules, video lessons, and interactive learning resources built for real-world mastery.',
            buttonText: 'Browse All Courses',
            buttonLink: '/courses'
          },
          banner: {
            enabled: false,
            text: '🎉 New Courses Enrolling for 2026 Batch!',
            link: '/courses'
          },
          homepageSections: [
            { id: 'hero', name: 'Hero Banner', enabled: true, order: 1 },
            { id: 'categories', name: 'Learning Categories', enabled: true, order: 2 },
            { id: 'featuredCourses', name: 'Featured Courses', enabled: true, order: 3 },
            { id: 'popularCourses', name: 'Popular Courses', enabled: true, order: 4 },
            { id: 'statistics', name: 'Student Statistics', enabled: true, order: 5 },
            { id: 'whyUs', name: 'Why Choose Us', enabled: true, order: 6 },
            { id: 'instructors', name: 'Expert Instructors', enabled: true, order: 7 },
            { id: 'quizzes', name: 'Quizzes & Practice', enabled: true, order: 8 },
            { id: 'testimonials', name: 'Student Testimonials', enabled: true, order: 9 },
            { id: 'blog', name: 'Latest Articles & Blog', enabled: true, order: 10 },
            { id: 'cta', name: 'Call To Action Banner', enabled: true, order: 11 }
          ],
          footer: {
            description: 'Enterprise Digital Learning Management Platform empowering students with industry-grade skills.',
            contactEmail: publicOrganization?.supportEmail || 'support@didm.edu',
            contactPhone: publicOrganization?.supportPhone || '+1 (800) 555-DIDM',
            address: publicOrganization?.address || 'DIDM Digital Learning Hub, Delhi NCR',
            copyrightText: `Copyright © 2026 ${tenant.name}. All rights reserved.`
          },
          seo: {
            title: `${tenant.name} — Online Learning Platform`,
            metaDescription: `Official learning portal for ${tenant.name}. Explore courses, curriculum modules, and interactive resources.`,
            metaKeywords: 'DIDM, LMS, Digital Marketing, Online Learning'
          }
        } as any;
      }

      return res.json({
        success: true,
        data: {
          ...config,
          organization: publicOrganization
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/organization
   * Returns safe public organization details and settings
   */
  static async getPublicOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const publicOrganization = await PublicWebsiteService.getPublicOrganization(tenantId);
      if (!publicOrganization) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant workspace not active' }
        });
      }

      return res.json({
        success: true,
        data: publicOrganization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/branding & GET /api/v1/public/tenant/branding
   * Returns public tenant branding information
   */
  static async getTenantBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const tenant = req.publicTenantContext?.tenant || (await TenantModel.findById(tenantId).lean());
      if (!tenant || tenant.status !== 'ACTIVE') {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant workspace not active' }
        });
      }

      const tenantBranding = await OrganizationBrandingService.getPublicBranding(tenantId);

      const publicBranding = {
        name: tenantBranding.organizationName || tenant.name,
        slug: tenant.slug,
        branding: {
          companyName: tenantBranding.organizationName || tenant.name,
          logoUrl: tenantBranding.logoUrl || tenant.branding?.logoUrl || '/didmlogo.png',
          faviconUrl: tenantBranding.faviconUrl || tenant.branding?.faviconUrl || '/didmfavicon.png',
          primaryColor: tenantBranding.primaryColor || '#BE1E2E',
          secondaryColor: tenantBranding.secondaryColor || '#1F2937',
          accentColor: tenantBranding.accentColor || '#F59E0B',
          backgroundColor: tenantBranding.backgroundColor,
          surfaceColor: tenantBranding.surfaceColor,
          textColor: tenantBranding.textColor,
          fontFamily: tenantBranding.fontFamily || 'Inter',
          showPlatformBranding: tenant.branding?.showPlatformBranding ?? true
        },
        organizationBranding: tenantBranding
      };

      return res.json({
        success: true,
        data: publicBranding
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/tenant/website
   * Returns public tenant website configuration
   */
  static async getPublicWebsiteConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const websiteConfig = await OrganizationWebsiteService.getPublicWebsite(tenantId);

      return res.json({
        success: true,
        data: websiteConfig
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/courses
   * Returns list of published courses for the resolved tenant
   */
  static async listPublicCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 12;
      const search = (req.query.search as string) || '';
      const level = req.query.level as string;

      const query: any = {
        tenantId,
        status: 'PUBLISHED',
        visibility: 'PUBLIC'
      };

      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }

      if (level) {
        query.level = level;
      }

      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        CourseModel.find(query)
          .sort({ publishedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CourseModel.countDocuments(query)
      ]);

      const sanitizedCourses = courses.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        slug: c.slug,
        shortDescription: c.shortDescription || '',
        description: c.description || '',
        thumbnailUrl: c.thumbnailUrl || '',
        level: c.level,
        language: c.language || 'English',
        durationMinutes: c.durationMinutes || 0,
        publishedAt: c.publishedAt
      }));

      return res.json({
        success: true,
        data: sanitizedCourses,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/courses/:slug
   * Returns public course detail by slug for resolved tenant
   */
  static async getPublicCourseBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const slug = req.params.slug;
      const course = await CourseModel.findOne({
        tenantId,
        slug,
        status: 'PUBLISHED',
        visibility: { $in: ['PUBLIC', 'UNLISTED'] }
      }).lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          error: { code: 'COURSE_NOT_FOUND', message: 'Course not found' }
        });
      }

      const sanitizedCourse = {
        id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        shortDescription: course.shortDescription || '',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl || '',
        level: course.level,
        language: course.language || 'English',
        durationMinutes: course.durationMinutes || 0,
        publishedAt: course.publishedAt
      };

      return res.json({
        success: true,
        data: sanitizedCourse
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/courses/:courseId/curriculum
   * Returns active modules and active lessons for a published course
   */
  static async getPublicCurriculum(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const courseId = req.params.courseId;

      const course = await CourseModel.findOne({
        _id: courseId,
        tenantId,
        status: 'PUBLISHED',
        visibility: { $in: ['PUBLIC', 'UNLISTED'] }
      }).lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          error: { code: 'COURSE_NOT_FOUND', message: 'Course not found or access denied' }
        });
      }

      const modules = await CourseModuleModel.find({
        tenantId,
        courseId,
        status: { $ne: 'ARCHIVED' }
      })
        .sort({ order: 1 })
        .lean();

      const moduleIds = modules.map((m) => m._id.toString());

      const lessons = await LessonModel.find({
        tenantId,
        courseId,
        moduleId: { $in: moduleIds },
        status: { $ne: 'ARCHIVED' }
      })
        .sort({ order: 1 })
        .lean();

      const lessonsByModule = new Map<string, any[]>();
      for (const lesson of lessons) {
        const mId = lesson.moduleId.toString();
        if (!lessonsByModule.has(mId)) {
          lessonsByModule.set(mId, []);
        }

        let publicContent: any = null;
        if (lesson.isPreview && lesson.content) {
          if (lesson.type === 'TEXT' && lesson.content.bodyHtml) {
            publicContent = { bodyHtml: sanitizeHtml(lesson.content.bodyHtml) };
          } else if (lesson.type === 'EXTERNAL_RESOURCE' && lesson.content.url) {
            publicContent = { url: lesson.content.url, provider: lesson.content.provider };
          } else if (lesson.type === 'VIDEO' || lesson.type === 'PDF' || lesson.type === 'AUDIO') {
            publicContent = { fileName: lesson.content.fileName || 'Preview Attachment' };
          }
        }

        lessonsByModule.get(mId)!.push({
          id: lesson._id.toString(),
          title: lesson.title,
          description: lesson.description || '',
          type: lesson.type,
          durationMinutes: lesson.estimatedDurationMinutes || 0,
          order: lesson.order,
          isPreview: lesson.isPreview || false,
          content: publicContent
        });
      }

      const curriculum = modules.map((m) => ({
        id: m._id.toString(),
        title: m.title,
        description: m.description || '',
        order: m.order,
        lessons: lessonsByModule.get(m._id.toString()) || []
      }));

      return res.json({
        success: true,
        data: curriculum
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/public/tenant/status & GET /api/v1/public/status
   * Returns safe public organization status details
   */
  static async getTenantPublicStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      const tenantId = req.publicTenantContext?.tenantId?.toString() || ctx?.currentTenantId;

      if (!tenantId) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant context not resolved' }
        });
      }

      const tenant = req.publicTenantContext?.tenant || (await TenantModel.findById(tenantId).lean());
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: { code: 'TENANT_NOT_FOUND', message: 'Tenant workspace not found' }
        });
      }

      const isLive = tenant.organizationStatus === 'LIVE';
      const tenantBranding = await OrganizationBrandingService.getPublicBranding(tenantId);
      const websiteConfig = await OrganizationWebsiteService.getPublicWebsite(tenantId);

      return res.json({
        success: true,
        data: {
          live: isLive,
          organizationStatus: tenant.organizationStatus || 'SETUP',
          organizationName: tenantBranding.organizationName || tenant.name,
          branding: {
            companyName: tenantBranding.organizationName || tenant.name,
            logoUrl: tenantBranding.logoUrl || tenant.branding?.logoUrl || '/didmlogo.png',
            faviconUrl: tenantBranding.faviconUrl || tenant.branding?.faviconUrl || '/didmfavicon.png',
            primaryColor: tenantBranding.primaryColor || '#BE1E2E'
          },
          websiteConfigured: Boolean(websiteConfig)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
