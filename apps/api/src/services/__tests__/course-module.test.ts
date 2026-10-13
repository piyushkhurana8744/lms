import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { CreateModuleSchema, UpdateModuleSchema, ReorderModulesSchema } from '@edtech/validation';

describe('STEP 3B — Course Module Security & Architecture Tests', () => {
  it('1. should verify TENANT_ADMIN has full module permissions and INSTRUCTOR has course.module.view ONLY', () => {
    const adminPermissions = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;

    // Tenant Admin
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_CREATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_UPDATE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.COURSE_MODULE_ARCHIVE)).toBe(true);

    // Instructor (Strict STEP 3B Rule: course.module.view ONLY)
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_VIEW)).toBe(true);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_CREATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_UPDATE)).toBe(false);
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_ARCHIVE)).toBe(false);
  });

  it('2. CreateModuleSchema should strip client-injected tenantId, courseId, order, status, createdBy', () => {
    const maliciousPayload = {
      title: 'Module 1: Foundations',
      description: 'Introduction to Core Marketing',
      tenantId: '507f1f77bcf86cd799439011',
      courseId: '507f1f77bcf86cd799439022',
      order: 999,
      status: 'ARCHIVED',
      createdBy: '507f1f77bcf86cd799439033'
    };

    const parsed = CreateModuleSchema.parse(maliciousPayload) as any;

    expect(parsed.title).toBe('Module 1: Foundations');
    expect(parsed.description).toBe('Introduction to Core Marketing');
    expect(parsed.tenantId).toBeUndefined();
    expect(parsed.courseId).toBeUndefined();
    expect(parsed.order).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.createdBy).toBeUndefined();
  });

  it('3. UpdateModuleSchema should strip client-injected order, status, courseId, tenantId', () => {
    const maliciousUpdate = {
      title: 'Updated Module Title',
      order: 1,
      status: 'ARCHIVED',
      courseId: '507f1f77bcf86cd799439022'
    };

    const parsed = UpdateModuleSchema.parse(maliciousUpdate) as any;

    expect(parsed.title).toBe('Updated Module Title');
    expect(parsed.order).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.courseId).toBeUndefined();
  });

  it('4. ReorderModulesSchema should reject duplicate module IDs', () => {
    const duplicatePayload = {
      moduleIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011']
    };

    const result = ReorderModulesSchema.safeParse(duplicatePayload);
    expect(result.success).toBe(false);
  });

  it('5. ReorderModulesSchema should reject invalid ObjectId formats', () => {
    const invalidIdPayload = {
      moduleIds: ['invalid-id-format']
    };

    const result = ReorderModulesSchema.safeParse(invalidIdPayload);
    expect(result.success).toBe(false);
  });

  it('6. ReorderModulesSchema should accept valid unique ObjectId arrays', () => {
    const validPayload = {
      moduleIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439033']
    };

    const result = ReorderModulesSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('7. should deny module creation for instructors', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_CREATE)).toBe(false);
  });

  it('8. should deny module update for instructors', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_UPDATE)).toBe(false);
  });

  it('9. should deny module archiving for instructors', () => {
    const instructorPermissions = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPermissions, PERMISSIONS.COURSE_MODULE_ARCHIVE)).toBe(false);
  });
});
