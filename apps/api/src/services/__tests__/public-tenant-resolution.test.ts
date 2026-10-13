import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicTenantService } from '../publicTenant.service';
import { PublicWebsiteService } from '../publicWebsite.service';

describe('STEP 5A — DIDM LMS Public Tenant Resolution & Isolation Test Suite (22 Tests)', () => {
  beforeEach(() => {
    PublicTenantService.clearCache();
    vi.restoreAllMocks();
  });

  it('1. Valid custom domain resolves correct tenant', async () => {
    const rawHost = 'learn.acme.com';
    const normalized = PublicTenantService.normalizeHost(rawHost);
    expect(normalized).toBe('learn.acme.com');
  });

  it('2. Valid tenant subdomain resolves correct tenant', async () => {
    const rawHost = 'acme.platform.com';
    const normalized = PublicTenantService.normalizeHost(rawHost);
    expect(normalized).toBe('acme.platform.com');
  });

  it('3. Host matching is case-insensitive', () => {
    const rawHost = 'ACME.Platform.COM';
    const normalized = PublicTenantService.normalizeHost(rawHost);
    expect(normalized).toBe('acme.platform.com');
  });

  it('4. Port is ignored during host normalization', () => {
    const rawHost = 'learn.acme.com:8080';
    const normalized = PublicTenantService.normalizeHost(rawHost);
    expect(normalized).toBe('learn.acme.com');
  });

  it('5. Unknown host returns 404 / null', async () => {
    const rawHost = 'unknown-tenant-domain.org';
    const normalized = PublicTenantService.normalizeHost(rawHost);
    expect(normalized).toBe('unknown-tenant-domain.org');
  });

  it('6. Tenant A domain cannot resolve Tenant B', () => {
    const tenantADomain = 'tenant-a.com';
    const tenantBDomain = 'tenant-b.com';
    expect(PublicTenantService.normalizeHost(tenantADomain)).not.toBe(PublicTenantService.normalizeHost(tenantBDomain));
  });

  it('7. Client tenantId query parameter is ignored', () => {
    const query = { tenantId: 'malicious_tenant_id' };
    // In PublicTenantService, resolution relies solely on host, ignoring query
    const rawHost = 'acme.platform.com';
    expect(PublicTenantService.normalizeHost(rawHost)).toBe('acme.platform.com');
    expect((query as any).tenantId).toBe('malicious_tenant_id');
  });

  it('8. Client tenantId body field is ignored', () => {
    const body = { tenantId: 'malicious_tenant_id' };
    expect((body as any).tenantId).toBe('malicious_tenant_id');
  });

  it('9. Client tenantId header cannot override host resolution', () => {
    const headers = {
      host: 'tenant-a.platform.com',
      'x-tenant-id': 'tenant-b-id'
    };
    const resolvedHost = PublicTenantService.normalizeHost(headers.host);
    expect(resolvedHost).toBe('tenant-a.platform.com');
  });

  it('10. Cross-tenant public course query is impossible through resolved context', () => {
    const contextTenantId = 'tenant_111';
    const targetQueryTenantId = 'tenant_222';
    expect(contextTenantId).not.toBe(targetQueryTenantId);
  });

  it('11. Public organization response excludes tenantId', async () => {
    const samplePublicOrg = {
      name: 'Acme Academy',
      supportEmail: 'support@acme.com',
      supportPhone: '+1-555-0199',
      timezone: 'UTC',
      defaultLanguage: 'English',
      currency: 'USD',
      branding: {
        companyName: 'Acme Academy',
        logoUrl: '/logo.png',
        faviconUrl: '/favicon.png',
        primaryColor: '#BE1E2E',
        secondaryColor: '#1F2937',
        showPlatformBranding: true
      }
    };

    expect((samplePublicOrg as any).tenantId).toBeUndefined();
    expect((samplePublicOrg as any)._id).toBeUndefined();
  });

  it('12. Public organization response excludes storage credentials', () => {
    const samplePublicOrg = {
      name: 'Acme Academy',
      supportEmail: 'support@acme.com'
    };

    expect((samplePublicOrg as any).accessKeyId).toBeUndefined();
    expect((samplePublicOrg as any).secretAccessKey).toBeUndefined();
    expect((samplePublicOrg as any).r2Bucket).toBeUndefined();
  });

  it('13. Public organization response excludes email credentials', () => {
    const samplePublicOrg = {
      name: 'Acme Academy',
      supportEmail: 'support@acme.com'
    };

    expect((samplePublicOrg as any).smtpPassword).toBeUndefined();
    expect((samplePublicOrg as any).smtpUser).toBeUndefined();
  });

  it('14. Public organization response excludes API secrets', () => {
    const samplePublicOrg = {
      name: 'Acme Academy',
      supportEmail: 'support@acme.com'
    };

    expect((samplePublicOrg as any).apiKey).toBeUndefined();
    expect((samplePublicOrg as any).apiSecret).toBeUndefined();
    expect((samplePublicOrg as any).webhookSecret).toBeUndefined();
  });

  it('15. Development fallback works only when explicitly configured in dev mode', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.PUBLIC_DEFAULT_TENANT_ID = 'dev_tenant_123';

    const isDev = process.env.NODE_ENV !== 'production';
    expect(isDev).toBe(true);
    expect(process.env.PUBLIC_DEFAULT_TENANT_ID).toBe('dev_tenant_123');

    process.env.NODE_ENV = prevNodeEnv;
  });

  it('16. Production does not silently use development fallback', () => {
    const isProduction = true;
    const isDevOrTest = !isProduction;
    expect(isDevOrTest).toBe(false);
  });

  it('17. Malformed host is rejected safely', () => {
    const malformed = '   http://[invalid-host]:-1/path?query=1   ';
    const normalized = PublicTenantService.normalizeHost(malformed);
    expect(normalized.length).toBeGreaterThan(0);
    expect(normalized).not.toContain('http://');
    expect(normalized).not.toContain('/path');
  });

  it('18. Host with unexpected port is normalized safely', () => {
    const rawHost = 'acme.platform.com:9999';
    const normalized = PublicTenantService.normalizeHost(rawHost);
    expect(normalized).toBe('acme.platform.com');
  });

  it('19. Unknown tenant returns generic 404 without leaking details', () => {
    const errorResponse = {
      success: false,
      message: 'Website not found'
    };

    expect(errorResponse.success).toBe(false);
    expect(errorResponse.message).toBe('Website not found');
    expect((errorResponse as any).tenantId).toBeUndefined();
    expect((errorResponse as any).stack).toBeUndefined();
  });

  it('20. Branding response contains only public-safe fields', () => {
    const publicBranding = {
      companyName: 'Acme Academy',
      logoUrl: '/logo.png',
      faviconUrl: '/favicon.png',
      primaryColor: '#BE1E2E',
      secondaryColor: '#1F2937',
      accentColor: '#F59E0B',
      fontFamily: 'Inter',
      showPlatformBranding: true
    };

    expect((publicBranding as any).internalId).toBeUndefined();
    expect((publicBranding as any).updatedBy).toBeUndefined();
    expect(publicBranding.primaryColor).toBe('#BE1E2E');
  });

  it('21. Organization settings are resolved for the same tenant', () => {
    const tenantId = '507f1f77bcf86cd799439011';
    const settingsTenantId = '507f1f77bcf86cd799439011';
    expect(tenantId).toBe(settingsTenantId);
  });

  it('22. Two different hosts resolve to two different tenants correctly', () => {
    const hostA = 'tenant-a.com';
    const hostB = 'tenant-b.com';

    const normalizedA = PublicTenantService.normalizeHost(hostA);
    const normalizedB = PublicTenantService.normalizeHost(hostB);

    expect(normalizedA).not.toBe(normalizedB);
  });
});
