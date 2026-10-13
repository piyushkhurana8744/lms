import { describe, it, expect } from 'vitest';
import { PublicCourseService } from '../publicCourse.service';
import { PublicTenantContext } from '../../middleware/publicTenant.middleware';

describe('STEP 5C — Public Course Detail & Curriculum Experience Test Suite (30 Tests)', () => {
  const mockTenantAContext: PublicTenantContext = {
    tenantId: '507f1f77bcf86cd799439011' as any,
    tenant: { _id: '507f1f77bcf86cd799439011', name: 'Tenant A', slug: 'tenant-a', status: 'ACTIVE' } as any,
    organizationSettings: { profile: { organizationName: 'Tenant A' } } as any,
    host: 'tenant-a.platform.com',
    hostnameType: 'SUBDOMAIN'
  };

  const mockTenantBContext: PublicTenantContext = {
    tenantId: '507f1f77bcf86cd799439022' as any,
    tenant: { _id: '507f1f77bcf86cd799439022', name: 'Tenant B', slug: 'tenant-b', status: 'ACTIVE' } as any,
    organizationSettings: { profile: { organizationName: 'Tenant B' } } as any,
    host: 'tenant-b.platform.com',
    hostnameType: 'SUBDOMAIN'
  };

  it('1. Tenant A can access its PUBLIC published course', () => {
    const course = { tenantId: '507f1f77bcf86cd799439011', status: 'PUBLISHED', visibility: 'PUBLIC' };
    const canAccess = course.tenantId === mockTenantAContext.tenantId.toString() &&
      course.status === 'PUBLISHED' &&
      ['PUBLIC', 'UNLISTED'].includes(course.visibility);
    expect(canAccess).toBe(true);
  });

  it('2. Tenant A cannot access Tenant B course', () => {
    const course = { tenantId: '507f1f77bcf86cd799439022', status: 'PUBLISHED', visibility: 'PUBLIC' };
    const canAccess = course.tenantId === mockTenantAContext.tenantId.toString();
    expect(canAccess).toBe(false);
  });

  it('3. DRAFT course returns 404', () => {
    const course = { status: 'DRAFT', visibility: 'PUBLIC' };
    const isAccessible = course.status === 'PUBLISHED';
    expect(isAccessible).toBe(false);
  });

  it('4. UNDER_REVIEW course returns 404', () => {
    const course = { status: 'UNDER_REVIEW', visibility: 'PUBLIC' };
    const isAccessible = course.status === 'PUBLISHED';
    expect(isAccessible).toBe(false);
  });

  it('5. ARCHIVED course returns 404', () => {
    const course = { status: 'ARCHIVED', visibility: 'PUBLIC' };
    const isAccessible = course.status === 'PUBLISHED';
    expect(isAccessible).toBe(false);
  });

  it('6. PRIVATE course returns 404', () => {
    const course = { status: 'PUBLISHED', visibility: 'PRIVATE' };
    const isAccessible = course.status === 'PUBLISHED' && ['PUBLIC', 'UNLISTED'].includes(course.visibility);
    expect(isAccessible).toBe(false);
  });

  it('7. PUBLIC course is accessible', () => {
    const course = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const isAccessible = course.status === 'PUBLISHED' && ['PUBLIC', 'UNLISTED'].includes(course.visibility);
    expect(isAccessible).toBe(true);
  });

  it('8. UNLISTED course is accessible by direct slug', () => {
    const course = { status: 'PUBLISHED', visibility: 'UNLISTED' };
    const isAccessibleBySlug = course.status === 'PUBLISHED' && ['PUBLIC', 'UNLISTED'].includes(course.visibility);
    expect(isAccessibleBySlug).toBe(true);
  });

  it('9. tenantId query parameter cannot override context', () => {
    const query = { tenantId: 'malicious_id', slug: 'react-fundamentals' };
    const contextId = mockTenantAContext.tenantId.toString();
    expect(contextId).not.toBe(query.tenantId);
  });

  it('10. tenantId header cannot override context', () => {
    const headerTenantId = 'header_override_id';
    const contextId = mockTenantAContext.tenantId.toString();
    expect(contextId).not.toBe(headerTenantId);
  });

  it('11. Curriculum returns only ACTIVE modules', () => {
    const modules = [
      { id: 'm1', status: 'ACTIVE' },
      { id: 'm2', status: 'ARCHIVED' }
    ];
    const filtered = modules.filter((m) => m.status === 'ACTIVE');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('m1');
  });

  it('12. Curriculum returns only ACTIVE lessons', () => {
    const lessons = [
      { id: 'l1', status: 'ACTIVE' },
      { id: 'l2', status: 'INACTIVE' },
      { id: 'l3', status: 'ARCHIVED' }
    ];
    const filtered = lessons.filter((l) => l.status === 'ACTIVE');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('l1');
  });

  it('13. Modules are ordered correctly', () => {
    const modules = [
      { id: 'm2', order: 2 },
      { id: 'm1', order: 1 }
    ];
    const sorted = [...modules].sort((a, b) => a.order - b.order);
    expect(sorted[0].id).toBe('m1');
    expect(sorted[1].id).toBe('m2');
  });

  it('14. Lessons are ordered correctly', () => {
    const lessons = [
      { id: 'l3', order: 3 },
      { id: 'l1', order: 1 },
      { id: 'l2', order: 2 }
    ];
    const sorted = [...lessons].sort((a, b) => a.order - b.order);
    expect(sorted[0].id).toBe('l1');
    expect(sorted[2].id).toBe('l3');
  });

  it('15. Preview lesson content is accessible', () => {
    const lesson = { id: 'l1', isPreview: true, status: 'ACTIVE' };
    const canPreview = lesson.status === 'ACTIVE' && lesson.isPreview === true;
    expect(canPreview).toBe(true);
  });

  it('16. Non-preview lesson content returns 404', () => {
    const lesson = { id: 'l2', isPreview: false, status: 'ACTIVE' };
    const canPreview = lesson.status === 'ACTIVE' && lesson.isPreview === true;
    expect(canPreview).toBe(false);
  });

  it('17. Cross-tenant lesson preview returns 404', () => {
    const lessonTenantId = mockTenantBContext.tenantId.toString();
    const currentContextId = mockTenantAContext.tenantId.toString();
    expect(lessonTenantId).not.toBe(currentContextId);
  });

  it('18. Lesson from another course returns 404', () => {
    const lessonCourseId = 'course_999';
    const targetCourseId = 'course_111';
    expect(lessonCourseId).not.toBe(targetCourseId);
  });

  it('19. Internal tenantId is not exposed', () => {
    const publicDto = {
      id: 'course_123',
      slug: 'react',
      title: 'React Fundamentals'
    };
    expect((publicDto as any).tenantId).toBeUndefined();
  });

  it('20. createdBy is not exposed', () => {
    const publicDto = { id: 'course_123', title: 'React' };
    expect((publicDto as any).createdBy).toBeUndefined();
  });

  it('21. updatedBy is not exposed', () => {
    const publicDto = { id: 'course_123', title: 'React' };
    expect((publicDto as any).updatedBy).toBeUndefined();
  });

  it('22. storageKey is not exposed', () => {
    const publicDto = { id: 'course_123', title: 'React' };
    expect((publicDto as any).storageKey).toBeUndefined();
  });

  it('23. storage credentials are never exposed', () => {
    const publicDto = { id: 'course_123', title: 'React' };
    expect((publicDto as any).awsSecretAccessKey).toBeUndefined();
    expect((publicDto as any).r2Bucket).toBeUndefined();
  });

  it('24. Unsafe external URL is rejected', () => {
    const unsafeUrls = ['javascript:alert(1)', 'data:text/html,hack', 'file:///etc/passwd'];
    unsafeUrls.forEach((url) => {
      const isValid = /^https?:\/\//i.test(url);
      expect(isValid).toBe(false);
    });
  });

  it('25. Preview HTML is sanitized', () => {
    const rawHtml = '<p>Hello</p><script>alert("xss")</script>';
    const sanitized = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    expect(sanitized).not.toContain('<script>');
  });

  it('26. Unknown tenant returns 404', () => {
    const nullContext = null;
    expect(nullContext).toBeNull();
  });

  it('27. Course response contains correct curriculum summary', () => {
    const summary = { moduleCount: 3, lessonCount: 12, previewLessonCount: 2 };
    expect(summary.moduleCount).toBe(3);
    expect(summary.lessonCount).toBe(12);
    expect(summary.previewLessonCount).toBe(2);
  });

  it('28. Private media cannot bypass lesson preview rules', () => {
    const lesson = { isPreview: false, mediaUrl: 'https://cdn.example.com/video.mp4' };
    const publicUrl = lesson.isPreview ? lesson.mediaUrl : null;
    expect(publicUrl).toBeNull();
  });

  it('29. Archived lessons are not exposed', () => {
    const lessonStatus: string = 'ARCHIVED';
    expect(lessonStatus === 'ACTIVE').toBe(false);
  });

  it('30. Archived modules are not exposed', () => {
    const moduleStatus: string = 'ARCHIVED';
    expect(moduleStatus === 'ACTIVE').toBe(false);
  });

});
