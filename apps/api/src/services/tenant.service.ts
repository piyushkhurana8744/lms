import { TenantModel, RoleModel, UserModel } from '@edtech/database';
import { SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { hashPassword, resolveBranding } from '@edtech/utils';
import { BadRequestError, NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';
import { OrganizationBrandingService } from './organizationBranding.service';
import { TenantProvisioningService } from './tenantProvisioning.service';
import mongoose from 'mongoose';


export class TenantService {
  /**
   * Atomic Tenant Creation with Default Role Seeding
   */
  public static async createTenant(params: {
    name: string;
    slug: string;
    customDomain?: string;
    planId?: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
    actorId: string;
  }) {
    const existingTenant = await TenantModel.findOne({ slug: params.slug.toLowerCase() });
    if (existingTenant) {
      throw new BadRequestError(`Tenant with slug '${params.slug}' already exists`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create Tenant Document
      const tenant = new TenantModel({
        name: params.name,
        slug: params.slug.toLowerCase(),
        customDomain: params.customDomain,
        planId: params.planId || 'STARTER',
        status: 'ACTIVE'
      });
      await tenant.save({ session });

      // 2. Initialize Default Tenant Roles
      const adminRole = new RoleModel({
        tenantId: tenant._id,
        name: 'Tenant Admin',
        slug: 'tenant-admin',
        description: 'Default full administrator role for tenant',
        permissions: SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN,
        isSystemRole: true
      });
      await adminRole.save({ session });

      const instructorRole = new RoleModel({
        tenantId: tenant._id,
        name: 'Instructor',
        slug: 'instructor',
        description: 'Default instructor role for tenant',
        permissions: SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR,
        isSystemRole: true
      });
      await instructorRole.save({ session });

      const studentRole = new RoleModel({
        tenantId: tenant._id,
        name: 'Student',
        slug: 'student',
        description: 'Default student role for tenant',
        permissions: SYSTEM_ROLE_PERMISSIONS.STUDENT,
        isSystemRole: true
      });
      await studentRole.save({ session });

      // 3. Create Tenant Admin User
      const passwordHash = await hashPassword(params.adminPassword);
      const tenantAdminUser = new UserModel({
        tenantId: tenant._id,
        name: params.adminName,
        email: params.adminEmail.toLowerCase(),
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: [adminRole._id]
      });
      await tenantAdminUser.save({ session });

      await session.commitTransaction();
      session.endSession();

      // Provision tenant default settings & website idempotently
      try {
        await TenantProvisioningService.provisionTenant(tenant._id.toString());
      } catch (provErr) {
        // Safe logging if non-critical setup step succeeds partially
      }

      await AuditService.logEvent({
        actorId: params.actorId,
        tenantId: 'PLATFORM',
        action: 'TENANT_CREATED',
        resource: 'Tenant',
        resourceId: tenant._id.toString(),
        metadata: { slug: tenant.slug, adminEmail: params.adminEmail }
      });

      return {
        tenant,
        adminUser: {
          id: tenantAdminUser._id.toString(),
          email: tenantAdminUser.email,
          name: tenantAdminUser.name
        }
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  public static async getAllTenants() {
    return TenantModel.find().sort({ createdAt: -1 });
  }

  public static async getTenantById(tenantId: string) {
    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }
    return tenant;
  }

  public static async updateTenantStatus(tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE', actorId: string) {
    const tenant = await TenantModel.findByIdAndUpdate(tenantId, { $set: { status } }, { new: true });
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    await AuditService.logEvent({
      actorId,
      tenantId: 'PLATFORM',
      action: 'TENANT_STATUS_UPDATED',
      resource: 'Tenant',
      resourceId: tenantId,
      metadata: { newStatus: status }
    });

    return tenant;
  }

  public static async getTenantBranding(slugOrDomain?: string) {
    let tenant = slugOrDomain
      ? await TenantModel.findOne({
          $or: [{ slug: slugOrDomain.toLowerCase() }, { customDomain: slugOrDomain.toLowerCase() }]
        }).lean()
      : await TenantModel.findOne({ status: 'ACTIVE' }).sort({ createdAt: 1 }).lean();

    if (!tenant) {
      tenant = await TenantModel.findOne({ slug: 'didm' }).lean();
    }

    if (tenant) {
      const publicBranding = await OrganizationBrandingService.getPublicBranding(tenant._id.toString());
      return {

        companyName: publicBranding.organizationName || tenant.name,
        logoUrl: publicBranding.logoUrl || tenant.branding?.logoUrl || '/didmlogo.png',
        faviconUrl: publicBranding.faviconUrl || tenant.branding?.faviconUrl || '/didmfavicon.png',
        primaryColor: publicBranding.primaryColor || '#BE1E2E',
        secondaryColor: publicBranding.secondaryColor || '#1F2937',
        accentColor: publicBranding.accentColor || '#F59E0B',
        backgroundColor: publicBranding.backgroundColor,
        surfaceColor: publicBranding.surfaceColor,
        textColor: publicBranding.textColor,
        fontFamily: publicBranding.fontFamily || 'Inter',
        showPlatformBranding: tenant.branding?.showPlatformBranding ?? true,
        loginPage: publicBranding.loginPage,
        browser: publicBranding.browser,
        social: publicBranding.social
      };
    }

    return resolveBranding(null);
  }
}

