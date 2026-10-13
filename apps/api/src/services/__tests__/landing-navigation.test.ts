import { describe, it, expect } from 'vitest';
import { getDashboardRoute, sanitizeRedirectUrl } from '@edtech/utils';

describe('STEP 3B.5 — Landing Navigation & Redirect Security Tests', () => {
  it('1. should return /login for unauthenticated/null user', () => {
    expect(getDashboardRoute(null)).toBe('/login');
    expect(getDashboardRoute(undefined)).toBe('/login');
  });

  it('2. should map Super Admin and Tenant Admin users to /admin', () => {
    const superAdminUser: any = { isSuperAdmin: true, roles: [] };
    const tenantAdminUser: any = { isSuperAdmin: false, roles: ['TENANT_ADMIN'] };

    expect(getDashboardRoute(superAdminUser)).toBe('/admin');
    expect(getDashboardRoute(tenantAdminUser)).toBe('/admin');
  });

  it('3. should map Instructor users to /instructor', () => {
    const instructorUser: any = { isSuperAdmin: false, roles: ['INSTRUCTOR'] };
    expect(getDashboardRoute(instructorUser)).toBe('/instructor');
  });

  it('4. should map Student users to /student', () => {
    const studentUser: any = { isSuperAdmin: false, roles: ['STUDENT'] };
    expect(getDashboardRoute(studentUser)).toBe('/student');
  });

  it('5. sanitizeRedirectUrl should reject external open redirect URLs', () => {
    expect(sanitizeRedirectUrl('https://evil.com')).toBe('/admin');
    expect(sanitizeRedirectUrl('http://phishing.org/login')).toBe('/admin');
    expect(sanitizeRedirectUrl('//evil.com')).toBe('/admin');
  });

  it('6. sanitizeRedirectUrl should allow valid relative internal routes', () => {
    expect(sanitizeRedirectUrl('/admin/courses')).toBe('/admin/courses');
    expect(sanitizeRedirectUrl('/instructor')).toBe('/instructor');
    expect(sanitizeRedirectUrl('/sessions')).toBe('/sessions');
  });
});
