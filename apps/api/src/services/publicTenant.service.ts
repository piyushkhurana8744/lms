import { TenantModel, OrganizationDomainModel, ITenantDocument } from '@edtech/database';
import { logger } from '@edtech/utils';

export type HostnameType = 'PLATFORM' | 'SUBDOMAIN' | 'CUSTOM_DOMAIN' | 'DEVELOPMENT';

export interface ResolvedTenantResult {
  tenant: ITenantDocument;
  hostnameType: HostnameType;
}

interface CacheEntry {
  result: ResolvedTenantResult | null;
  expiresAt: number;
}

export class PublicTenantService {
  private static cache = new Map<string, CacheEntry>();
  private static CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

  /**
   * Normalizes incoming hostname string.
   * - Lowercases and trims
   * - Strips http:// or https:// protocol
   * - Strips path and query string
   * - Strips port numbers (e.g. `localhost:3000` -> `localhost`, `acme.example.com:8080` -> `acme.example.com`)
   * - Strips trailing dot (`example.com.` -> `example.com`)
   * - Handles IPv6 bracket notation safely (e.g. `[::1]:3000` -> `::1`)
   */
  public static normalizeHost(rawHost: string): string {
    if (!rawHost || typeof rawHost !== 'string') {
      return '';
    }

    let cleaned = rawHost.trim().toLowerCase();

    // Strip protocol
    cleaned = cleaned.replace(/^https?:\/\//i, '');

    // Strip path and query parameters
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];

    // Handle IPv6 enclosed in brackets
    if (cleaned.startsWith('[')) {
      const closingBracketIndex = cleaned.indexOf(']');
      if (closingBracketIndex !== -1) {
        cleaned = cleaned.substring(1, closingBracketIndex);
      }
    } else {
      // Strip port for normal hosts/IPv4
      cleaned = cleaned.split(':')[0];
    }

    // Strip trailing dot
    cleaned = cleaned.replace(/\.$/, '');

    return cleaned;
  }

