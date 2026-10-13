import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { CreateModuleSchema, CreateLessonSchema, ReorderModulesSchema, ReorderLessonsSchema } from '@edtech/validation';
import { sanitizeHtml } from '@edtech/utils';

describe('STEP 3D — Curriculum Builder Security & Integration Tests', () => {
  it('1. should verify TENANT_ADMIN has full curriculum management rights', () => {
    const adminPermissions = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;

    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_CREATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_UPDATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_ARCHIVE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_CREATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(true);
  });

  it('2. should verify INSTRUCTOR has read-only curriculum access (view ONLY)', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;

    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_VIEW)).toBe(true);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_VIEW)).toBe(true);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_CREATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_UPDATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_ARCHIVE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_CREATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(false);
  });

  it('3. should verify STUDENT has NO lesson permissions in curriculum builder', () => {
    const studentPermissions = SYSTEM_ROLE_PERMISSIONS.STUDENT;

    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_VIEW)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_CREATE)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(false);
  });

  it('4. CreateModuleSchema and CreateLessonSchema must strip client-injected tenantId, courseId, order', () => {
    const maliciousModule = {
      title: 'Module 1: SEO Basics',
      tenantId: '507f1f77bcf86cd799439011',
      courseId: '507f1f77bcf86cd799439022',
      order: 999
    };

    const parsedMod = CreateModuleSchema.parse(maliciousModule) as any;
    expect(parsedMod.title).toBe('Module 1: SEO Basics');
    expect(parsedMod.tenantId).toBeUndefined();
    expect(parsedMod.courseId).toBeUndefined();
    expect(parsedMod.order).toBeUndefined();

    const maliciousLesson = {
      title: 'Lesson 1: Keyword Research',
      type: 'TEXT',
      tenantId: '507f1f77bcf86cd799439011',
      courseId: '507f1f77bcf86cd799439022',
      moduleId: '507f1f77bcf86cd799439033',
      order: 888
    };

    const parsedLes = CreateLessonSchema.parse(maliciousLesson) as any;
    expect(parsedLes.title).toBe('Lesson 1: Keyword Research');
    expect(parsedLes.tenantId).toBeUndefined();
    expect(parsedLes.courseId).toBeUndefined();
    expect(parsedLes.moduleId).toBeUndefined();
    expect(parsedLes.order).toBeUndefined();
  });

  it('5. ReorderModulesSchema and ReorderLessonsSchema must reject duplicate IDs', () => {
    const duplicateMod = { moduleIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'] };
    expect(ReorderModulesSchema.safeParse(duplicateMod).success).toBe(false);

    const duplicateLes = { lessonIds: ['507f1f77bcf86cd799439022', '507f1f77bcf86cd799439022'] };
    expect(ReorderLessonsSchema.safeParse(duplicateLes).success).toBe(false);
  });

  it('6. sanitizeHtml should strip dangerous script tags and inline handlers', () => {
    const dangerousHtml = '<p>Hello <script>alert("xss")</script> World <img src="x" onerror="alert(1)" /></p>';
    const sanitized = sanitizeHtml(dangerousHtml);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onerror=');
    expect(sanitized).toContain('<p>Hello  World <img src="x"  /></p>');
  });
});
