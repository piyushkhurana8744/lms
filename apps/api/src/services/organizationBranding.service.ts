import { Types } from 'mongoose';
import {
  OrganizationBrandingModel,
  IOrganizationBrandingDocument,
  MediaModel,
  TenantModel,
  OrganizationSettingsModel
} from '@edtech/database';
import { UpdateOrganizationBrandingSchema } from '@edtech/validation';
import { IOrganizationBranding, IPublicTenantBranding } from '@edtech/types';
import { StorageProviderFactory } from './storage/storageProviderFactory';
import { AuditService } from './audit.service';
import { NotFoundError, BadRequestError } from '../errors/appError';
import { logger } from '@edtech/utils';

export class OrganizationBrandingService {
  /**
   * Helper to resolve signed or direct URL for a Media ID, verifying tenant ownership.
   */
  private static async resolveMediaUrl(
    mediaId?: Types.ObjectId | string | null,
    tenantId?: string
  ): Promise<string | undefined> {
    if (!mediaId) return undefined;
    const media = await MediaModel.findOne({
      _id: mediaId,
      tenantId,
      status: { $ne: 'DELETED' }
    });

    if (!media) return undefined;

    try {
      const provider = await StorageProviderFactory.getTenantStorageProvider(tenantId || '');
      if (provider) {
        return await provider.getSignedUrl(media.storageKey);
      }
    } catch {
      // Fallback to media.url if signed URL generation fails
    }

    return media.url;
  }

