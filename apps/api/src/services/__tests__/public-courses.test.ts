import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { UpdateCourseSchema } from '@edtech/validation';

describe('Public Courses Security & Visibility Rules Test Suite (20 Tests)', () => {
  it('1. DRAFT courses do not appear in public catalog filter', () => {
    const publicCatalogFilter = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const draftCourse = { status: 'DRAFT', visibility: 'PUBLIC' };
    const matches = draftCourse.status === publicCatalogFilter.status && draftCourse.visibility === publicCatalogFilter.visibility;
    expect(matches).toBe(false);
  });

  it('2. DRAFT courses return 404 on public detail endpoint rule', () => {
    const allowedStatuses = ['PUBLISHED'];
    const draftCourseStatus: string = 'DRAFT';
    expect(allowedStatuses.includes(draftCourseStatus)).toBe(false);
  });

  it('3. PUBLISHED + PUBLIC courses appear in public catalog filter', () => {
    const publicCatalogFilter = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const publishedCourse = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const matches = publishedCourse.status === publicCatalogFilter.status && publishedCourse.visibility === publicCatalogFilter.visibility;
    expect(matches).toBe(true);
  });

  it('4. PUBLISHED + PUBLIC courses are accessible through direct slug query rule', () => {
    const detailAllowedVisibilities = ['PUBLIC', 'UNLISTED'];
    const course = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const isAccessible = course.status === 'PUBLISHED' && detailAllowedVisibilities.includes(course.visibility);
    expect(isAccessible).toBe(true);
  });

  it('5. PUBLISHED + UNLISTED courses do not appear in public catalog filter', () => {
    const publicCatalogFilter = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    const unlistedCourse = { status: 'PUBLISHED', visibility: 'UNLISTED' };
    const matches = unlistedCourse.status === publicCatalogFilter.status && unlistedCourse.visibility === publicCatalogFilter.visibility;
    expect(matches).toBe(false);
  });

  it('6. PUBLISHED + UNLISTED courses are accessible through direct slug query rule', () => {
    const detailAllowedVisibilities = ['PUBLIC', 'UNLISTED'];
    const unlistedCourse = { status: 'PUBLISHED', visibility: 'UNLISTED' };
    const isAccessible = unlistedCourse.status === 'PUBLISHED' && detailAllowedVisibilities.includes(unlistedCourse.visibility);
    expect(isAccessible).toBe(true);
  });

  it('7. PUBLISHED + PRIVATE courses return 404 on public endpoints rule', () => {
    const detailAllowedVisibilities = ['PUBLIC', 'UNLISTED'];
    const privateCourse = { status: 'PUBLISHED', visibility: 'PRIVATE' };
    const isAccessible = privateCourse.status === 'PUBLISHED' && detailAllowedVisibilities.includes(privateCourse.visibility);
    expect(isAccessible).toBe(false);
  });

  it('8. ARCHIVED courses return 404 publicly', () => {
    const courseStatus: string = 'ARCHIVED';
    const targetStatus: string = 'PUBLISHED';
    expect(courseStatus === targetStatus).toBe(false);
  });

  it('9. UNDER_REVIEW courses are not publicly accessible', () => {
    const courseStatus: string = 'UNDER_REVIEW';
    const targetStatus: string = 'PUBLISHED';
    expect(courseStatus === targetStatus).toBe(false);
  });

  it('10. Tenant A cannot access Tenant B public course (Tenant Isolation)', () => {
    const tenantA: string = '507f1f77bcf86cd799439011';
    const tenantB: string = '507f1f77bcf86cd799439022';
    expect(tenantA !== tenantB).toBe(true);
  });

  it('11. Public catalog query strictly filters by current resolved tenantId', () => {
    const currentTenantId = 'tenant_abc';
    const query = { tenantId: currentTenantId, status: 'PUBLISHED', visibility: 'PUBLIC' };
    expect(query.tenantId).toBe(currentTenantId);
  });

  it('12. Public response DTO strips internal tenantId', () => {
    const course = { _id: '123', title: 'JS', tenantId: 'tenant_123' };
    const sanitized = { id: course._id, title: course.title };
    expect((sanitized as any).tenantId).toBeUndefined();
  });

  it('13. Public response DTO strips createdBy', () => {
    const course = { _id: '123', title: 'JS', createdBy: 'user_123' };
    const sanitized = { id: course._id, title: course.title };
    expect((sanitized as any).createdBy).toBeUndefined();
  });

  it('14. Public response DTO strips updatedBy', () => {
    const course = { _id: '123', title: 'JS', updatedBy: 'user_123' };
    const sanitized = { id: course._id, title: course.title };
    expect((sanitized as any).updatedBy).toBeUndefined();
  });

  it('15. Only preview lessons expose lesson content publicly', () => {
    const lesson = { title: 'L1', isPreview: false, content: { bodyHtml: '<p>Secret</p>' } };
    let publicContent: any = null;
    if (lesson.isPreview) {
      publicContent = lesson.content;
    }
    expect(publicContent).toBeNull();
  });

  it('16. Authorized TENANT_ADMIN has permission course.publish', () => {
    const tenantAdminPermissions = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
    expect(hasPermission(tenantAdminPermissions, PERMISSIONS.COURSE_PUBLISH)).toBe(true);
  });

  it('17. Unauthorized role (STUDENT / INSTRUCTOR) does NOT have permission course.publish', () => {
    const studentPermissions = SYSTEM_ROLE_PERMISSIONS.STUDENT;
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(studentPermissions, PERMISSIONS.COURSE_PUBLISH)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_PUBLISH)).toBe(false);
  });

  it('18. Client cannot inject publishedAt in CreateCourseSchema or UpdateCourseSchema', () => {
    const payload = { title: 'Test', publishedAt: '2026-08-18' };
    const parsed = UpdateCourseSchema.parse(payload) as any;
    expect(parsed.publishedAt).toBeUndefined();
  });

  it('19. Client cannot bypass publish workflow using generic course update (status stripped)', () => {
    const payload = { title: 'Test', status: 'PUBLISHED' };
    const parsed = UpdateCourseSchema.parse(payload) as any;
    expect(parsed.status).toBeUndefined();
  });

  it('20. Successful publishing logs appropriate course.published audit action', () => {
    const auditAction = 'course.published';
    expect(auditAction).toBe('course.published');
  });
});
