import { Types } from 'mongoose';
import {
  OrganizationWebsiteModel,
  IOrganizationWebsiteDocument,
  MediaModel,
  CourseModel
} from '@edtech/database';
import {
  UpdateWebsiteBrandingSchema,
  UpdateWebsiteHeroSchema,
  UpdateHomepageSchema,
  UpdateWebsiteAboutSchema,
  UpdateWebsiteContactSchema,
  UpdateWebsiteSocialSchema,
  UpdateWebsiteFooterSchema,
  UpdateWebsiteSeoSchema,
  UpdateNavigationSchema
} from '@edtech/validation';
import {
  IOrganizationWebsite,
  IPublicWebsiteConfig
} from '@edtech/types';
import { getWorkspaceContext } from '@edtech/utils';
import { StorageProviderFactory } from './storage/storageProviderFactory';
import { AuditService } from './audit.service';
import { BadRequestError } from '../errors/appError';

export class OrganizationWebsiteService {
  /**
   * Safe tenant resolver from WorkspaceContext.
   */
  private static getTenantId(): string {
    const { currentTenantId } = getWorkspaceContext();
    if (!currentTenantId || !Types.ObjectId.isValid(currentTenantId)) {
      throw new Error('Valid tenant context required');
    }
    return currentTenantId;
  }