  /**
   * Validates that media assets referenced in payload belong strictly to the current tenant.
   */
  private static async validateMediaOwnership(
    mediaId: string | undefined | null,
    tenantId: string,
    fieldName: string
  ): Promise<void> {
    if (!mediaId || !Types.ObjectId.isValid(mediaId)) return;
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
   * Retrieves or initializes default tenant-isolated Organization Branding.
   */
  public static async getBranding(tenantId: string): Promise<IOrganizationBranding> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    let doc = await OrganizationBrandingModel.findOne({ tenantId });

    if (!doc) {
      const settings = await OrganizationSettingsModel.findOne({ tenantId });
      const tenant = await TenantModel.findById(tenantId);
      const orgName = settings?.profile?.organizationName || tenant?.name || 'DIDM LMS Organization';

      doc = await OrganizationBrandingModel.create({
        tenantId,
        organizationName: orgName,
        primaryColor: '#BE1E2E',
        secondaryColor: '#1F2937',
        accentColor: '#F59E0B',
        fontFamily: 'Inter',
        loginPage: {
          showLogo: true,
          headline: 'Welcome to your Learning Portal',
          description: 'Start learning today'
        },
        browser: {
          title: `${orgName} | Learning Management System`
        },
        social: {}
      });
    }

    const [
      logoUrl,
      faviconUrl,
      loginBgUrl,
      ogImageUrl,
      twitterImageUrl
    ] = await Promise.all([
      this.resolveMediaUrl(doc.logoMediaId, tenantId),
      this.resolveMediaUrl(doc.faviconMediaId || doc.browser?.faviconMediaId, tenantId),
      this.resolveMediaUrl(doc.loginPage?.backgroundImageMediaId, tenantId),
      this.resolveMediaUrl(doc.social?.ogImageMediaId, tenantId),
      this.resolveMediaUrl(doc.social?.twitterImageMediaId, tenantId)
    ]);

    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      organizationName: doc.organizationName,
      logoMediaId: doc.logoMediaId?.toString(),
      logoUrl,
      faviconMediaId: doc.faviconMediaId?.toString(),
      faviconUrl,
      primaryColor: doc.primaryColor || '#BE1E2E',
      secondaryColor: doc.secondaryColor || '#1F2937',
      accentColor: doc.accentColor || '#F59E0B',
      backgroundColor: doc.backgroundColor,
      surfaceColor: doc.surfaceColor,
      textColor: doc.textColor,
      fontFamily: doc.fontFamily || 'Inter',
      loginPage: {
        showLogo: doc.loginPage?.showLogo !== false,
        headline: doc.loginPage?.headline || '',
        description: doc.loginPage?.description || '',
        backgroundImageMediaId: doc.loginPage?.backgroundImageMediaId?.toString(),
        backgroundImageUrl: loginBgUrl
      },
      browser: {
        title: doc.browser?.title || doc.organizationName || '',
        faviconMediaId: doc.browser?.faviconMediaId?.toString() || doc.faviconMediaId?.toString(),
        faviconUrl
      },
      social: {
        ogImageMediaId: doc.social?.ogImageMediaId?.toString(),
        ogImageUrl,
        twitterImageMediaId: doc.social?.twitterImageMediaId?.toString(),
        twitterImageUrl
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  /**
   * Updates tenant-isolated Organization Branding.
   */
  public static async updateBranding(
    tenantId: string,
    actorId: string,
    payload: unknown
  ): Promise<IOrganizationBranding> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const validated = UpdateOrganizationBrandingSchema.parse(payload);

    // Validate media ownership for any provided media IDs
    await Promise.all([
      this.validateMediaOwnership(validated.logoMediaId, tenantId, 'logo'),
      this.validateMediaOwnership(validated.faviconMediaId, tenantId, 'favicon'),
      this.validateMediaOwnership(validated.loginPage?.backgroundImageMediaId, tenantId, 'login background'),
      this.validateMediaOwnership(validated.browser?.faviconMediaId, tenantId, 'browser favicon'),
      this.validateMediaOwnership(validated.social?.ogImageMediaId, tenantId, 'OG image'),
      this.validateMediaOwnership(validated.social?.twitterImageMediaId, tenantId, 'Twitter image')
    ]);

    let doc = await OrganizationBrandingModel.findOne({ tenantId });

    if (!doc) {
      doc = new OrganizationBrandingModel({
        tenantId,
        createdBy: actorId
      });
    }

    if (validated.organizationName !== undefined) doc.organizationName = validated.organizationName;
    if (validated.logoMediaId !== undefined) {
      doc.logoMediaId = validated.logoMediaId ? new Types.ObjectId(validated.logoMediaId) : undefined;
    }
    if (validated.faviconMediaId !== undefined) {
      doc.faviconMediaId = validated.faviconMediaId ? new Types.ObjectId(validated.faviconMediaId) : undefined;
    }
    if (validated.primaryColor !== undefined) doc.primaryColor = validated.primaryColor;
    if (validated.secondaryColor !== undefined) doc.secondaryColor = validated.secondaryColor;
    if (validated.accentColor !== undefined) doc.accentColor = validated.accentColor;
    if (validated.backgroundColor !== undefined) doc.backgroundColor = validated.backgroundColor;
    if (validated.surfaceColor !== undefined) doc.surfaceColor = validated.surfaceColor;
    if (validated.textColor !== undefined) doc.textColor = validated.textColor;
    if (validated.fontFamily !== undefined) doc.fontFamily = validated.fontFamily;

    if (validated.loginPage) {
      if (!doc.loginPage) doc.loginPage = { showLogo: true };
      if (validated.loginPage.showLogo !== undefined) doc.loginPage.showLogo = validated.loginPage.showLogo;
      if (validated.loginPage.headline !== undefined) doc.loginPage.headline = validated.loginPage.headline;
      if (validated.loginPage.description !== undefined) doc.loginPage.description = validated.loginPage.description;
      if (validated.loginPage.backgroundImageMediaId !== undefined) {
        doc.loginPage.backgroundImageMediaId = validated.loginPage.backgroundImageMediaId
          ? new Types.ObjectId(validated.loginPage.backgroundImageMediaId)
          : undefined;
      }
    }

    if (validated.browser) {
      if (!doc.browser) doc.browser = {};
      if (validated.browser.title !== undefined) doc.browser.title = validated.browser.title;
      if (validated.browser.faviconMediaId !== undefined) {
        doc.browser.faviconMediaId = validated.browser.faviconMediaId
          ? new Types.ObjectId(validated.browser.faviconMediaId)
          : undefined;
      }
    }

    if (validated.social) {
      if (!doc.social) doc.social = {};
      if (validated.social.ogImageMediaId !== undefined) {
        doc.social.ogImageMediaId = validated.social.ogImageMediaId
          ? new Types.ObjectId(validated.social.ogImageMediaId)
          : undefined;
      }
      if (validated.social.twitterImageMediaId !== undefined) {
        doc.social.twitterImageMediaId = validated.social.twitterImageMediaId
          ? new Types.ObjectId(validated.social.twitterImageMediaId)
          : undefined;
      }
    }

    doc.updatedBy = new Types.ObjectId(actorId);
    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.branding.updated',
      resource: 'OrganizationBranding',
      resourceId: doc._id.toString(),
      metadata: { changedSections: Object.keys(validated) }
    });

