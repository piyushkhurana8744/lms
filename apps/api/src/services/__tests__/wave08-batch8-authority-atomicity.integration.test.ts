import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'crypto';
import {
  TenantModel,
  UserModel,
  OrganizationMemberModel,
  OrganizationInvitationModel,
  BranchModel,
  AuditLogModel,
  SessionModel,
  connectDatabase,
  disconnectDatabase,
  runAuthorizedSystemOperation,
  runPlatformProvisioningOperation,
  authorizeInternalSystemCaller
} from '@edtech/database';
import { tenantContextStorage, hashPassword } from '@edtech/utils';
import { BranchAccessService } from '../branchAccess.service';
import { OrganizationInvitationService } from '../organizationInvitation.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.8 Batch 8: Tenant Authority Hardening & Invitation Atomicity Suite', () => {
  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();
  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();
  const multiTenantUserId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0';
    await connectDatabase(mongoUri);

    await BranchModel.collection.deleteMany({});
    await OrganizationMemberModel.collection.deleteMany({});
    await OrganizationInvitationModel.collection.deleteMany({});
    await UserModel.collection.deleteMany({});
    await TenantModel.collection.deleteMany({});
    await SessionModel.collection.deleteMany({});
    await AuditLogModel.collection.deleteMany({});

    await Promise.all([
      BranchModel.syncIndexes(),
      OrganizationMemberModel.syncIndexes(),
      OrganizationInvitationModel.syncIndexes(),
      UserModel.syncIndexes(),
      TenantModel.syncIndexes(),
      SessionModel.syncIndexes(),
      AuditLogModel.syncIndexes()
    ]);

    await TenantModel.create([
      { _id: tenantAId, name: 'Tenant Alpha', slug: 'tenant-alpha-b8', status: 'ACTIVE' },
      { _id: tenantBId, name: 'Tenant Beta', slug: 'tenant-beta-b8', status: 'ACTIVE' }
    ]);

    await BranchModel.collection.insertMany([
      { _id: branchAId, tenantId: tenantAId, name: 'Branch Alpha 1', code: 'BA1', slug: 'ba1', status: 'ACTIVE', isPrimary: true },
      { _id: branchBId, tenantId: tenantBId, name: 'Branch Beta 1', code: 'BB1', slug: 'bb1', status: 'ACTIVE', isPrimary: true }
    ]);

    await tenantContextStorage.run(
      { currentTenantId: tenantAId.toString(), currentUserId: userAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
      async () => {
        await UserModel.create({
          _id: userAId,
          tenantId: tenantAId,
          allowedTenantIds: [tenantAId],
          name: 'User Alpha',
          email: 'alpha@b8.test',
          passwordHash: 'hash',
          status: 'ACTIVE',
          isSuperAdmin: false
        });
        await OrganizationMemberModel.create({
          tenantId: tenantAId,
          userId: userAId,
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
          branchAccessMode: 'SELECTED',
          branchIds: [branchAId],
          joinedAt: new Date()
        });
      }
    );

    await tenantContextStorage.run(
      { currentTenantId: tenantBId.toString(), currentUserId: userBId.toString(), isPlatformContext: false, allowedTenantIds: [tenantBId.toString()] },
      async () => {
        await UserModel.create({
          _id: userBId,
          tenantId: tenantBId,
          allowedTenantIds: [tenantBId],
          name: 'User Beta',
          email: 'beta@b8.test',
          passwordHash: 'hash',
          status: 'ACTIVE',
          isSuperAdmin: false
        });
        await OrganizationMemberModel.create({
          tenantId: tenantBId,
          userId: userBId,
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
          branchAccessMode: 'SELECTED',
          branchIds: [branchBId],
          joinedAt: new Date()
        });
      }
    );

    // Multi-tenant user with membership in both A and B
    await tenantContextStorage.run(
      { currentTenantId: tenantAId.toString(), currentUserId: multiTenantUserId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString(), tenantBId.toString()] },
      async () => {
        await UserModel.create({
          _id: multiTenantUserId,
          tenantId: tenantAId,
          allowedTenantIds: [tenantAId, tenantBId],
          name: 'Multi User',
          email: 'multi@b8.test',
          passwordHash: 'hash',
          status: 'ACTIVE',
          isSuperAdmin: false
        });
        await OrganizationMemberModel.create({
          tenantId: tenantAId,
          userId: multiTenantUserId,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          branchAccessMode: 'ALL',
          branchIds: [],
          joinedAt: new Date()
        });
      }
    );

    await tenantContextStorage.run(
      { currentTenantId: tenantBId.toString(), currentUserId: multiTenantUserId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString(), tenantBId.toString()] },
      async () => {
        await OrganizationMemberModel.create({
          tenantId: tenantBId,
          userId: multiTenantUserId,
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          branchAccessMode: 'ALL',
          branchIds: [],
          joinedAt: new Date()
        });
      }
    );
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Priority 1: Tenant Authority & Cross-Tenant Rejection in BranchAccessService', () => {
    it('rejects cross-tenant context switch when active context does not match target tenantId', async () => {
      // User A is active in Tenant A. Attempting to get scope or assert branch in Tenant B must throw.
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), currentUserId: userAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
        async () => {
          await expect(
            BranchAccessService.getScope(tenantBId.toString(), { userId: userAId.toString() })
          ).rejects.toThrow('Cross-tenant access forbidden: tenant mismatch');

          await expect(
            BranchAccessService.assertBranchAccess(tenantBId.toString(), { userId: userAId.toString() }, branchBId.toString())
          ).rejects.toThrow('Cross-tenant access forbidden: tenant mismatch');
        }
      );
    });

    it('rejects unverified isSuperAdmin: true flag from normal tenant actor attempting to bypass branch access', async () => {
      // User A in Tenant A claims isSuperAdmin: true in actor payload without platform authority
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), currentUserId: userAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
        async () => {
          // Cross tenant switch still rejected even if actor.isSuperAdmin is true
          await expect(
            BranchAccessService.getScope(tenantBId.toString(), { userId: userAId.toString(), isSuperAdmin: true })
          ).rejects.toThrow('Cross-tenant access forbidden: tenant mismatch');

          // Inside tenant A, unverified isSuperAdmin does not grant ALL access to branches not in their scope
          const fakeBranchId = new mongoose.Types.ObjectId();
          await expect(
            BranchAccessService.assertBranchAccess(tenantAId.toString(), { userId: userAId.toString(), isSuperAdmin: true }, fakeBranchId.toString())
          ).rejects.toThrow('Branch not found');
        }
      );
    });

    it('allows verified platform context to access any tenant branches', async () => {
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), currentUserId: 'superadmin', isPlatformContext: true },
        async () => {
          const scope = await BranchAccessService.getScope(tenantBId.toString(), { userId: 'superadmin', isSuperAdmin: true });
          expect(scope.mode).toBe('ALL');
        }
      );
    });

    it('rejects unauthenticated caller without active membership in target tenant', async () => {
      const nonMemberId = new mongoose.Types.ObjectId();
      await expect(
        BranchAccessService.getScope(tenantBId.toString(), { userId: nonMemberId.toString() })
      ).rejects.toThrow('Active tenant membership required');
    });

    it('allows multi-tenant user session when target tenant is in allowedTenantIds', async () => {
      // Multi-tenant user starts with context in Tenant A, but has Tenant B in allowedTenantIds
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), currentUserId: multiTenantUserId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString(), tenantBId.toString()] },
        async () => {
          const scope = await BranchAccessService.getScope(tenantBId.toString(), { userId: multiTenantUserId.toString() });
          expect(scope.mode).toBe('ALL');
        }
      );
    });

    it('allows offline/worker execution under verified SYSTEM authority with matching tenantId', async () => {
      const secret = 'test-internal-worker-secret-b8';
      process.env.INTERNAL_WORKER_SECRET = secret;
      const authority = authorizeInternalSystemCaller(secret, 'worker-batch-8');
      expect(authority).toBeDefined();

      const scope = await runAuthorizedSystemOperation(
        authority!,
        { kind: 'WORKER_CLAIM', reason: 'Batch 8 worker proof', correlationId: 'b8-corr-1', tenantId: tenantBId.toString() },
        async () => {
          return await BranchAccessService.getScope(tenantBId.toString(), { userId: userBId.toString() });
        }
      );

      expect(scope.mode).toBe('SELECTED');
      expect(scope.branchIds).toContain(branchBId.toString());
    });

    it('rejects offline/worker execution under SYSTEM authority when tenantId mismatches authority', async () => {
      const secret = 'test-internal-worker-secret-b8';
      process.env.INTERNAL_WORKER_SECRET = secret;
      const authority = authorizeInternalSystemCaller(secret, 'worker-batch-8');

      await expect(
        runAuthorizedSystemOperation(
          authority!,
          { kind: 'WORKER_CLAIM', reason: 'Batch 8 worker proof', correlationId: 'b8-corr-2', tenantId: tenantAId.toString() },
          async () => {
            return await BranchAccessService.getScope(tenantBId.toString(), { userId: userAId.toString() });
          }
        )
      ).rejects.toThrow('System execution tenant mismatch');
    });
  });

  describe('Priority 2: Invitation Multi-Document Transactional Atomicity', () => {
    it('aborts transaction and leaves invitation PENDING when user creation fails validation', async () => {
      const rawToken = 'test-token-atomicity-fail-pwd';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await OrganizationInvitationModel.create({
        tenantId: tenantAId,
        email: 'atomic.fail.pwd@b8.test',
        role: 'INSTRUCTOR',
        tokenHash,
        status: 'PENDING',
        invitedBy: userAId,
        expiresAt: new Date(Date.now() + 86400000)
      });

      // Pass invalid password (< 8 chars)
      await expect(
        OrganizationInvitationService.acceptInvitation(rawToken, {
          name: 'Atomic Fail',
          password: 'short'
        })
      ).rejects.toThrow('Password of at least 8 characters is required for new accounts');

      // Invariant: Invitation MUST remain PENDING in MongoDB
      const invitation = await OrganizationInvitationModel.findOne({ tokenHash });
      expect(invitation?.status).toBe('PENDING');
      expect((invitation as any)?.acceptedAt).toBeUndefined();

      // Invariant: User was NEVER created in MongoDB
      const user = await UserModel.collection.findOne({ email: 'atomic.fail.pwd@b8.test' });
      expect(user).toBeNull();

      // Invariant: Member was NEVER created in MongoDB
      const member = await OrganizationMemberModel.collection.findOne({ tenantId: tenantAId, 'metadata.email': 'atomic.fail.pwd@b8.test' });
      expect(member).toBeNull();
    });

    it('succeeds cleanly on subsequent retry after aborted failure', async () => {
      const rawToken = 'test-token-atomicity-fail-pwd';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Retry with valid password
      const result = await OrganizationInvitationService.acceptInvitation(rawToken, {
        name: 'Atomic Recovered',
        password: 'ValidPassword123!'
      });

      expect(result.success).toBe(true);
      expect(result.role).toBe('INSTRUCTOR');

      // Invariant: Invitation is now ACCEPTED
      const invitation = await OrganizationInvitationModel.findOne({ tokenHash });
      expect(invitation?.status).toBe('ACCEPTED');

      // Invariant: User and Member now exist
      const user = await UserModel.collection.findOne({ email: 'atomic.fail.pwd@b8.test' });
      expect(user).not.toBeNull();
      expect(user?.name).toBe('Atomic Recovered');

      const member = await OrganizationMemberModel.collection.findOne({ tenantId: tenantAId, userId: user!._id });
      expect(member).not.toBeNull();
      expect(member?.role).toBe('INSTRUCTOR');
      expect(member?.status).toBe('ACTIVE');
    });

    it('enforces 10-way concurrent invitation acceptance with exactly 1 winner and 0 duplicate records', async () => {
      const rawToken = 'test-token-10way-concurrency-b8';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await OrganizationInvitationModel.create({
        tenantId: tenantAId,
        email: 'concurrency.winner@b8.test',
        role: 'INSTRUCTOR',
        tokenHash,
        status: 'PENDING',
        invitedBy: userAId,
        expiresAt: new Date(Date.now() + 86400000)
      });

      // Launch 10 simultaneous claims
      const claims = await Promise.allSettled(
        Array.from({ length: 10 }).map(() =>
          OrganizationInvitationService.acceptInvitation(rawToken, {
            name: 'Concurrency Candidate',
            password: 'SecurePassword123!'
          })
        )
      );

      const fulfilled = claims.filter((c) => c.status === 'fulfilled');
      const rejected = claims.filter((c) => c.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(9);

      // Verify exact single document invariants
      const userCount = await UserModel.collection.countDocuments({ email: 'concurrency.winner@b8.test' });
      expect(userCount).toBe(1);

      const createdUser = await UserModel.collection.findOne({ email: 'concurrency.winner@b8.test' });
      const memberCount = await OrganizationMemberModel.collection.countDocuments({
        tenantId: tenantAId,
        userId: createdUser!._id
      });
      expect(memberCount).toBe(1);

      const invitation = await OrganizationInvitationModel.findOne({ tokenHash });
      expect(invitation?.status).toBe('ACCEPTED');
    });

    it('rejects token replay once transaction commits ACCEPTED state', async () => {
      const rawToken = 'test-token-10way-concurrency-b8';
      await expect(
        OrganizationInvitationService.acceptInvitation(rawToken, {
          name: 'Replay Attacker',
          password: 'AnotherPassword123!'
        })
      ).rejects.toThrow('Invalid, accepted, or revoked invitation token');
    });

    it('enforces tenant and role immutability strictly from persisted invitation record', async () => {
      const rawToken = 'test-token-immutability-b8';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Invitation issued strictly for Tenant B with role STUDENT
      await OrganizationInvitationModel.create({
        tenantId: tenantBId,
        email: 'immutable.invite@b8.test',
        role: 'STUDENT',
        tokenHash,
        status: 'PENDING',
        invitedBy: userBId,
        expiresAt: new Date(Date.now() + 86400000)
      });

      const result = await OrganizationInvitationService.acceptInvitation(rawToken, {
        name: 'Immutable User',
        password: 'ComplexPassword123!'
      });

      expect(result.tenantId).toBe(tenantBId.toString());
      expect(result.role).toBe('STUDENT');

      const user = await UserModel.collection.findOne({ email: 'immutable.invite@b8.test' });
      expect(user?.tenantId.toString()).toBe(tenantBId.toString());
      expect(user?.isSuperAdmin).toBe(false);

      const member = await OrganizationMemberModel.collection.findOne({ tenantId: tenantBId, userId: user!._id });
      expect(member?.role).toBe('STUDENT');
      expect(member?.tenantId.toString()).toBe(tenantBId.toString());
    });
  });
});