  /**
   * Helper to resolve media URL safely.
   */
  private static async resolveMediaUrl(
    mediaId?: Types.ObjectId | string | null,
    tenantId?: string
  ): Promise<string | undefined> {
    if (!mediaId || !Types.ObjectId.isValid(mediaId.toString())) return undefined;
    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId: tenantId || this.getTenantId(),
      status: { $ne: 'DELETED' }
    });

    if (!media) return undefined;

    try {
      const provider = await StorageProviderFactory.getTenantStorageProvider(media.tenantId.toString());
      if (provider) {
        return await provider.getSignedUrl(media.storageKey);
      }
    } catch {
      // Fallback to media.url
    }

    return media.url;
  }

  /**
   * Validates media asset ownership strictly belonging to current tenant.
   */
  private static async validateMediaOwnership(
    mediaId: string | undefined | null,
    tenantId: string,
    fieldName: string
  ): Promise<void> {
    if (!mediaId || mediaId.trim() === '') return;
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestError(`Invalid ObjectId format for ${fieldName}`);
    }
    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId,
      status: { $ne: 'DELETED' }
    });

    if (!media) {
      throw new BadRequestError(`Invalid or cross-tenant ${fieldName} media asset reference`);
    }
  }

  /**
   * Validates featured course IDs belong strictly to current tenant.
   */
  private static async validateFeaturedCourses(
    courseIds: string[] | undefined,
    tenantId: string
  ): Promise<void> {
    if (!courseIds || courseIds.length === 0) return;

    const validObjectIds = courseIds.filter((id) => Types.ObjectId.isValid(id));
    if (validObjectIds.length !== courseIds.length) {
      throw new BadRequestError('Invalid ObjectId format in featured course list');
    }

    const count = await CourseModel.countDocuments({
      _id: { $in: validObjectIds },
      tenantId
    });

    if (count !== courseIds.length) {
      throw new BadRequestError('One or more featured courses do not belong to current organization');
    }
  }

  /**
   * Retrieves or initializes default draft tenant-isolated Website Configuration.
   */
  public static async getWebsiteSettings(): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    let doc = await OrganizationWebsiteModel.findOne({ tenantId });

    if (!doc) {
      doc = await OrganizationWebsiteModel.create({
        tenantId,
        status: 'DRAFT',
        branding: {
          organizationName: 'DIDM Academy',
          tagline: 'Empowering Learners Worldwide',
          primaryColor: '#BE1E2E',
          secondaryColor: '#1F2937',
          accentColor: '#F59E0B',
          backgroundColor: '#FFFFFF',
          textColor: '#111827',
          fontFamily: 'Inter',
          headingFont: 'Inter',
          bodyFont: 'Inter',
          borderRadius: 'MEDIUM'
        },
        homepage: {
          hero: {
            enabled: true,
            eyebrow: 'Leading Digital Education',
            title: 'Master Skills That Drive Your Future',
            subtitle: 'Industry-aligned certified courses taught by domain experts',
            primaryButton: { label: 'Explore Courses', url: '/courses' },
            secondaryButton: { label: 'Contact Us', url: '/contact' }
          },
          about: {
            enabled: true,
            title: 'About Our Academy',
            description: 'We offer flexible, career-focused learning solutions tailored for ambitious professionals.'
          },
          featuredCourses: {
            enabled: true,
            title: 'Featured Courses',
            subtitle: 'Hand-picked courses from top instructors',
            courseIds: [],
            limit: 6
          },
          cta: {
            enabled: true,
            title: 'Ready to Start Learning?',
            description: 'Join thousands of students building their skills.',
            buttonLabel: 'Browse Catalog',
            buttonUrl: '/courses'
          },
          showCategories: true,
          showTestimonials: true
        },
        contact: {
          email: 'support@didm.com',
          phone: '+1 (800) 555-0199',
          address: '100 Innovation Way, Suite 400'
        },
        footer: {
          description: 'Empowering learners worldwide with practical, high-impact digital skills.',
          copyrightText: `© ${new Date().getFullYear()} All rights reserved.`,
          links: [],
          socialLinks: {
            facebook: 'https://facebook.com',
            instagram: 'https://instagram.com',
            youtube: 'https://youtube.com',
            linkedin: 'https://linkedin.com',
            twitter: 'https://twitter.com'
          }
        },
        seo: {
          title: 'Online Learning Platform',
          description: 'Explore certified online courses and skill acceleration programs.',
          keywords: ['learning', 'courses', 'education', 'skills']
        },
        navigation: {
          items: [
            { label: 'Home', url: '/', enabled: true, order: 1 },
            { label: 'Courses', url: '/courses', enabled: true, order: 2 },
            { label: 'About', url: '/about', enabled: true, order: 3 },
            { label: 'Contact', url: '/contact', enabled: true, order: 4 }
          ]
        }
      });
    }

    return this.formatWebsiteDocument(doc, tenantId);
  }

  /**
   * Helper to format Mongoose document into IOrganizationWebsite type with resolved URLs.
   */
  private static async formatWebsiteDocument(
    doc: IOrganizationWebsiteDocument,
    tenantId: string
  ): Promise<IOrganizationWebsite> {
    const [logoUrl, faviconUrl, backgroundUrl, aboutImageUrl, ogImageUrl] = await Promise.all([
      this.resolveMediaUrl(doc.branding?.logoMediaId, tenantId),
      this.resolveMediaUrl(doc.branding?.faviconMediaId, tenantId),
      this.resolveMediaUrl(doc.homepage?.hero?.backgroundImageMediaId, tenantId),
      this.resolveMediaUrl(doc.homepage?.about?.imageMediaId, tenantId),
      this.resolveMediaUrl(doc.seo?.ogImageMediaId, tenantId)
    ]);

    const navLinks = (doc.navigation?.items || []).map((i) => ({
      label: i.label,
      href: i.url,
      external: false
    }));

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      status: doc.status || 'DRAFT',
      branding: {
        logoMediaId: doc.branding?.logoMediaId?.toString(),
        logoUrl,
        faviconMediaId: doc.branding?.faviconMediaId?.toString(),
        faviconUrl,
        organizationName: doc.branding?.organizationName || 'DIDM Academy',
        tagline: doc.branding?.tagline || '',
        primaryColor: doc.branding?.primaryColor || '#BE1E2E',
        secondaryColor: doc.branding?.secondaryColor || '#1F2937',
        accentColor: doc.branding?.accentColor || '#F59E0B',
        headingFont: doc.branding?.headingFont || 'Inter',
        bodyFont: doc.branding?.bodyFont || 'Inter',
        borderRadius: (doc.branding?.borderRadius as any) || 'MEDIUM'
      },
      hero: {
        enabled: doc.homepage?.hero?.enabled !== false,
        eyebrow: doc.homepage?.hero?.eyebrow || '',
        title: doc.homepage?.hero?.title || '',
        subtitle: doc.homepage?.hero?.subtitle || '',
        backgroundMediaId: doc.homepage?.hero?.backgroundImageMediaId?.toString(),
        backgroundUrl,
        primaryButton: {
          enabled: true,
          label: doc.homepage?.hero?.primaryButton?.label || 'Explore Courses',
          href: doc.homepage?.hero?.primaryButton?.url || '/courses'
        },
        secondaryButton: {
          enabled: Boolean(doc.homepage?.hero?.secondaryButton?.url),
          label: doc.homepage?.hero?.secondaryButton?.label || 'Contact Us',
          href: doc.homepage?.hero?.secondaryButton?.url || '/contact'
        }
      },
      homepage: {
        showFeaturedCourses: doc.homepage?.featuredCourses?.enabled !== false,
        featuredCourseIds: doc.homepage?.featuredCourses?.courseIds
          ? doc.homepage.featuredCourses.courseIds.map((id) => id.toString())
          : [],
        showCategories: doc.homepage?.showCategories !== false,
        showAbout: doc.homepage?.about?.enabled !== false,
        showTestimonials: doc.homepage?.showTestimonials !== false,
        showContact: true
      },
      about: {
        title: doc.homepage?.about?.title || '',
        description: doc.homepage?.about?.description || '',
        imageMediaId: doc.homepage?.about?.imageMediaId?.toString(),
        imageUrl: aboutImageUrl
      },
      contact: {
        email: doc.contact?.email || '',
        phone: doc.contact?.phone || '',
        address: doc.contact?.address || ''
      },
      socialLinks: {
        facebook: doc.footer?.socialLinks?.facebook || '',
        instagram: doc.footer?.socialLinks?.instagram || '',
        youtube: doc.footer?.socialLinks?.youtube || '',
        linkedin: doc.footer?.socialLinks?.linkedin || '',
        twitter: doc.footer?.socialLinks?.twitter || ''
      },
      footer: {
        description: doc.footer?.description || '',
        copyrightText: doc.footer?.copyrightText || ''
      },
      seo: {
        title: doc.seo?.title || '',
        description: doc.seo?.description || '',
        keywords: doc.seo?.keywords || [],
        ogImageMediaId: doc.seo?.ogImageMediaId?.toString(),
        ogImageUrl
      },
      navigation: {
        links: navLinks
      },
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Generic section update wrapper with audit logging.
   */
  private static async updateSection(
    actorId: string,
    sectionName: string,
    updateFn: (doc: IOrganizationWebsiteDocument) => Promise<void>
  ): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    let doc = await OrganizationWebsiteModel.findOne({ tenantId });

    if (!doc) {
      await this.getWebsiteSettings();
      doc = await OrganizationWebsiteModel.findOne({ tenantId });
    }

    if (!doc) throw new Error('Failed to find or initialize website settings');

    await updateFn(doc);
    doc.updatedBy = new Types.ObjectId(actorId);
    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: `organization.website.${sectionName}_updated`,
      resource: 'OrganizationWebsite',
      resourceId: doc._id.toString(),
      metadata: { section: sectionName }
    });

    return this.getWebsiteSettings();
  }

  public static async updateBranding(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const validated = UpdateWebsiteBrandingSchema.parse(payload);

    await Promise.all([
      this.validateMediaOwnership(validated.logoMediaId, tenantId, 'logo'),
      this.validateMediaOwnership(validated.faviconMediaId, tenantId, 'favicon')
    ]);

    return this.updateSection(actorId, 'branding', async (doc) => {
      if (!doc.branding) doc.branding = { organizationName: 'DIDM Academy', primaryColor: '#BE1E2E', secondaryColor: '#1F2937' };
      if (validated.organizationName !== undefined) doc.branding.organizationName = validated.organizationName;
      if (validated.tagline !== undefined) doc.branding.tagline = validated.tagline;
      if (validated.primaryColor !== undefined) doc.branding.primaryColor = validated.primaryColor;
      if (validated.secondaryColor !== undefined) doc.branding.secondaryColor = validated.secondaryColor;
      if (validated.accentColor !== undefined) doc.branding.accentColor = validated.accentColor;
      if (validated.headingFont !== undefined) doc.branding.headingFont = validated.headingFont;
      if (validated.bodyFont !== undefined) doc.branding.bodyFont = validated.bodyFont;
      if (validated.borderRadius !== undefined) doc.branding.borderRadius = validated.borderRadius;

      if (validated.logoMediaId !== undefined) {
        doc.branding.logoMediaId = validated.logoMediaId ? new Types.ObjectId(validated.logoMediaId) : undefined;
      }
      if (validated.faviconMediaId !== undefined) {
        doc.branding.faviconMediaId = validated.faviconMediaId ? new Types.ObjectId(validated.faviconMediaId) : undefined;
      }
    });
  }

  public static async updateHero(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const validated = UpdateWebsiteHeroSchema.parse(payload);

    await this.validateMediaOwnership(validated.backgroundMediaId, tenantId, 'hero background');

    return this.updateSection(actorId, 'hero', async (doc) => {
      if (!doc.homepage) {
        doc.homepage = {
          hero: { enabled: true, title: 'Master Skills' },
          about: { enabled: true },
          featuredCourses: { enabled: true, courseIds: [], limit: 6 },
          cta: { enabled: true }
        };
      }
      if (!doc.homepage.hero) {
        doc.homepage.hero = { enabled: true, title: 'Master Skills' };
      }

      if (validated.enabled !== undefined) doc.homepage.hero.enabled = validated.enabled;
      if (validated.eyebrow !== undefined) doc.homepage.hero.eyebrow = validated.eyebrow;
      if (validated.title !== undefined) doc.homepage.hero.title = validated.title || 'Master Skills';
      if (validated.subtitle !== undefined) doc.homepage.hero.subtitle = validated.subtitle;

      if (validated.backgroundMediaId !== undefined) {
        doc.homepage.hero.backgroundImageMediaId = validated.backgroundMediaId ? new Types.ObjectId(validated.backgroundMediaId) : undefined;
      }

      if (validated.primaryButton) {
        if (!doc.homepage.hero.primaryButton) doc.homepage.hero.primaryButton = {};
        if (validated.primaryButton.label !== undefined) doc.homepage.hero.primaryButton.label = validated.primaryButton.label;
        if (validated.primaryButton.href !== undefined) doc.homepage.hero.primaryButton.url = validated.primaryButton.href;
      }

      if (validated.secondaryButton) {
        if (!doc.homepage.hero.secondaryButton) doc.homepage.hero.secondaryButton = {};
        if (validated.secondaryButton.label !== undefined) doc.homepage.hero.secondaryButton.label = validated.secondaryButton.label;
        if (validated.secondaryButton.href !== undefined) doc.homepage.hero.secondaryButton.url = validated.secondaryButton.href;
      }
    });
  }

  public static async updateHomepage(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const validated = UpdateHomepageSchema.parse(payload);

    const courseIds = validated.featuredCourses?.courseIds || validated.featuredCourseIds;
    await this.validateFeaturedCourses(courseIds, tenantId);

    return this.updateSection(actorId, 'homepage', async (doc) => {
      if (!doc.homepage) {
        doc.homepage = {
          hero: { enabled: true, title: 'Master Skills' },
          about: { enabled: true },
          featuredCourses: { enabled: true, courseIds: [], limit: 6 },
          cta: { enabled: true }
        };
      }

      if (validated.hero) {
        if (!doc.homepage.hero) doc.homepage.hero = { enabled: true, title: 'Master Skills' };
        if (validated.hero.enabled !== undefined) doc.homepage.hero.enabled = validated.hero.enabled;
        if (validated.hero.eyebrow !== undefined) doc.homepage.hero.eyebrow = validated.hero.eyebrow;
        if (validated.hero.title !== undefined) doc.homepage.hero.title = validated.hero.title || 'Master Skills';
        if (validated.hero.subtitle !== undefined) doc.homepage.hero.subtitle = validated.hero.subtitle;
        if (validated.hero.backgroundImageMediaId !== undefined) {
          doc.homepage.hero.backgroundImageMediaId = validated.hero.backgroundImageMediaId ? new Types.ObjectId(validated.hero.backgroundImageMediaId) : undefined;
        }
      }

      if (validated.featuredCourses) {
        if (!doc.homepage.featuredCourses) doc.homepage.featuredCourses = { enabled: true, courseIds: [], limit: 6 };
        if (validated.featuredCourses.enabled !== undefined) doc.homepage.featuredCourses.enabled = validated.featuredCourses.enabled;
        if (validated.featuredCourses.title !== undefined) doc.homepage.featuredCourses.title = validated.featuredCourses.title;
        if (validated.featuredCourses.subtitle !== undefined) doc.homepage.featuredCourses.subtitle = validated.featuredCourses.subtitle;
        if (validated.featuredCourses.limit !== undefined) doc.homepage.featuredCourses.limit = validated.featuredCourses.limit;
        if (validated.featuredCourses.courseIds !== undefined) {
          doc.homepage.featuredCourses.courseIds = validated.featuredCourses.courseIds.map((id) => new Types.ObjectId(id));
        }
      }

      if (validated.showFeaturedCourses !== undefined) {
        if (!doc.homepage.featuredCourses) doc.homepage.featuredCourses = { enabled: true, courseIds: [], limit: 6 };
        doc.homepage.featuredCourses.enabled = validated.showFeaturedCourses;
      }

      if (validated.featuredCourseIds !== undefined) {
        if (!doc.homepage.featuredCourses) doc.homepage.featuredCourses = { enabled: true, courseIds: [], limit: 6 };
        doc.homepage.featuredCourses.courseIds = validated.featuredCourseIds.map((id) => new Types.ObjectId(id));
      }

      if (validated.about) {
        if (!doc.homepage.about) doc.homepage.about = { enabled: true };
        if (validated.about.enabled !== undefined) doc.homepage.about.enabled = validated.about.enabled;
        if (validated.about.title !== undefined) doc.homepage.about.title = validated.about.title;
        if (validated.about.description !== undefined) doc.homepage.about.description = validated.about.description;
        if (validated.about.imageMediaId !== undefined) {
          doc.homepage.about.imageMediaId = validated.about.imageMediaId ? new Types.ObjectId(validated.about.imageMediaId) : undefined;
        }
      }

      if (validated.cta) {
        if (!doc.homepage.cta) doc.homepage.cta = { enabled: true };
        if (validated.cta.enabled !== undefined) doc.homepage.cta.enabled = validated.cta.enabled;
        if (validated.cta.title !== undefined) doc.homepage.cta.title = validated.cta.title;
        if (validated.cta.description !== undefined) doc.homepage.cta.description = validated.cta.description;
        if (validated.cta.buttonLabel !== undefined) doc.homepage.cta.buttonLabel = validated.cta.buttonLabel;
        if (validated.cta.buttonUrl !== undefined) doc.homepage.cta.buttonUrl = validated.cta.buttonUrl;
      }

      if (validated.showCategories !== undefined) doc.homepage.showCategories = validated.showCategories;
      if (validated.showTestimonials !== undefined) doc.homepage.showTestimonials = validated.showTestimonials;
    });
  }

  public static async updateAbout(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const validated = UpdateWebsiteAboutSchema.parse(payload);

    await this.validateMediaOwnership(validated.imageMediaId, tenantId, 'about image');

    return this.updateSection(actorId, 'about', async (doc) => {
      if (!doc.homepage) {
        doc.homepage = {
          hero: { enabled: true, title: 'Master Skills' },
          about: { enabled: true },
          featuredCourses: { enabled: true, courseIds: [], limit: 6 },
          cta: { enabled: true }
        };
      }
      if (!doc.homepage.about) doc.homepage.about = { enabled: true };

      if (validated.title !== undefined) doc.homepage.about.title = validated.title;
      if (validated.description !== undefined) doc.homepage.about.description = validated.description;
      if (validated.imageMediaId !== undefined) {
        doc.homepage.about.imageMediaId = validated.imageMediaId ? new Types.ObjectId(validated.imageMediaId) : undefined;
      }
    });
  }

  public static async updateContact(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const validated = UpdateWebsiteContactSchema.parse(payload);
    return this.updateSection(actorId, 'contact', async (doc) => {
      if (!doc.contact) doc.contact = {};
      if (validated.email !== undefined) doc.contact.email = validated.email;
      if (validated.phone !== undefined) doc.contact.phone = validated.phone;
      if (validated.address !== undefined) doc.contact.address = validated.address;
    });
  }

  public static async updateSocialLinks(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const validated = UpdateWebsiteSocialSchema.parse(payload);
    return this.updateSection(actorId, 'socialLinks', async (doc) => {
      if (!doc.footer) doc.footer = { links: [], socialLinks: {} };
      if (!doc.footer.socialLinks) doc.footer.socialLinks = {};

      if (validated.facebook !== undefined) doc.footer.socialLinks.facebook = validated.facebook;
      if (validated.instagram !== undefined) doc.footer.socialLinks.instagram = validated.instagram;
      if (validated.youtube !== undefined) doc.footer.socialLinks.youtube = validated.youtube;
      if (validated.linkedin !== undefined) doc.footer.socialLinks.linkedin = validated.linkedin;
      if (validated.twitter !== undefined) doc.footer.socialLinks.twitter = validated.twitter;
    });
  }

  public static async updateFooter(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const validated = UpdateWebsiteFooterSchema.parse(payload);
    return this.updateSection(actorId, 'footer', async (doc) => {
      if (!doc.footer) doc.footer = { links: [], socialLinks: {} };
      if (validated.description !== undefined) doc.footer.description = validated.description;
      if (validated.copyrightText !== undefined) doc.footer.copyrightText = validated.copyrightText;
      if (validated.links !== undefined) {
        doc.footer.links = validated.links.map((l) => ({ label: l.label, url: l.url || '/' }));
      }
      if (validated.socialLinks) {
        if (!doc.footer.socialLinks) doc.footer.socialLinks = {};
        if (validated.socialLinks.facebook !== undefined) doc.footer.socialLinks.facebook = validated.socialLinks.facebook;
        if (validated.socialLinks.instagram !== undefined) doc.footer.socialLinks.instagram = validated.socialLinks.instagram;
        if (validated.socialLinks.youtube !== undefined) doc.footer.socialLinks.youtube = validated.socialLinks.youtube;
        if (validated.socialLinks.linkedin !== undefined) doc.footer.socialLinks.linkedin = validated.socialLinks.linkedin;
        if (validated.socialLinks.twitter !== undefined) doc.footer.socialLinks.twitter = validated.socialLinks.twitter;
      }
    });
  }

  public static async updateSeo(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const validated = UpdateWebsiteSeoSchema.parse(payload);

    await this.validateMediaOwnership(validated.ogImageMediaId, tenantId, 'SEO OG image');

    return this.updateSection(actorId, 'seo', async (doc) => {
      if (!doc.seo) doc.seo = { keywords: [] };
      if (validated.title !== undefined) doc.seo.title = validated.title;
      if (validated.description !== undefined) doc.seo.description = validated.description;
      if (validated.keywords !== undefined) doc.seo.keywords = validated.keywords;
      if (validated.ogImageMediaId !== undefined) {
        doc.seo.ogImageMediaId = validated.ogImageMediaId ? new Types.ObjectId(validated.ogImageMediaId) : undefined;
      }
    });
  }

  public static async updateNavigation(actorId: string, payload: unknown): Promise<IOrganizationWebsite> {
    const validated = UpdateNavigationSchema.parse(payload);
    return this.updateSection(actorId, 'navigation', async (doc) => {
      if (!doc.navigation) doc.navigation = { items: [] };

      if (validated.items !== undefined) {
        doc.navigation.items = validated.items.map((item) => ({
          label: item.label,
          url: item.url || '/',
          enabled: item.enabled !== false,
          order: item.order
        }));
      } else if (validated.links !== undefined) {
        doc.navigation.items = validated.links.map((link, index) => ({
          label: link.label,
          url: link.href || '/',
          enabled: true,
          order: index + 1
        }));
      }
    });
  }

  /**
   * Publishes draft website settings to public state.
   */
  public static async publishWebsite(actorId: string): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const currentDraft = await this.getWebsiteSettings();

    let doc = await OrganizationWebsiteModel.findOne({ tenantId });
    if (!doc) throw new Error('No draft website configuration found to publish');

    doc.status = 'PUBLISHED';
    doc.publishedAt = new Date();
    doc.publishedConfig = JSON.parse(JSON.stringify(currentDraft));
    doc.updatedBy = new Types.ObjectId(actorId);

    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.website.published',
      resource: 'OrganizationWebsite',
      resourceId: doc._id.toString(),
      metadata: { publishedAt: doc.publishedAt.toISOString() }
    });

    return this.getWebsiteSettings();
  }

  /**
   * Unpublishes public website settings (reverts public status to DRAFT).
   */
  public static async unpublishWebsite(actorId: string): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();

    let doc = await OrganizationWebsiteModel.findOne({ tenantId });
    if (!doc) throw new Error('No website configuration found to unpublish');

    doc.status = 'DRAFT';
    doc.updatedBy = new Types.ObjectId(actorId);

    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.website.unpublished',
      resource: 'OrganizationWebsite',
      resourceId: doc._id.toString(),
      metadata: {}
    });

    return this.getWebsiteSettings();
  }

  /**
   * Admin Preview Endpoint: Retrieves draft website configuration formatted with resolved media URLs.
   */
  public static async getWebsitePreview(actorId: string): Promise<IOrganizationWebsite> {
    const tenantId = this.getTenantId();
    const config = await this.getWebsiteSettings();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'website.settings.previewed',
      resource: 'OrganizationWebsite',
      resourceId: config.id || '',
      metadata: { timestamp: new Date().toISOString() }
    });

    return config;
  }

  /**
   * Retrieves public, sanitized tenant website configuration strictly when status = 'PUBLISHED'.
   */
  public static async getPublicWebsite(tenantId: string): Promise<IPublicWebsiteConfig | null> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) return null;

    const doc = await OrganizationWebsiteModel.findOne({ tenantId });
    if (!doc || doc.status !== 'PUBLISHED') {
      return null;
    }

    const pubConfig: IOrganizationWebsite = doc.publishedConfig as any || (await this.formatWebsiteDocument(doc, tenantId));

    // Resolve featured courses through existing public course visibility rules
    let featuredCourses: any[] = [];
    if (pubConfig.homepage.showFeaturedCourses && pubConfig.homepage.featuredCourseIds.length > 0) {
      const validCourseObjectIds = pubConfig.homepage.featuredCourseIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      const courses = await CourseModel.find({
        _id: { $in: validCourseObjectIds },
        tenantId,
        status: 'PUBLISHED',
        visibility: 'PUBLIC'
      })
        .select('title slug description shortDescription categoryId level durationMinutes thumbnailUrl language')
        .lean();

      featuredCourses = courses.map((course) => ({
        id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        description: course.shortDescription || course.description,
        categoryId: course.categoryId,
        level: course.level,
        durationMinutes: course.durationMinutes,
        thumbnailUrl: course.thumbnailUrl,
        language: course.language
      }));
    }

    // Resolve live media signed URLs for published items
    const [logoUrl, faviconUrl, backgroundUrl, aboutImageUrl, ogImageUrl] = await Promise.all([
      this.resolveMediaUrl(pubConfig.branding.logoMediaId, tenantId),
      this.resolveMediaUrl(pubConfig.branding.faviconMediaId, tenantId),
      this.resolveMediaUrl(pubConfig.hero.backgroundMediaId, tenantId),
      this.resolveMediaUrl(pubConfig.about.imageMediaId, tenantId),
      this.resolveMediaUrl(pubConfig.seo.ogImageMediaId, tenantId)
    ]);

    return {
      status: 'PUBLISHED',
      branding: {
        ...pubConfig.branding,
        logoUrl: logoUrl || pubConfig.branding.logoUrl,
        faviconUrl: faviconUrl || pubConfig.branding.faviconUrl
      },
      hero: {
        ...pubConfig.hero,
        backgroundUrl: backgroundUrl || pubConfig.hero.backgroundUrl
      },
      homepage: {
        showFeaturedCourses: pubConfig.homepage.showFeaturedCourses,
        featuredCourses,
        showCategories: pubConfig.homepage.showCategories,
        showAbout: pubConfig.homepage.showAbout,
        showTestimonials: pubConfig.homepage.showTestimonials,
        showContact: pubConfig.homepage.showContact
      },
      about: {
        ...pubConfig.about,
        imageUrl: aboutImageUrl || pubConfig.about.imageUrl
      },
      contact: pubConfig.contact,
      socialLinks: pubConfig.socialLinks,
      footer: pubConfig.footer,
      seo: {
        ...pubConfig.seo,
        ogImageUrl: ogImageUrl || pubConfig.seo.ogImageUrl
      },
      navigation: pubConfig.navigation,
      publishedAt: doc.publishedAt
    };
  }
}