  /**
   * Resolves tenant from request Host header using ordered resolution logic:
   * A. Exact custom domain match
   * B. Configured tenant subdomain match
   * C. Development fallback if explicitly configured and running in dev/test mode
   * D. Return null (tenant not found)
   */
  public static async resolveTenantFromHost(rawHost: string): Promise<ResolvedTenantResult | null> {
    const normalizedHost = this.normalizeHost(rawHost);

    if (!normalizedHost) {
      return null;
    }

    // Check in-memory cache
    const now = Date.now();
    const cached = this.cache.get(normalizedHost);
    if (cached && cached.expiresAt > now) {
      return cached.result;
    }

    let result: ResolvedTenantResult | null = null;

    try {
      // A. Exact Custom Domain Match
      const customDomainDoc = await OrganizationDomainModel.findOne({
        customDomain: normalizedHost,
        status: { $in: ['VERIFIED', 'ACTIVE'] }
      }).lean();

      if (customDomainDoc) {
        const tenant = await TenantModel.findOne({
          _id: customDomainDoc.tenantId,
          status: 'ACTIVE'
        }).lean();

        if (tenant) {
          result = { tenant: (tenant as unknown) as ITenantDocument, hostnameType: 'CUSTOM_DOMAIN' };
        }
      }

      // Also check TenantModel.customDomain fallback if verified
      if (!result) {
        const tenantByCustomDomain = await TenantModel.findOne({
          customDomain: normalizedHost,
          isCustomDomainVerified: true,
          status: 'ACTIVE'
        }).lean();

        if (tenantByCustomDomain) {
          result = { tenant: (tenantByCustomDomain as unknown) as ITenantDocument, hostnameType: 'CUSTOM_DOMAIN' };
        }
      }

      // B. Tenant Subdomain Match
      if (!result) {
        // 1. Direct platformSubdomain match in OrganizationDomainModel
        const platformDomainDoc = await OrganizationDomainModel.findOne({
          platformSubdomain: normalizedHost
        }).lean();

        if (platformDomainDoc) {
          const tenant = await TenantModel.findOne({
            _id: platformDomainDoc.tenantId,
            status: 'ACTIVE'
          }).lean();

          if (tenant) {
            result = { tenant: (tenant as unknown) as ITenantDocument, hostnameType: 'SUBDOMAIN' };
          }
        }
      }

      if (!result) {
        // 2. Subdomain extraction matching TenantModel slug
        const platformDomain = (process.env.PUBLIC_PLATFORM_DOMAIN || 'platform.com').toLowerCase();

        if (normalizedHost.endsWith(`.${platformDomain}`)) {
          const slug = normalizedHost.replace(`.${platformDomain}`, '');
          if (slug && !slug.includes('.')) {
            const tenantBySlug = await TenantModel.findOne({
              slug,
              status: 'ACTIVE'
            }).lean();

            if (tenantBySlug) {
              result = { tenant: (tenantBySlug as unknown) as ITenantDocument, hostnameType: 'SUBDOMAIN' };
            }
          }
        } else if (normalizedHost.includes('.')) {
          // General subdomain check (e.g., `acme.example.com` -> `acme`)
          const parts = normalizedHost.split('.');
          if (parts.length >= 3) {
            const possibleSlug = parts[0];
            const tenantBySlug = await TenantModel.findOne({
              slug: possibleSlug,
              status: 'ACTIVE'
            }).lean();

            if (tenantBySlug) {
              result = { tenant: (tenantBySlug as unknown) as ITenantDocument, hostnameType: 'SUBDOMAIN' };
            }
          }
        }
      }

      // C. Platform Domain / Primary Host / Fallback
      if (!result) {
        const platformHost = process.env.DOMAIN ? this.normalizeHost(process.env.DOMAIN) : '';
        const isPlatformHost = Boolean(platformHost && (normalizedHost === platformHost || normalizedHost.endsWith(`.${platformHost}`)));
        const isDevOrTest = process.env.NODE_ENV !== 'production';
        const isLocalHost =
          normalizedHost === 'localhost' ||
          normalizedHost === '127.0.0.1' ||
          normalizedHost === '::1' ||
          normalizedHost === '0.0.0.0';

        const configuredDefaultTenantId = process.env.PUBLIC_DEFAULT_TENANT_ID;

        if (configuredDefaultTenantId) {
          const defaultTenant = await TenantModel.findOne({
            _id: configuredDefaultTenantId,
            status: 'ACTIVE'
          }).lean();

          if (defaultTenant) {
            result = { tenant: (defaultTenant as unknown) as ITenantDocument, hostnameType: 'PLATFORM' };
          }
        }

        // If accessing via the primary deployed domain, or local dev, or fallback:
        if (!result && (isPlatformHost || (isDevOrTest && isLocalHost) || process.env.PUBLIC_DEFAULT_TENANT_SLUG)) {
          const targetSlug = process.env.PUBLIC_DEFAULT_TENANT_SLUG || 'didm';
          const tenantBySlug = await TenantModel.findOne({
            slug: targetSlug,
            status: 'ACTIVE'
          }).lean();

          if (tenantBySlug) {
            result = { tenant: (tenantBySlug as unknown) as ITenantDocument, hostnameType: 'PLATFORM' };
          } else {
            // First active tenant fallback
            const fallbackTenant = await TenantModel.findOne({ status: 'ACTIVE' })
              .sort({ createdAt: 1 })
              .lean();

            if (fallbackTenant) {
              result = { tenant: (fallbackTenant as unknown) as ITenantDocument, hostnameType: 'PLATFORM' };
            }
          }
        }
      }

      // Store in cache
      this.cache.set(normalizedHost, {
        result,
        expiresAt: now + this.CACHE_TTL_MS
      });

      if (!result) {
        logger.info(`[PublicTenantService] Unresolved host: ${normalizedHost}`);
      }

      return result;
    } catch (error) {
      logger.error(`[PublicTenantService] Error resolving host '${normalizedHost}':`, error);
      return null;
    }
  }

  /**
   * Clears the in-memory hostname cache (for testing or when tenant domains change).
   */
  public static clearCache(): void {
    this.cache.clear();
  }
}
