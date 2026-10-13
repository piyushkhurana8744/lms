import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ITenantDocument, OrganizationSettingsModel, IOrganizationSettingsDocument } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { PublicTenantService, HostnameType } from '../services/publicTenant.service';

export interface PublicTenantContext {
  tenantId: Types.ObjectId;
  tenant: ITenantDocument;
  organizationSettings: IOrganizationSettingsDocument;
  host: string;
  hostnameType: HostnameType;
}

declare global {
  namespace Express {
    interface Request {
      publicTenantContext?: PublicTenantContext;
    }
  }
}

/**
 * Public Tenant Middleware for Unauthenticated Visitor Requests
 * Resolves tenant strictly from Host header.
 * Attaches request-scoped `publicTenantContext` and initializes `tenantContextStorage`.
 * Returns generic 404 Website not found if domain is unmapped.
 */
export async function publicTenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const rawHost = (req.headers.host as string) || (req.headers['x-forwarded-host'] as string) || '';
    const normalizedHost = PublicTenantService.normalizeHost(rawHost);

    const resolved = await PublicTenantService.resolveTenantFromHost(rawHost);

    if (!resolved || !resolved.tenant) {
      return res.status(404).json({
        success: false,
        message: 'Website not found'
      });
    }

    const tenant = resolved.tenant;
    const tenantIdObj = (tenant._id as unknown) as Types.ObjectId;

    let settings = await OrganizationSettingsModel.findOne({ tenantId: tenant._id }).lean();
    if (!settings) {
      settings = {
        tenantId: tenantIdObj,
        profile: {
          organizationName: tenant.branding?.companyName || tenant.name,
          supportEmail: '',
          supportPhone: '',
          address: '',
          timezone: 'UTC',
          defaultLanguage: 'English',
          currency: 'USD'
        },
        lmsPreferences: {
          allowStudentSelfRegistration: false,
          requireEmailVerification: true,
          allowInstructorRegistration: false,
          maintenanceMode: false
        }
      } as any;
    }

    const publicContext: PublicTenantContext = {
      tenantId: tenantIdObj,
      tenant,
      organizationSettings: (settings as unknown) as IOrganizationSettingsDocument,
      host: normalizedHost,
      hostnameType: resolved.hostnameType
    };

    req.publicTenantContext = publicContext;

    tenantContextStorage.run(
      {
        currentTenantId: tenant._id.toString(),
        isPlatformContext: false
      },
      () => next()
    );
  } catch (error) {
    next(error);
  }
}