    return this.getBranding(tenantId);
  }

  /**
   * Resets tenant-isolated Organization Branding back to platform defaults.
   */
  public static async resetBranding(tenantId: string, actorId: string): Promise<IOrganizationBranding> {
    if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
      throw new Error('Valid tenant identity required');
    }

    const settings = await OrganizationSettingsModel.findOne({ tenantId });
    const tenant = await TenantModel.findById(tenantId);
    const orgName = settings?.profile?.organizationName || tenant?.name || 'DIDM LMS Organization';

    let doc = await OrganizationBrandingModel.findOne({ tenantId });

    if (!doc) {
      doc = new OrganizationBrandingModel({ tenantId });
    }

    doc.organizationName = orgName;
    doc.logoMediaId = undefined;
    doc.faviconMediaId = undefined;
    doc.primaryColor = '#BE1E2E';
    doc.secondaryColor = '#1F2937';
    doc.accentColor = '#F59E0B';
    doc.backgroundColor = undefined;
    doc.surfaceColor = undefined;
    doc.textColor = undefined;
    doc.fontFamily = 'Inter';
    doc.loginPage = {
      showLogo: true,
      headline: 'Welcome to your Learning Portal',
      description: 'Start learning today',
      backgroundImageMediaId: undefined
    };
    doc.browser = {
      title: `${orgName} | Learning Management System`,
      faviconMediaId: undefined
    };
    doc.social = {};
    doc.updatedBy = new Types.ObjectId(actorId);

    await doc.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'organization.branding.reset',
      resource: 'OrganizationBranding',
      resourceId: doc._id.toString()
    });

    return this.getBranding(tenantId);
  }

  /**
   * Retrieves public, sanitized tenant branding configuration.
   */
  public static async getPublicBranding(tenantId: string): Promise<IPublicTenantBranding> {
    const branding = await this.getBranding(tenantId);

    return {
      organizationName: branding.organizationName || 'DIDM LMS',
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor || '#BE1E2E',
      secondaryColor: branding.secondaryColor || '#1F2937',
      accentColor: branding.accentColor || '#F59E0B',
      backgroundColor: branding.backgroundColor,
      surfaceColor: branding.surfaceColor,
      textColor: branding.textColor,
      fontFamily: branding.fontFamily || 'Inter',
      loginPage: {
        showLogo: branding.loginPage?.showLogo !== false,
        headline: branding.loginPage?.headline,
        description: branding.loginPage?.description,
        backgroundImageUrl: branding.loginPage?.backgroundImageUrl
      },
      browser: {
        title: branding.browser?.title,
        faviconUrl: branding.browser?.faviconUrl || branding.faviconUrl
      },
      social: {
        ogImageUrl: branding.social?.ogImageUrl,
        twitterImageUrl: branding.social?.twitterImageUrl
      }
    };
  }
}
