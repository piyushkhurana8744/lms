import { Request, Response, NextFunction } from 'express';
import { WebsiteConfigModel, TenantModel, AuditLogModel } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';

export class CmsController {
  /**
   * GET /api/v1/cms
   * Returns CMS website configuration for active tenant context
   */
  static async getCmsConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentTenantId) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' }
        });
      }

      let config: any = await WebsiteConfigModel.findOne({ tenantId: ctx.currentTenantId }).lean();
      const tenant = await TenantModel.findById(ctx.currentTenantId).lean();

      if (!config) {
        const createdDoc = await WebsiteConfigModel.create({
          tenantId: ctx.currentTenantId,
          branding: {
            companyName: tenant?.branding?.companyName || tenant?.name || 'DIDM LMS Platform',
            logoUrl: tenant?.branding?.logoUrl || '/didmlogo.png',
            faviconUrl: tenant?.branding?.faviconUrl || '/didmfavicon.png',
            primaryColor: tenant?.branding?.primaryColor || '#BE1E2E',
            secondaryColor: tenant?.branding?.secondaryColor || '#1F2937',
            accentColor: '#3B82F6',
            showPlatformBranding: tenant?.branding?.showPlatformBranding ?? true
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
            contactEmail: 'support@didm.edu',
            contactPhone: '+1 (800) 555-DIDM',
            address: 'DIDM Digital Learning Hub, Delhi NCR',
            copyrightText: `Copyright © 2026 ${tenant?.name || 'DIDM LMS Platform'}. All rights reserved.`
          },
          seo: {
            title: `${tenant?.name || 'DIDM LMS'} — Online Learning Platform`,
            metaDescription: `Official learning portal for ${tenant?.name || 'DIDM LMS'}. Explore courses, curriculum modules, and interactive resources.`,
            metaKeywords: 'DIDM, LMS, Digital Marketing, Online Learning'
          }
        });
        config = createdDoc.toObject();
      }

      return res.json({
        success: true,
        data: config
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/cms
   * Updates CMS website configuration for active tenant context
   */
  static async updateCmsConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentTenantId) {
        return res.status(400).json({
          success: false,
          error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' }
        });
      }

      const body = req.body || {};
      const allowedUpdates: any = {};

      if (body.branding) allowedUpdates.branding = body.branding;
      if (body.hero) allowedUpdates.hero = body.hero;
      if (body.banner) allowedUpdates.banner = body.banner;
      if (body.homepageSections) allowedUpdates.homepageSections = body.homepageSections;
      if (body.footer) allowedUpdates.footer = body.footer;
      if (body.seo) allowedUpdates.seo = body.seo;

      const updated = await WebsiteConfigModel.findOneAndUpdate(
        { tenantId: ctx.currentTenantId },
        { $set: allowedUpdates },
        { new: true, upsert: true, runValidators: true }
      ).lean();

      // Synchronize primary color and company name to TenantModel branding if updated
      if (body.branding) {
        await TenantModel.findByIdAndUpdate(ctx.currentTenantId, {
          $set: {
            'branding.companyName': body.branding.companyName,
            'branding.logoUrl': body.branding.logoUrl,
            'branding.faviconUrl': body.branding.faviconUrl,
            'branding.primaryColor': body.branding.primaryColor,
            'branding.secondaryColor': body.branding.secondaryColor
          }
        });
      }

      // Write Audit Log
      await AuditLogModel.create({
        tenantId: ctx.currentTenantId,
        actorId: ctx.currentUserId || 'system',
        action: 'cms.updated',
        resourceType: 'WebsiteConfig',
        resourceId: (updated as any)._id.toString(),
        metadata: { updatedSections: Object.keys(allowedUpdates) }
      });

      return res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
}
