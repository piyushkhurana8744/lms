import {
  TenantModel,
  RoleModel,
  UserModel,
  OrganizationSettingsModel,
  OrganizationBrandingModel
} from '@edtech/database';
import { SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { hashPassword, logger } from '@edtech/utils';

export async function autoBootstrapInitialTenant(): Promise<void> {
  try {
    const tenantCount = await TenantModel.countDocuments();
    if (tenantCount > 0) {
      return;
    }

    logger.info('[Bootstrap] Empty database detected. Initializing default DIDM tenant and super admin...');

    const email = (process.env.SUPERADMIN_EMAIL || 'admin@bubududuworld.fun').toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD || 'Admin@123456';
    const name = process.env.SUPERADMIN_NAME || 'Platform Administrator';
    const companyName = process.env.ORG_NAME || 'DIDM Digital Institute';

    // 1. Create Default DIDM Workspace Tenant
    const tenant = await TenantModel.create({
      name: companyName,
      slug: 'didm',
      planId: 'ENTERPRISE',
      status: 'ACTIVE',
      branding: {
        companyName,
        primaryColor: '#BE1E2E',
        secondaryColor: '#1A1A1A',
        showPlatformBranding: true
      }
    });

    // 2. Create Super Admin Role
    const superAdminRole = await RoleModel.create({
      tenantId: tenant._id,
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Platform Super Administrator with all permissions',
      permissions: SYSTEM_ROLE_PERMISSIONS.SUPER_ADMIN,
      isSystemRole: true
    });

    // 3. Create Super Admin User
    const passwordHash = await hashPassword(password);
    await UserModel.create({
      tenantId: tenant._id,
      allowedTenantIds: [tenant._id],
      name,
      email,
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: true,
      roles: [superAdminRole._id]
    });

    // 4. Create Organization Settings
    await OrganizationSettingsModel.create({
      tenantId: tenant._id,
      profile: {
        organizationName: companyName,
        contactEmail: email,
        timezone: 'Asia/Kolkata',
        currency: 'INR'
      },
      lmsPreferences: {
        allowStudentSelfRegistration: true,
        requireEmailVerification: false
      }
    });

    // 5. Create Organization Branding
    await OrganizationBrandingModel.create({
      tenantId: tenant._id,
      primaryColor: '#BE1E2E',
      secondaryColor: '#1A1A1A',
      accentColor: '#FF3B30',
      fontFamily: 'Inter',
      companyName
    });

    logger.info(`[Bootstrap] Default tenant '${tenant.name}' created with Super Admin (${email}).`);
  } catch (error) {
    logger.error('[Bootstrap] Failed to auto-bootstrap initial workspace:', error);
  }
}
