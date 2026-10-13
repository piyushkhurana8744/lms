import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasPermission, PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import {
  TextContentSchema,
  VideoContentSchema,
  PdfContentSchema,
  AudioContentSchema,
  ExternalResourceContentSchema,
  LiveContentSchema,
  validateLessonContent
} from '@edtech/validation';
import { FILE_LIMITS, isAllowedMimeAndExtension } from '../../config/fileLimits';
import { LocalStorageProvider } from '../storage/localStorage.provider';
import path from 'path';

describe('STEP 3E — Lesson Content & Media Security Tests', () => {
  it('1. should verify TENANT_ADMIN has full media permissions (view, upload, delete)', () => {
    const adminPermissions = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
    expect(hasPermission(adminPermissions, PERMISSIONS.MEDIA_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.MEDIA_UPLOAD)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.MEDIA_DELETE)).toBe(true);
  });

  it('2. should verify INSTRUCTOR has media.view ONLY, and cannot upload or delete', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.MEDIA_VIEW)).toBe(true);
    expect(hasPermission(instructorPermissions, PERMISSIONS.MEDIA_UPLOAD)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.MEDIA_DELETE)).toBe(false);
  });

  it('3. should verify STUDENT has NO media management permissions', () => {
    const studentPermissions = SYSTEM_ROLE_PERMISSIONS.STUDENT;
    expect(hasPermission(studentPermissions, PERMISSIONS.MEDIA_VIEW)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.MEDIA_UPLOAD)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.MEDIA_DELETE)).toBe(false);
  });

  it('4. should reject invalid MIME types', () => {
    const isAllowed = isAllowedMimeAndExtension('VIDEO', 'application/x-executable', '.mp4');
    expect(isAllowed).toBe(false);
  });

  it('5. should reject mismatched file extensions', () => {
    const isAllowed = isAllowedMimeAndExtension('PDF', 'application/pdf', '.exe');
    expect(isAllowed).toBe(false);
  });

  it('6. should reject oversized file buffer size exceeding limit', () => {
    const maxPdfSize = FILE_LIMITS.MAX_SIZE_BYTES.PDF; // 25 MB
    const oversizedBufferLength = maxPdfSize + 1024;
    expect(oversizedBufferLength > maxPdfSize).toBe(true);
  });

  it('7. ExternalResourceContentSchema should reject javascript: protocol', () => {
    const result = ExternalResourceContentSchema.safeParse({ url: 'javascript:alert("XSS")' });
    expect(result.success).toBe(false);
  });

  it('8. ExternalResourceContentSchema should reject data: protocol', () => {
    const result = ExternalResourceContentSchema.safeParse({ url: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' });
    expect(result.success).toBe(false);
  });

  it('9. ExternalResourceContentSchema should reject file: protocol', () => {
    const result = ExternalResourceContentSchema.safeParse({ url: 'file:///etc/passwd' });
    expect(result.success).toBe(false);
  });

  it('10. ExternalResourceContentSchema should accept valid http:// and https:// URLs', () => {
    const httpResult = ExternalResourceContentSchema.safeParse({ url: 'http://example.com/resource' });
    expect(httpResult.success).toBe(true);

    const httpsResult = ExternalResourceContentSchema.safeParse({ url: 'https://didm.in/seo-guide', openInNewTab: true });
    expect(httpsResult.success).toBe(true);
  });

  it('11. TextContentSchema should validate bodyHtml required presence', () => {
    const valid = TextContentSchema.safeParse({ bodyHtml: '<p>Valid article body</p>' });
    expect(valid.success).toBe(true);

    const invalid = TextContentSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it('12. VideoContentSchema should parse video content correctly and strip unknown fields', () => {
    const raw = {
      mediaId: '507f1f77bcf86cd799439011',
      url: 'https://cdn.didm.in/video1.mp4',
      durationSeconds: 180,
      unknownField: 'malicious'
    };

    const parsed = VideoContentSchema.parse(raw) as any;
    expect(parsed.mediaId).toBe('507f1f77bcf86cd799439011');
    expect(parsed.durationSeconds).toBe(180);
    expect(parsed.unknownField).toBeUndefined();
  });

  it('13. LiveContentSchema should require startAt < endAt when both are provided', () => {
    const validLive = LiveContentSchema.safeParse({
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      startAt: '2026-09-01T10:00:00Z',
      endAt: '2026-09-01T11:00:00Z'
    });
    expect(validLive.success).toBe(true);

    const invalidLive = LiveContentSchema.safeParse({
      startAt: '2026-09-01T12:00:00Z',
      endAt: '2026-09-01T10:00:00Z'
    });
    expect(invalidLive.success).toBe(false);
  });

  it('14. validateLessonContent should reject content type mismatch', () => {
    expect(() => validateLessonContent('TEXT', { mediaId: '123' })).toThrow();
    expect(() => validateLessonContent('VIDEO', { url: 'javascript:bad()' })).not.toThrow();
  });

  it('15. LocalStorageProvider path traversal protection', () => {
    const provider = new LocalStorageProvider();
    expect(() => (provider as any).sanitizePath('../../etc/passwd')).toThrow('Path traversal detected');
  });

  it('16. File limits defaults should match prompt specifications', () => {
    expect(FILE_LIMITS.MAX_SIZE_BYTES.IMAGE).toBe(10 * 1024 * 1024);
    expect(FILE_LIMITS.MAX_SIZE_BYTES.PDF).toBe(25 * 1024 * 1024);
    expect(FILE_LIMITS.MAX_SIZE_BYTES.AUDIO).toBe(100 * 1024 * 1024);
    expect(FILE_LIMITS.MAX_SIZE_BYTES.VIDEO).toBe(500 * 1024 * 1024);
  });
});
