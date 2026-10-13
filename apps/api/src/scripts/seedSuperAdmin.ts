import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase, UserModel, TenantModel, RoleModel } from '@edtech/database';
import { hashPassword } from '@edtech/utils';
import { SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';

dotenv.config();

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL || 'admin@didm.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdminSecret123!';
  const name = process.env.SUPERADMIN_NAME || 'Platform Super Admin';
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/edtech_lms';

  console.log(`[Seed Script] Bootstrapping DIDM Workspace & Platform Super Admin (${email})...`);

  await connectDatabase(mongoUri);

  // 1. Ensure Default DIDM Workspace Tenant exists
  let didmTenant = await TenantModel.findOne({ slug: 'didm' });
  if (!didmTenant) {
    didmTenant = await TenantModel.create({
      name: 'DIDM Workspace',
      slug: 'didm',
      planId: 'ENTERPRISE',
      status: 'ACTIVE'
    });
    console.log(`[Seed Script] Created DIDM Workspace Tenant (ID: ${didmTenant._id}).`);
  }

  // 2. Ensure Super Admin System Role exists for DIDM Tenant
  let superAdminRole = await RoleModel.findOne({ tenantId: didmTenant._id, slug: 'super-admin' });
  if (!superAdminRole) {
    superAdminRole = await RoleModel.create({
      tenantId: didmTenant._id,
      name: 'Super Admin',
      slug: 'super-admin',
      description: 'Platform Super Admin role',
      permissions: SYSTEM_ROLE_PERMISSIONS.SUPER_ADMIN,
      isSystemRole: true
    });
  }

  // 3. Create or update Platform Super Admin User
  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.tenantId = didmTenant._id as any;
    existing.isSuperAdmin = true;
    existing.roles = [superAdminRole._id as any];
    await existing.save();
    console.log(`[Seed Script] Super Admin user '${email}' updated to DIDM Workspace.`);
  } else {
    const passwordHash = await hashPassword(password);
    const superAdmin = await UserModel.create({
      tenantId: didmTenant._id,
      allowedTenantIds: [didmTenant._id],
      name,
      email: email.toLowerCase(),
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: true,
      roles: [superAdminRole._id]
    });
    console.log(`[Seed Script] Platform Super Admin successfully created (ID: ${superAdmin._id}).`);
  }

  await disconnectDatabase();
  process.exit(0);
}

seedSuperAdmin().catch((err) => {
  console.error('[Seed Script Failure]', err);
  process.exit(1);
});
