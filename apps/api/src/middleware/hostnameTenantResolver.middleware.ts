import { Request, Response, NextFunction } from 'express';
import { tenantContextStorage } from '@edtech/utils';
import { OrganizationDomainService } from '../services/organizationDomain.service';
import { TenantModel } from '@edtech/database';

/**
 * Hostname Tenant Resolver Middleware
 * Resolves tenant identity from incoming HTTP host header (e.g. `didm.platform.com` or `learn.academy.com`).
 */
export async function hostnameTenantResolverMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const rawHost = (req.headers.host as string) || (req.headers['x-forwarded-host'] as string) || '';
    const resolvedTenantId = await OrganizationDomainService.resolveTenantByHostname(rawHost);

    let tenantId = resolvedTenantId;

    // Fallback: headers/query for localhost dev or API testing if hostname resolution returns null
    if (!tenantId) {
      const explicitHeaderTenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
      const explicitSlug = (req.headers['x-tenant-slug'] as string) || (req.query.tenantSlug as string);

      if (explicitHeaderTenantId) {
        tenantId = explicitHeaderTenantId;
      } else if (explicitSlug) {
        const tenant = await TenantModel.findOne({ slug: explicitSlug.toLowerCase(), status: 'ACTIVE' }).lean();
        if (tenant) {
          tenantId = tenant._id.toString();
        }
      }
    }

    // Default fallback to first active tenant for local development
    if (!tenantId) {
      const defaultTenant = await TenantModel.findOne({ status: 'ACTIVE' }).sort({ createdAt: 1 }).lean();
      if (defaultTenant) {
        tenantId = defaultTenant._id.toString();
      }
    }

    if (!tenantId) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'No active tenant workspace resolved for this hostname' }
      });
    }

    // Run request within active tenantContextStorage
    tenantContextStorage.run(
      {
        currentTenantId: tenantId,
        isPlatformContext: false
      },
      () => next()
    );
  } catch (error) {
    next(error);
  }
}
