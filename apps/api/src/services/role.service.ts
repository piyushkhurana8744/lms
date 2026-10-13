import { RoleModel } from '@edtech/database';
import { PERMISSIONS, SYSTEM_ROLE_PERMISSIONS, PERMISSION_CATEGORIES } from '@edtech/permissions';
import { BadRequestError, NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';

export class RoleService {
  public static async getTenantRoles(tenantId: string) {
    let roles = await RoleModel.find({ tenantId }).sort({ isSystemRole: -1, createdAt: -1 });
    
    // If no roles exist for this tenant, seed the system defaults
    if (roles.length === 0) {
      await this.seedDefaultTenantRoles(tenantId);
      roles = await RoleModel.find({ tenantId }).sort({ isSystemRole: -1, createdAt: -1 });
    }

    return roles;
  }

  public static async seedDefaultTenantRoles(tenantId: string) {
    const defaultRoles = [
      {
        tenantId,
        name: 'Tenant Admin',
        slug: 'tenant_admin',
        description: 'Full administrative access and organization management',
        permissions: SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN,
        isSystemRole: true
      },
      {
        tenantId,
        name: 'Instructor',
        slug: 'instructor',
        description: 'Curriculum creation, batch scheduling, and class instruction',
        permissions: SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR,
        isSystemRole: true
      },
      {
        tenantId,
        name: 'Student',
        slug: 'student',
        description: 'Enrolled learner access to courses and progress tracking',
        permissions: SYSTEM_ROLE_PERMISSIONS.STUDENT,
        isSystemRole: true
      }
    ];

    for (const r of defaultRoles) {
      const exists = await RoleModel.findOne({ tenantId, slug: r.slug });
      if (!exists) {
        await RoleModel.create(r);
      }
    }
  }

  public static async createRole(
    tenantId: string,
    params: { name: string; slug?: string; description?: string; permissions?: string[] },
    actorId: string
  ) {
    const slug = (params.slug || params.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = await RoleModel.findOne({ tenantId, slug });
    if (existing) {
      throw new BadRequestError(`Role with identifier '${slug}' already exists in this organization`);
    }

    const role = await RoleModel.create({
      tenantId,
      name: params.name,
      slug,
      description: params.description,
      permissions: params.permissions || [],
      isSystemRole: false
    });

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'ROLE_CREATED',
      resource: 'Role',
      resourceId: role._id.toString(),
      metadata: { name: role.name, slug: role.slug, permissionsCount: role.permissions.length }
    });

    return role;
  }

  public static async updateRole(
    tenantId: string,
    roleId: string,
    updates: { name?: string; description?: string; permissions?: string[] },
    actorId: string
  ) {
    const role = await RoleModel.findOne({ _id: roleId, tenantId });
    if (!role) {
      throw new NotFoundError('Role not found in tenant');
    }

    if (role.isSystemRole && updates.name && updates.name !== role.name) {
      throw new BadRequestError('Built-in system role names cannot be renamed');
    }

    if (updates.name) role.name = updates.name;
    if (updates.description !== undefined) role.description = updates.description;
    if (updates.permissions) role.permissions = updates.permissions;

    await role.save();

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'ROLE_UPDATED',
      resource: 'Role',
      resourceId: roleId,
      metadata: { name: role.name, permissionsCount: role.permissions.length }
    });

    return role;
  }

  public static async deleteRole(tenantId: string, roleId: string, actorId: string) {
    const role = await RoleModel.findOne({ _id: roleId, tenantId });
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystemRole) {
      throw new BadRequestError('Built-in system roles cannot be deleted');
    }

    await RoleModel.findByIdAndDelete(roleId);

    await AuditService.logEvent({
      actorId,
      tenantId,
      action: 'ROLE_DELETED',
      resource: 'Role',
      resourceId: roleId,
      metadata: { slug: role.slug }
    });

    return { deleted: true, roleId };
  }

  public static getAvailablePermissions() {
    return Object.values(PERMISSIONS);
  }

  public static getCategorizedPermissions() {
    return PERMISSION_CATEGORIES;
  }
}
