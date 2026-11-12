import { describe, it, expect } from 'vitest';
import { sanitizeReturnUrl, getAuthorizedReturnUrl } from '../index';

describe('Safe Redirect & Return Destination Sanitizer', () => {
  describe('sanitizeReturnUrl', () => {
    it('accepts clean, relative application paths', () => {
      expect(sanitizeReturnUrl('/platform')).toBe('/platform');
      expect(sanitizeReturnUrl('/admin')).toBe('/admin');
      expect(sanitizeReturnUrl('/instructor/classes')).toBe('/instructor/classes');
      expect(sanitizeReturnUrl('/student/courses/123')).toBe('/student/courses/123');
    });

    it('preserves query strings and search parameters', () => {
      expect(sanitizeReturnUrl('/platform?tab=users')).toBe('/platform?tab=users');
      expect(sanitizeReturnUrl('/platform?tab=users&page=3&search=rahul')).toBe(
        '/platform?tab=users&page=3&search=rahul'
      );
      expect(sanitizeReturnUrl('/admin?branch=delhi&sort=desc')).toBe('/admin?branch=delhi&sort=desc');
    });

    it('rejects external URLs and returns fallback', () => {
      expect(sanitizeReturnUrl('https://evil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('http://attacker.com/steal')).toBe('/platform');
      expect(sanitizeReturnUrl('http://localhost:3000/evil')).toBe('/platform');
    });

    it('rejects protocol-relative URLs (//)', () => {
      expect(sanitizeReturnUrl('//evil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('//evil.com/path')).toBe('/platform');
      expect(sanitizeReturnUrl('///evil.com')).toBe('/platform');
    });

    it('rejects backslash bypasses (\\ and /\\)', () => {
      expect(sanitizeReturnUrl('\\\\evil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('/\\evil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('\\/evil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('/path\\evil.com')).toBe('/platform');
    });

    it('rejects non-HTTP script schemes', () => {
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/platform');
      expect(sanitizeReturnUrl('data:text/html,<script>alert(1)</script>')).toBe('/platform');
      expect(sanitizeReturnUrl('vbscript:msgbox(1)')).toBe('/platform');
      expect(sanitizeReturnUrl('file:///etc/passwd')).toBe('/platform');
    });

    it('rejects URL-encoded bypasses (e.g. %2f%2fevil.com, %5c)', () => {
      expect(sanitizeReturnUrl('%2f%2fevil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('/%2f/evil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('%5c%5cevil.com')).toBe('/platform');
      expect(sanitizeReturnUrl('%252f%252fevil.com')).toBe('/platform');
    });

    it('rejects control characters, newlines, and null bytes', () => {
      expect(sanitizeReturnUrl('/platform\r\nSet-Cookie:bad=1')).toBe('/platform');
      expect(sanitizeReturnUrl('/platform\0evil')).toBe('/platform');
      expect(sanitizeReturnUrl('/platform%00evil')).toBe('/platform');
    });

    it('handles empty, null, or malformed inputs with fallback', () => {
      expect(sanitizeReturnUrl('')).toBe('/platform');
      expect(sanitizeReturnUrl(null)).toBe('/platform');
      expect(sanitizeReturnUrl(undefined)).toBe('/platform');
      expect(sanitizeReturnUrl('   ')).toBe('/platform');
      expect(sanitizeReturnUrl(12345)).toBe('/platform');
      expect(sanitizeReturnUrl({}, '/custom-fallback')).toBe('/custom-fallback');
    });
  });

  describe('getAuthorizedReturnUrl', () => {
    it('allows SuperAdmin to return to /platform or /admin', () => {
      const superAdmin = { isSuperAdmin: true, roles: ['SUPER_ADMIN'] };
      expect(getAuthorizedReturnUrl(superAdmin, '/platform?tab=users')).toBe('/platform?tab=users');
      expect(getAuthorizedReturnUrl(superAdmin, '/admin')).toBe('/admin');
    });

    it('redirects non-SuperAdmin away from /platform to /admin', () => {
      const admin = { isSuperAdmin: false, roles: ['ADMIN'] };
      expect(getAuthorizedReturnUrl(admin, '/platform')).toBe('/admin');
      expect(getAuthorizedReturnUrl(admin, '/platform?tab=settings')).toBe('/admin');
      expect(getAuthorizedReturnUrl(admin, '/admin?tab=courses')).toBe('/admin?tab=courses');
    });

    it('redirects non-admin away from /admin to default fallback', () => {
      const instructor = { isSuperAdmin: false, roles: ['INSTRUCTOR'] };
      expect(getAuthorizedReturnUrl(instructor, '/admin', '/instructor')).toBe('/instructor');
      expect(getAuthorizedReturnUrl(instructor, '/instructor/classes')).toBe('/instructor/classes');
    });

    it('sanitizes malicious URLs before checking authorization', () => {
      const superAdmin = { isSuperAdmin: true, roles: ['SUPER_ADMIN'] };
      expect(getAuthorizedReturnUrl(superAdmin, 'https://evil.com')).toBe('/platform');
      expect(getAuthorizedReturnUrl(superAdmin, '//attacker.org')).toBe('/platform');
    });
  });
});

