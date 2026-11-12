import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import {
  TenantModel,
  UserModel,
  OrganizationMemberModel,
  OrganizationInvitationModel,
  SessionModel,
  AuditLogModel,
  connectDatabase,
  disconnectDatabase,
  runPlatformProvisioningOperation,
  runAuthBootstrapOperation,
  authorizePlatformSession
} from '@edtech/database';
import { tenantContextStorage, hashPassword } from '@edtech/utils';
import { OrganizationInvitationService } from '../organizationInvitation.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.8 Batch 7: OrganizationMember Fail-Closed, Invitation & Platform Security Suite', () => {
  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();
  const adminAId = new mongoose.Types.ObjectId();
  const adminBId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0';
    await connectDatabase(mongoUri);

    await OrganizationMemberModel.collection.deleteMany({});
    await OrganizationInvitationModel.collection.deleteMany({});
    await UserModel.collection.deleteMany({});
    await TenantModel.collection.deleteMany({});
    await SessionModel.collection.deleteMany({});

    await Promise.all([
      OrganizationMemberModel.syncIndexes(),
      OrganizationInvitationModel.syncIndexes(),
      UserModel.syncIndexes(),
      TenantModel.syncIndexes(),
      SessionModel.syncIndexes(),
      AuditLogModel.syncIndexes()
    ]);

    await TenantModel.create([
      { _id: tenantAId, name: 'Tenant A Org', slug: 'tenant-a-org', status: 'ACTIVE' },
      { _id: tenantBId, name: 'Tenant B Org', slug: 'tenant-b-org', status: 'ACTIVE' }
    ]);

    await tenantContextStorage.run(
      { currentTenantId: tenantAId.toString(), currentUser: { id: adminAId.toString(), tenantId: tenantAId.toString(), roles: ['TENANT_ADMIN'] } },
      async () => {
        await UserModel.create({
          _id: adminAId,
          tenantId: tenantAId,
          allowedTenantIds: [tenantAId],
          email: 'admin@tenant-a.com',
          name: 'Admin A',
          passwordHash: 'hash123',
          status: 'ACTIVE'
        });
        await OrganizationMemberModel.create({
          tenantId: tenantAId,
          userId: adminAId,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          branchAccessMode: 'ALL',
          joinedAt: new Date()
        });
      }
    );

    await tenantContextStorage.run(
      { currentTenantId: tenantBId.toString(), currentUser: { id: adminBId.toString(), tenantId: tenantBId.toString(), roles: ['TENANT_ADMIN'] } },
      async () => {
        await UserModel.create({
          _id: adminBId,
          tenantId: tenantBId,
          allowedTenantIds: [tenantBId],
          email: 'admin@tenant-b.com',
          name: 'Admin B',
          passwordHash: 'hash123',
          status: 'ACTIVE'
        });
        await OrganizationMemberModel.create({
          tenantId: tenantBId,
          userId: adminBId,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          branchAccessMode: 'ALL',
          joinedAt: new Date()
        });
      }
    );
  });

  afterAll(async () => {
    await OrganizationMemberModel.collection.deleteMany({});
    await OrganizationInvitationModel.collection.deleteMany({});
    await UserModel.collection.deleteMany({});
    await TenantModel.collection.deleteMany({});
    await SessionModel.collection.deleteMany({});
    await disconnectDatabase();
  });

  describe('1. OrganizationMember Fail-Closed Activation & Runtime Isolation', () => {
    it('fails closed when querying OrganizationMember without active tenant context', async () => {
      await expect(OrganizationMemberModel.find({})).rejects.toThrow(
        /Tenant context is required for tenant-owned model operation \(OrganizationMember\)/
      );
    });

    it('fails closed when creating OrganizationMember document without active tenant context', async () => {
      await expect(
        OrganizationMemberModel.create({
          tenantId: tenantAId,
          userId: new mongoose.Types.ObjectId(),
          role: 'INSTRUCTOR',
          status: 'ACTIVE'
        })
      ).rejects.toThrow(/Tenant context is required for tenant-owned model operation \(OrganizationMember\)/);
    });

    it('fails closed when running aggregation on OrganizationMember without tenant context', async () => {
      await expect(
        OrganizationMemberModel.aggregate([{ $match: { role: 'INSTRUCTOR' } }])
      ).rejects.toThrow(/Tenant context is required for tenant-owned model operation \(OrganizationMember\)/);
    });

    it('unconditionally rejects legacy bypassTenantFilter option', async () => {
      await expect(
        OrganizationMemberModel.find({}).setOptions({ bypassTenantFilter: true })
      ).rejects.toThrow(/Legacy tenant isolation option bypassTenantFilter is forbidden/);
    });

    it('strictly isolates members between tenants when tenant context is active', async () => {
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString() },
        async () => {
          const members = await OrganizationMemberModel.find({});
          expect(members.length).toBe(1);
          expect(members[0].tenantId.toString()).toBe(tenantAId.toString());
          expect(members[0].userId.toString()).toBe(adminAId.toString());
        }
      );

      await tenantContextStorage.run(
        { currentTenantId: tenantBId.toString() },
        async () => {
          const members = await OrganizationMemberModel.find({});
          expect(members.length).toBe(1);
          expect(members[0].tenantId.toString()).toBe(tenantBId.toString());
          expect(members[0].userId.toString()).toBe(adminBId.toString());
        }
      );
    });

    it('permits cross-tenant query only under verified PLATFORM provisioning operation', async () => {
      const allMembers = await runPlatformProvisioningOperation(
        'Verify platform cross-tenant visibility',
        async () => await OrganizationMemberModel.find({})
      );
      expect(allMembers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Organization Invitation Single-Use Concurrency & Role Immutability', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('creates an invitation with immutable tenant and role properties', async () => {
      await OrganizationInvitationModel.create({
        tenantId: tenantAId,
        email: 'invited-instructor@tenant-a.com',
        role: 'INSTRUCTOR',
        tokenHash,
        status: 'PENDING',
        invitedBy: adminAId,
        expiresAt: new Date(Date.now() + 86400000)
      });

      const inv = await OrganizationInvitationService.getInvitationByToken(rawToken);
      expect(inv.email).toBe('invited-instructor@tenant-a.com');
      expect(inv.role).toBe('INSTRUCTOR');
      expect(inv.tenantId).toBe(tenantAId.toString());
    });

    it('enforces atomic single-use state transition under 10 concurrent acceptance attempts', async () => {
      const attempts = Array.from({ length: 10 }, () =>
        OrganizationInvitationService.acceptInvitation(rawToken, {
          name: 'Invited Instructor',
          password: 'Password123!'
        })
      );

      const results = await Promise.allSettled(attempts);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(9);

      // Verify the single winner received correct response
      const winner = (fulfilled[0] as PromiseFulfilledResult<any>).value;
      expect(winner.success).toBe(true);
      expect(winner.role).toBe('INSTRUCTOR');
      expect(winner.tenantId).toBe(tenantAId.toString());

      // Verify member record was created in Tenant A with INSTRUCTOR role
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString() },
        async () => {
          const member = await OrganizationMemberModel.findById(winner.memberId);
          expect(member).toBeDefined();
          expect(member!.tenantId.toString()).toBe(tenantAId.toString());
          expect(member!.role).toBe('INSTRUCTOR');
        }
      );

      // Verify all rejected attempts failed with NotFoundError (Invalid, accepted, or revoked)
      for (const rej of rejected) {
        expect((rej as PromiseRejectedResult).reason.message).toMatch(/Invalid, accepted, or revoked/);
      }
    });

    it('rejects expired invitation token and marks it EXPIRED', async () => {
      const expiredRawToken = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');

      await OrganizationInvitationModel.create({
        tenantId: tenantAId,
        email: 'expired-user@tenant-a.com',
        role: 'STUDENT',
        tokenHash: expiredHash,
        status: 'PENDING',
        invitedBy: adminAId,
        expiresAt: new Date(Date.now() - 3600000) // 1 hour in the past
      });

      await expect(
        OrganizationInvitationService.acceptInvitation(expiredRawToken, {
          name: 'Expired User',
          password: 'Password123!'
        })
      ).rejects.toThrow(/Invitation token has expired/);

      const updated = await OrganizationInvitationModel.findOne({ tokenHash: expiredHash });
      expect(updated?.status).toBe('EXPIRED');
    });

    it('reverts atomic claim to PENDING if account creation fails validation', async () => {
      const invalidToken = crypto.randomBytes(32).toString('hex');
      const invalidHash = crypto.createHash('sha256').update(invalidToken).digest('hex');

      await OrganizationInvitationModel.create({
        tenantId: tenantAId,
        email: 'short-pwd@tenant-a.com',
        role: 'STUDENT',
        tokenHash: invalidHash,
        status: 'PENDING',
        invitedBy: adminAId,
        expiresAt: new Date(Date.now() + 86400000)
      });

      // Pass short password (< 8 chars)
      await expect(
        OrganizationInvitationService.acceptInvitation(invalidToken, {
          name: 'Short Pwd',
          password: 'short'
        })
      ).rejects.toThrow(/Password of at least 8 characters is required/);

      // Token must have been reverted to PENDING so user is not locked out
      const tokenDoc = await OrganizationInvitationModel.findOne({ tokenHash: invalidHash });
      expect(tokenDoc?.status).toBe('PENDING');

      // Subsequent valid attempt should now succeed!
      const validRes = await OrganizationInvitationService.acceptInvitation(invalidToken, {
        name: 'Valid Pwd',
        password: 'ValidPassword123!'
      });
      expect(validRes.success).toBe(true);
    });
  });

  describe('3. Platform SuperAdmin Exception & Tenant Independence', () => {
    it('prevents tenant user creation from setting isSuperAdmin: true', async () => {
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString() },
        async () => {
          await expect(
            UserModel.create({
              tenantId: tenantAId,
              name: 'Malicious SuperAdmin Attempt',
              email: 'malicious@tenant-a.com',
              passwordHash: 'hash123',
              isSuperAdmin: true,
              status: 'ACTIVE'
            })
          ).rejects.toThrow(/Tenant user cannot be platform SuperAdmin/);
        }
      );
    });

    it('prevents public registration from creating platform SuperAdmin', async () => {
      await expect(
        runAuthBootstrapOperation(
          'REGISTER_USER_BY_EMAIL',
          'public-attacker@example.com',
          () =>
            UserModel.create({
              tenantId: tenantAId,
              name: 'Public Attacker',
              email: 'public-attacker@example.com',
              passwordHash: 'hash123',
              isSuperAdmin: true,
              status: 'ACTIVE'
            })
        )
      ).rejects.toThrow(/Public registration cannot create platform SuperAdmin/);
    });

    it('allows platform identity provisioning strictly with tenantId: null under PLATFORM context', async () => {
      const platformSuperAdmin = await runPlatformProvisioningOperation(
        'Seed root platform administrator',
        async () => {
          return await UserModel.create({
            tenantId: null,
            name: 'Root Platform SuperAdmin',
            email: 'platform.root@didm.io',
            passwordHash: await hashPassword('SuperPlatformSecret2026!'),
            isSuperAdmin: true,
            status: 'ACTIVE'
          });
        }
      );

      expect(platformSuperAdmin._id).toBeDefined();
      expect(platformSuperAdmin.isSuperAdmin).toBe(true);
      expect(platformSuperAdmin.tenantId).toBeNull();
    });

    it('tenant-scoped query never returns platform superadmin users', async () => {
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString() },
        async () => {
          const user = await UserModel.findOne({ email: 'platform.root@didm.io' });
          expect(user).toBeNull();
        }
      );
    });

    it('rejects expired or revoked platform session during authorizePlatformSession', async () => {
      const superAdminUser = await runPlatformProvisioningOperation(
        'Find platform admin',
        async () => await UserModel.findOne({ email: 'platform.root@didm.io' })
      );

      // Create revoked session
      const revokedSession = await SessionModel.create({
        userId: superAdminUser!._id,
        currentRefreshTokenHash: 'revoked-hash-123',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });

      await expect(
        authorizePlatformSession({
          actorId: superAdminUser!._id.toString(),
          sessionId: revokedSession._id.toString(),
          reason: 'Test revoked session',
          correlationId: 'corr-1'
        })
      ).rejects.toThrow(/Platform Super Admin session is expired or revoked/);

      // Create session for non-superadmin user
      const nonAdminSession = await SessionModel.create({
        userId: adminAId,
        currentRefreshTokenHash: 'tenant-admin-hash-123',
        expiresAt: new Date(Date.now() + 3600000)
      });

      await expect(
        authorizePlatformSession({
          actorId: adminAId.toString(),
          sessionId: nonAdminSession._id.toString(),
          reason: 'Test non-admin',
          correlationId: 'corr-2'
        })
      ).rejects.toThrow(/Active platform SuperAdmin permission is required/);
    });
  });
});
