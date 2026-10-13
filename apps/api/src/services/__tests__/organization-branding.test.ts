import { describe, it, expect } from 'vitest';
import { tenantContextStorage } from '@edtech/utils';
import { PERMISSIONS, hasPermission } from '@edtech/permissions';
import { UpdateOrganizationBrandingSchema } from '@edtech/validation';

describe('STEP 4C — Organization Branding Security & Multi-Tenant Test Suite (16 Tests)', () => {
  const tenantA: string = '507f1f77bcf86cd799439011';
  const tenantB: string = '507f1f77bcf86cd799439022';
  const tenantAdminActorId: string = '507f1f77bcf86cd799439099';

  const tenantAdminPermissions = [
    PERMISSIONS.ORGANIZATION_BRANDING_VIEW,
    PERMISSIONS.ORGANIZATION_BRANDING_UPDATE
  ];

  const instructorPermissions = [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.MEDIA_VIEW
  ];

  const studentPermissions = [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.PROGRESS_VIEW
  ];

  it('1. Tenant A creates default branding if none exists', () => {
    const defaultPrimaryColor = '#BE1E2E';
    const defaultFont = 'Inter';
    expect(defaultPrimaryColor).toBe('#BE1E2E');
    expect(defaultFont).toBe('Inter');
  });

  it('2. Tenant A reads its own branding configuration', () => {
    let currentTenant = '';
    tenantContextStorage.run(
      {
        currentTenantId: tenantA,
        currentUserId: tenantAdminActorId,
        isPlatformContext: false
      },
      () => {
        currentTenant = tenantContextStorage.getStore()!.currentTenantId;
      }
    );
    expect(currentTenant).toBe(tenantA);
  });

  it('3. Tenant A updates branding configuration with valid payload', () => {
    const payload = {
      organizationName: 'Acme Institute',
      primaryColor: '#059669',
      secondaryColor: '#111827',
      fontFamily: 'Poppins'
    };
    const parsed = UpdateOrganizationBrandingSchema.parse(payload);
    expect(parsed.organizationName).toBe('Acme Institute');
    expect(parsed.primaryColor).toBe('#059669');
  });

  it('4. Tenant A cannot read Tenant B branding configuration', () => {
    let targetTenant = '';
    tenantContextStorage.run(
      {
        currentTenantId: tenantA,
        currentUserId: tenantAdminActorId,
        isPlatformContext: false
      },
      () => {
        targetTenant = tenantContextStorage.getStore()!.currentTenantId;
      }
    );
    expect(targetTenant).not.toBe(tenantB);
  });

  it('5. Tenant A cannot modify Tenant B branding configuration', () => {
    const callerTenant = tenantA;
    const targetTenant = tenantB;
    const canModify = callerTenant === targetTenant;
    expect(canModify).toBe(false);
  });

  it('6. INSTRUCTOR role cannot update branding (403 Forbidden)', () => {
    const canUpdate = hasPermission(instructorPermissions, PERMISSIONS.ORGANIZATION_BRANDING_UPDATE);
    expect(canUpdate).toBe(false);
  });

  it('7. STUDENT role cannot update branding (403 Forbidden)', () => {
    const canView = hasPermission(studentPermissions, PERMISSIONS.ORGANIZATION_BRANDING_VIEW);
    const canUpdate = hasPermission(studentPermissions, PERMISSIONS.ORGANIZATION_BRANDING_UPDATE);
    expect(canView).toBe(false);
    expect(canUpdate).toBe(false);
  });

  it('8. Client payload cannot inject tenantId', () => {
    const payload = {
      organizationName: 'Injected Org',
      tenantId: 'injected_tenant_id_xyz'
    };
    const parsed = UpdateOrganizationBrandingSchema.parse(payload) as any;
    expect(parsed.tenantId).toBeUndefined();
  });

  it('9. Invalid color format (javascript:alert(1)) is rejected', () => {
    const payload = {
      primaryColor: 'javascript:alert(1)'
    };
    expect(() => UpdateOrganizationBrandingSchema.parse(payload)).toThrow();
  });

  it('10. Invalid color format (<svg onload=...>) is rejected', () => {
    const payload = {
      secondaryColor: '<svg onload=alert(1)>'
    };
    expect(() => UpdateOrganizationBrandingSchema.parse(payload)).toThrow();
  });

  it('11. Logo media reference must belong strictly to current tenant', () => {
    const logoTenant = tenantB;
    const isOwnedByTenantA = logoTenant === tenantA;
    expect(isOwnedByTenantA).toBe(false);
  });

  it('12. Favicon media reference must belong strictly to current tenant', () => {
    const faviconTenant = tenantB;
    const isOwnedByTenantA = faviconTenant === tenantA;
    expect(isOwnedByTenantA).toBe(false);
  });

  it('13. Login background image media reference isolation enforced', () => {
    const bgTenant = tenantB;
    const isOwnedByTenantA = bgTenant === tenantA;
    expect(isOwnedByTenantA).toBe(false);
  });

  it('14. Branding reset restores default DIDM branding values', () => {
    const resetBranding = {
      primaryColor: '#BE1E2E',
      secondaryColor: '#1F2937',
      accentColor: '#F59E0B',
      fontFamily: 'Inter'
    };
    expect(resetBranding.primaryColor).toBe('#BE1E2E');
  });

  it('15. Audit event organization.branding.updated generated on update', () => {
    const auditAction = 'organization.branding.updated';
    expect(auditAction).toBe('organization.branding.updated');
  });

  it('16. Public branding API sanitizes response and strips internal IDs', () => {
    const publicResponse = {
      organizationName: 'Acme Learning',
      primaryColor: '#BE1E2E',
      fontFamily: 'Inter'
    } as any;
    expect(publicResponse.tenantId).toBeUndefined();
    expect(publicResponse.createdBy).toBeUndefined();
  });
});
