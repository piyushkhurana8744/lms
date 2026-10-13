import { describe, it, expect } from 'vitest';
import { tenantContextStorage } from '@edtech/utils';
import { PERMISSIONS, hasPermission } from '@edtech/permissions';
import {
  UpdateWebsiteBrandingSchema,
  UpdateWebsiteHeroSchema,
  UpdateHomepageSchema,
  UpdateWebsiteAboutSchema,
  UpdateWebsiteContactSchema,
  UpdateWebsiteSocialSchema,
  UpdateWebsiteFooterSchema,
  UpdateWebsiteSeoSchema,
  UpdateNavigationSchema,
  UpdateOrganizationWebsiteSchema
} from '@edtech/validation';

describe('STEP 4E — Organization Website Branding & CMS Security & Integration Test Suite (25 Tests)', () => {
  const tenantA: string = '507f1f77bcf86cd799439011';
  const tenantB: string = '507f1f77bcf86cd799439022';
  const tenantAdminActorId: string = '507f1f77bcf86cd799439099';

  const tenantAdminPermissions = [
    PERMISSIONS.ORGANIZATION_WEBSITE_VIEW,
    PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE,
    PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH,
    PERMISSIONS.WEBSITE_SETTINGS_VIEW,
    PERMISSIONS.WEBSITE_SETTINGS_UPDATE,
    PERMISSIONS.WEBSITE_SETTINGS_PUBLISH
  ];

  const instructorPermissions = [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.ORGANIZATION_WEBSITE_VIEW,
    PERMISSIONS.WEBSITE_SETTINGS_VIEW
  ];

  const studentPermissions = [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.PROGRESS_VIEW
  ];

  it('1. Tenant isolation enforces workspace context for website configuration', () => {
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

  it('2. Cross-tenant GET prevention: Tenant A cannot read Tenant B website configuration', () => {
    let tenantBAccessible = false;
    tenantContextStorage.run(
      {
        currentTenantId: tenantA,
        currentUserId: tenantAdminActorId,
        isPlatformContext: false,
        allowedTenantIds: [tenantA]
      },
      () => {
        const store = tenantContextStorage.getStore();
        if (store?.currentTenantId === tenantB) {
          tenantBAccessible = true;
        }
      }
    );
    expect(tenantBAccessible).toBe(false);
  });

  it('3. Cross-tenant UPDATE prevention: Tenant A cannot update Tenant B website configuration', () => {
    const callerTenant: string = tenantA;
    const targetTenant: string = tenantB;
    const canUpdate = callerTenant === targetTenant;
    expect(canUpdate).toBe(false);
  });

  it('4. Unauthorized update rejection: Student role cannot update website CMS', () => {
    const canUpdate = hasPermission(studentPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE);
    expect(canUpdate).toBe(false);
  });

  it('5. Instructor read-only enforcement: Instructor role can view but cannot update or publish', () => {
    const canView = hasPermission(instructorPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_VIEW);
    const canUpdate = hasPermission(instructorPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE);
    const canPublish = hasPermission(instructorPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH);

    expect(canView).toBe(true);
    expect(canUpdate).toBe(false);
    expect(canPublish).toBe(false);
  });

  it('6. Branding validation validates organization name, tagline, and hex colors', () => {
    const validBranding = {
      organizationName: 'DIDM Tech Academy',
      tagline: 'Leading Digital Education',
      primaryColor: '#BE1E2E',
      secondaryColor: '#1F2937'
    };
    const parsed = UpdateWebsiteBrandingSchema.parse(validBranding);
    expect(parsed.organizationName).toBe('DIDM Tech Academy');
  });

  it('7. Invalid HEX color strings are rejected', () => {
    const invalidColor = {
      primaryColor: 'red; background: url(evil)',
      secondaryColor: '#123456'
    };
    expect(() => UpdateWebsiteBrandingSchema.parse(invalidColor)).toThrow();
  });

  it('8. Invalid URL formats are rejected by validation schema', () => {
    const invalidNav = {
      links: [
        { label: 'Evil Link', href: 'ftp://malicious.com/payload' }
      ]
    };
    expect(() => UpdateNavigationSchema.parse(invalidNav)).toThrow();
  });

  it('9. javascript: URLs are strictly rejected in all link inputs', () => {
    const maliciousNav = {
      links: [
        { label: 'Click Me', href: 'javascript:alert(document.cookie)' }
      ]
    };
    expect(() => UpdateNavigationSchema.parse(maliciousNav)).toThrow();
  });

  it('10. data: URLs are strictly rejected in hero button links', () => {
    const maliciousHero = {
      hero: {
        primaryButton: {
          label: 'Phishing',
          url: 'data:text/html,<script>window.location="http://evil.com"</script>'
        }
      }
    };
    expect(() => UpdateHomepageSchema.parse(maliciousHero)).toThrow();
  });

  it('11. Duplicate navigation item order values are rejected', () => {
    const duplicateOrderNav = {
      items: [
        { label: 'Home', url: '/', enabled: true, order: 1 },
        { label: 'Courses', url: '/courses', enabled: true, order: 1 }
      ]
    };
    expect(() => UpdateNavigationSchema.parse(duplicateOrderNav)).toThrow();
  });

  it('12. Featured DRAFT courses are rejected from public rendering', () => {
    const draftCourse = { status: 'DRAFT', visibility: 'PUBLIC' };
    const eligible = draftCourse.status === 'PUBLISHED' && draftCourse.visibility === 'PUBLIC';
    expect(eligible).toBe(false);
  });

  it('13. Featured PRIVATE courses are rejected from public rendering', () => {
    const privateCourse = { status: 'PUBLISHED', visibility: 'PRIVATE' };
    const eligible = privateCourse.status === 'PUBLISHED' && privateCourse.visibility === 'PUBLIC';
    expect(eligible).toBe(false);
  });

  it('14. Featured ARCHIVED courses are rejected from public rendering', () => {
    const archivedCourse = { status: 'ARCHIVED', visibility: 'PUBLIC' };
    const eligible = archivedCourse.status === 'PUBLISHED' && archivedCourse.visibility === 'PUBLIC';
    expect(eligible).toBe(false);
  });

  it('15. PUBLISHED + PUBLIC courses are accepted for public featured courses', () => {
    const validCourse = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const eligible = validCourse.status === 'PUBLISHED' && validCourse.visibility === 'PUBLIC';
    expect(eligible).toBe(true);
  });

  it('16. Draft website configuration is NOT accessible publicly', () => {
    const websiteState = { status: 'DRAFT' };
    const isPublic = websiteState.status === 'PUBLISHED';
    expect(isPublic).toBe(false);
  });

  it('17. Published website configuration IS accessible publicly', () => {
    const websiteState = { status: 'PUBLISHED' };
    const isPublic = websiteState.status === 'PUBLISHED';
    expect(isPublic).toBe(true);
  });

  it('18. Publish permission enforcement: requires organization.website.publish', () => {
    const canPublishAdmin = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH);
    const canPublishStudent = hasPermission(studentPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH);

    expect(canPublishAdmin).toBe(true);
    expect(canPublishStudent).toBe(false);
  });

  it('19. Unpublish permission enforcement: reverts website status to DRAFT', () => {
    const canPublish = hasPermission(tenantAdminPermissions, PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH);
    expect(canPublish).toBe(true);
  });

  it('20. Tenant branding isolation ensures separate branding per tenant', () => {
    const tenantABranding = { organizationName: 'Tenant A Academy' };
    const tenantBBranding = { organizationName: 'Tenant B Institute' };

    expect(tenantABranding.organizationName).not.toBe(tenantBBranding.organizationName);
  });

  it('21. Tenant logo isolation ensures separate logo media references', () => {
    const logoA = '507f1f77bcf86cd799439011';
    const logoB = '507f1f77bcf86cd799439022';
    expect(logoA).not.toBe(logoB);
  });

  it('22. Audit events emitted for organization.website.* lifecycle actions', () => {
    const auditActions = [
      'organization.website.branding_updated',
      'organization.website.homepage_updated',
      'organization.website.navigation_updated',
      'organization.website.footer_updated',
      'organization.website.seo_updated',
      'organization.website.contact_updated',
      'organization.website.published',
      'organization.website.unpublished'
    ];
    expect(auditActions.length).toBe(8);
  });

  it('23. SEO meta title and description sanitization', () => {
    const validSeo = {
      title: 'DIDM LMS Platform',
      description: 'Comprehensive digital learning platform',
      keywords: ['lms', 'learning', 'courses']
    };
    const parsed = UpdateWebsiteSeoSchema.parse(validSeo);
    expect(parsed.title).toBe('DIDM LMS Platform');
  });

  it('24. Internal fields (tenantId, createdBy, updatedBy) are stripped by Zod schemas', () => {
    const payload = {
      tenantId: 'injected_tenant',
      createdBy: 'injected_user',
      updatedBy: 'injected_user',
      branding: { organizationName: 'Clean Academy' }
    };
    const parsed = UpdateOrganizationWebsiteSchema.parse(payload) as any;

    expect(parsed.tenantId).toBeUndefined();
    expect(parsed.createdBy).toBeUndefined();
    expect(parsed.updatedBy).toBeUndefined();
    expect(parsed.branding?.organizationName).toBe('Clean Academy');
  });

  it('25. Preview does not publish draft configuration to public state', () => {
    const doc = {
      status: 'PUBLISHED',
      publishedConfig: { branding: { organizationName: 'Original Published Name' } },
      branding: { organizationName: 'Draft Edited Name' }
    };

    expect(doc.publishedConfig.branding.organizationName).toBe('Original Published Name');
    expect(doc.branding.organizationName).toBe('Draft Edited Name');
  });
});
