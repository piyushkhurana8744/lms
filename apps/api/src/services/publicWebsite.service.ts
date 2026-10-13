import { Request } from 'express';
import { Types } from 'mongoose';
import { TenantModel, OrganizationSettingsModel } from '@edtech/database';
import { OrganizationBrandingService } from './organizationBranding.service';
import { PublicTenantContext } from '../middleware/publicTenant.middleware';

export interface PublicOrganizationResponse {
  name: string;
  supportEmail: string;
  supportPhone?: string;
  address?: string;
  timezone: string;
  defaultLanguage: string;
  currency: string;
  branding: {
    companyName: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    fontFamily?: string;
    showPlatformBranding: boolean;
  };
}

export class PublicWebsiteService {
  /**
   * Helper to retrieve request-scoped PublicTenantContext from Express Request.
   */
  public static getPublicTenantContext(req: Request): PublicTenantContext | undefined {
    return req.publicTenantContext;
  }

  /**
   * Generates a safe, public-facing organization profile and branding DTO.
   * Strips internal tenant IDs, database credentials, R2/S3 keys, SMTP secrets, and private configuration.
   */
  public static async getPublicOrganization(tenantId: Types.ObjectId | string): Promise<PublicOrganizationResponse | null> {
    const tenantIdStr = tenantId.toString();

    const tenant = await TenantModel.findById(tenantIdStr).lean();
    if (!tenant || tenant.status !== 'ACTIVE') {
      return null;
    }

    const settingsDoc = await OrganizationSettingsModel.findOne({ tenantId: tenantIdStr }).lean();
    const brandingDoc = await OrganizationBrandingService.getPublicBranding(tenantIdStr);

    const profile = settingsDoc?.profile || {
      organizationName: tenant.branding?.companyName || tenant.name,
      supportEmail: '',
      supportPhone: '',
      address: '',
      timezone: 'UTC',
      defaultLanguage: 'English',
      currency: 'USD'
    };

    return {
      name: brandingDoc?.organizationName || profile.organizationName || tenant.name,
      supportEmail: profile.supportEmail || '',
      supportPhone: profile.supportPhone || '',
      address: profile.address || '',
      timezone: profile.timezone || 'UTC',
      defaultLanguage: profile.defaultLanguage || 'English',
      currency: profile.currency || 'USD',
      branding: {
        companyName: brandingDoc?.organizationName || tenant.name,
        logoUrl: brandingDoc?.logoUrl || tenant.branding?.logoUrl || '/didmlogo.png',
        faviconUrl: brandingDoc?.faviconUrl || tenant.branding?.faviconUrl || '/didmfavicon.png',
        primaryColor: brandingDoc?.primaryColor || tenant.branding?.primaryColor || '#BE1E2E',
        secondaryColor: brandingDoc?.secondaryColor || tenant.branding?.secondaryColor || '#1F2937',
        accentColor: brandingDoc?.accentColor || '#F59E0B',
        fontFamily: brandingDoc?.fontFamily || 'Inter',
        showPlatformBranding: tenant.branding?.showPlatformBranding ?? true
      }
    };
  }
}
