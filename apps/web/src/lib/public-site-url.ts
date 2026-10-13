/**
 * Public Site URL Resolver Helper
 * Resolves tenant public website URL based on environment or tenant configuration.
 */
export function getPublicSiteUrl(tenant?: { slug?: string | null; customDomain?: string | null }): string {
  // Configurable environment variable override
  if (process.env.NEXT_PUBLIC_PUBLIC_WEB_URL) {
    return process.env.NEXT_PUBLIC_PUBLIC_WEB_URL;
  }

  // Custom domain if verified and present
  if (tenant?.customDomain) {
    return `https://${tenant.customDomain}`;
  }

  // Subdomain / tenant slug
  if (tenant?.slug && tenant.slug !== 'didm') {
    return `https://${tenant.slug}.didmlms.com`;
  }

  // Same-origin fallback stays identical during SSR and hydration.
  return '/';
}
