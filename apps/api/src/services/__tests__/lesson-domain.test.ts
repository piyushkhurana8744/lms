import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { CreateLessonSchema, UpdateLessonSchema, ReorderLessonsSchema, ExternalResourceContentSchema } from '@edtech/validation';

describe('STEP 3C — Lesson Domain Security & Architecture Tests', () => {
  it('1. should verify TENANT_ADMIN has full lesson permissions, INSTRUCTOR has lesson.view ONLY, STUDENT has NONE', () => {
    const adminPermissions = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    const studentPermissions = SYSTEM_ROLE_PERMISSIONS.STUDENT;

    // Tenant Admin
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_CREATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(true);

    // Instructor (Strict STEP 3C Rule: lesson.view ONLY)
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_VIEW)).toBe(true);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_CREATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(false);

    // Student (Strict STEP 3C Rule: NO lesson permissions until Enrollment step)
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_VIEW)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_CREATE)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(false);
    expect(hasPermission(studentPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(false);
  });

  it('2. CreateLessonSchema should strip client-injected tenantId, courseId, moduleId, order, status, createdBy', () => {
    const maliciousPayload = {
      title: 'Lesson 1: Foundations',
      description: 'Introduction to Digital Marketing',
      type: 'TEXT',
      tenantId: '507f1f77bcf86cd799439011',
      courseId: '507f1f77bcf86cd799439022',
      moduleId: '507f1f77bcf86cd799439033',
      order: 999,
      status: 'INACTIVE',
      createdBy: '507f1f77bcf86cd799439044'
    };

    const parsed = CreateLessonSchema.parse(maliciousPayload) as any;

    expect(parsed.title).toBe('Lesson 1: Foundations');
    expect(parsed.description).toBe('Introduction to Digital Marketing');
    expect(parsed.type).toBe('TEXT');
    expect(parsed.tenantId).toBeUndefined();
    expect(parsed.courseId).toBeUndefined();
    expect(parsed.moduleId).toBeUndefined();
    expect(parsed.order).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.createdBy).toBeUndefined();
  });

  it('3. UpdateLessonSchema should strip client-injected order, status, courseId, moduleId, tenantId', () => {
    const maliciousUpdate = {
      title: 'Updated Lesson Title',
      order: 1,
      status: 'INACTIVE',
      courseId: '507f1f77bcf86cd799439022',
      moduleId: '507f1f77bcf86cd799439033'
    };

    const parsed = UpdateLessonSchema.parse(maliciousUpdate) as any;

    expect(parsed.title).toBe('Updated Lesson Title');
    expect(parsed.order).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.courseId).toBeUndefined();
    expect(parsed.moduleId).toBeUndefined();
  });

  it('4. ReorderLessonsSchema should reject duplicate lesson IDs', () => {
    const duplicatePayload = {
      lessonIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011']
    };

    const result = ReorderLessonsSchema.safeParse(duplicatePayload);
    expect(result.success).toBe(false);
  });

  it('5. ReorderLessonsSchema should reject invalid ObjectId formats', () => {
    const invalidIdPayload = {
      lessonIds: ['invalid-lesson-id-format']
    };

    const result = ReorderLessonsSchema.safeParse(invalidIdPayload);
    expect(result.success).toBe(false);
  });

  it('6. ReorderLessonsSchema should accept valid unique ObjectId arrays', () => {
    const validPayload = {
      lessonIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439033']
    };

    const result = ReorderLessonsSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('7. should deny lesson creation for instructors', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_CREATE)).toBe(false);
  });

  it('8. should deny lesson update for instructors', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_UPDATE)).toBe(false);
  });

  it('9. should deny lesson archiving for instructors', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.LESSON_ARCHIVE)).toBe(false);
  });

  it('10. should validate ExternalResourceContentSchema URL format', () => {
    const valid = ExternalResourceContentSchema.safeParse({ url: 'https://didm.in/resource-guide' });
    expect(valid.success).toBe(true);

    const invalid = ExternalResourceContentSchema.safeParse({ url: '' });
    expect(invalid.success).toBe(false);
  });
});
