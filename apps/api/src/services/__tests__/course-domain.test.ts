import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { CreateCourseSchema, UpdateCourseSchema } from '@edtech/validation';

describe('STEP 3A — Course Domain Security & Architecture Tests', () => {
  it('1. should verify TENANT_ADMIN has full course permissions and INSTRUCTOR has course.view ONLY', () => {
    const adminPermissions = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;

    // Tenant Admin
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_CREATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_UPDATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_ARCHIVE)).toBe(true);

    // Instructor (Strict STEP 3A Rule: course.view ONLY)
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_VIEW)).toBe(true);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_CREATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_UPDATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_ARCHIVE)).toBe(false);
  });

  it('2. CreateCourseSchema should strip client-injected tenantId, status, publishedAt, createdBy', () => {
    const maliciousPayload = {
      title: 'Digital Marketing Essentials',
      tenantId: '507f1f77bcf86cd799439011',
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      createdBy: '507f1f77bcf86cd799439022',
      level: 'BEGINNER'
    };

    const parsed = CreateCourseSchema.parse(maliciousPayload) as any;

    expect(parsed.title).toBe('Digital Marketing Essentials');
    expect(parsed.level).toBe('BEGINNER');
    expect(parsed.tenantId).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.publishedAt).toBeUndefined();
    expect(parsed.createdBy).toBeUndefined();
  });

  it('3. UpdateCourseSchema should strip client-injected tenantId, status, publishedAt', () => {
    const maliciousUpdatePayload = {
      title: 'Updated Title',
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      tenantId: '507f1f77bcf86cd799439011'
    };

    const parsed = UpdateCourseSchema.parse(maliciousUpdatePayload) as any;

    expect(parsed.title).toBe('Updated Title');
    expect(parsed.status).toBeUndefined();
    expect(parsed.publishedAt).toBeUndefined();
    expect(parsed.tenantId).toBeUndefined();
  });

  it('4. should deny course creation for users without course.create permission', () => {
    const userPermissions = [PERMISSIONS.COURSE_VIEW];
    expect(hasPermission(userPermissions, PERMISSIONS.COURSE_CREATE)).toBe(false);
  });

  it('5. should deny course updating for users without course.update permission', () => {
    const userPermissions = [PERMISSIONS.COURSE_VIEW];
    expect(hasPermission(userPermissions, PERMISSIONS.COURSE_UPDATE)).toBe(false);
  });

  it('6. should deny course archiving for users without course.archive permission', () => {
    const userPermissions = [PERMISSIONS.COURSE_VIEW];
    expect(hasPermission(userPermissions, PERMISSIONS.COURSE_ARCHIVE)).toBe(false);
  });
});
