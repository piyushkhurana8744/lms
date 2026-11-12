import crypto from 'crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  connectDatabase,
  disconnectDatabase,
  OrganizationInvitationModel,
  OrganizationMemberModel,
  RoleModel,
  SessionModel,
  TenantModel,
  UserModel
} from '@edtech/database';
import { tenantContextStorage, verifyRefreshToken } from '@edtech/utils';
import { AuthService } from '../auth.service';
import { OrganizationInvitationService } from '../organizationInvitation.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.8 Batch 6 tenant-bound registration contract', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const otherTenantId = new mongoose.Types.ObjectId();
  const slug = `batch6-registration-${tenantId}`;
  const email = `student-${tenantId}@batch6.test`;

  beforeAll(async () => {
    await connectDatabase(process.env.MONGO_INTEGRATION_URI!);
    await TenantModel.collection.insertMany([
      { _id: tenantId, name: 'Batch 6 Registration', slug, status: 'ACTIVE' },
      { _id: otherTenantId, name: 'Other Tenant', slug: `${slug}-other`, status: 'ACTIVE' }
    ]);
    await RoleModel.collection.insertOne({ tenantId, name: 'Student', slug: 'student', permissions: [], isSystemRole: true });
  });

  afterAll(async () => {
    const users = await UserModel.collection.find({ email: /@batch6\.test$/ }).project({ _id: 1 }).toArray();
    await SessionModel.collection.deleteMany({ userId: { $in: users.map((user) => user._id) } });
    await UserModel.collection.deleteMany({ email: /@batch6\.test$/ });
    await OrganizationMemberModel.collection.deleteMany({ tenantId: { $in: [tenantId, otherTenantId] } });
    await OrganizationInvitationModel.collection.deleteMany({ tenantId: { $in: [tenantId, otherTenantId] } });
    await RoleModel.collection.deleteMany({ tenantId: { $in: [tenantId, otherTenantId] } });
    await TenantModel.collection.deleteMany({ _id: { $in: [tenantId, otherTenantId] } });
    await disconnectDatabase();
  });

  it('rejects tenantless and unknown-tenant public registration', async () => {
    await expect(AuthService.register({ name: 'No Tenant', email: 'tenantless@batch6.test', password: 'Password123!' })).rejects.toThrow('Tenant workspace is required');
    await expect(AuthService.register({ name: 'Unknown', email: 'unknown@batch6.test', password: 'Password123!', tenantSlug: 'does-not-exist' })).rejects.toThrow('Active tenant');
    expect(await UserModel.collection.countDocuments({ email: { $in: ['tenantless@batch6.test', 'unknown@batch6.test'] } })).toBe(0);
  });

  it('creates only a tenant-bound student and can establish a real session', async () => {
    const registered = await AuthService.register({ name: 'Batch Student', email, password: 'Password123!', tenantSlug: slug });
    expect(registered.user.tenantId).toBe(tenantId.toString());
    const stored = await UserModel.collection.findOne({ email });
    expect(String(stored?.tenantId)).toBe(tenantId.toString());
    expect(stored?.roles).toHaveLength(1);

    const login = await AuthService.login({ email, password: 'Password123!', ipAddress: '127.0.0.1', userAgent: 'batch6-proof' });
    expect(login.user.tenantId).toBe(tenantId.toString());
    expect(await SessionModel.collection.countDocuments({ userId: new mongoose.Types.ObjectId(login.user.id), tenantId })).toBe(1);
    const concurrent = await Promise.allSettled([
      AuthService.refreshTokens(login.tokens.refreshToken),
      AuthService.refreshTokens(login.tokens.refreshToken)
    ]);
    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const winner = concurrent.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof AuthService.refreshTokens>>> => result.status === 'fulfilled');
    expect(winner?.value).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });

    const refreshPayload = verifyRefreshToken(winner!.value.refreshToken);
    expect(refreshPayload).toBeTruthy();
    const liveSession = await SessionModel.collection.findOne({ _id: new mongoose.Types.ObjectId(refreshPayload!.sessionId) });
    expect(liveSession?.revokedAt).toBeFalsy();

    await SessionModel.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(refreshPayload!.sessionId) },
      { $set: { expiresAt: new Date(Date.now() - 1_000) } }
    );
    await expect(AuthService.refreshTokens(winner!.value.refreshToken)).rejects.toThrow('revoked or expired');
  });

  it('fails closed for unbound User reads, creates, updates, and cross-tenant predicates', async () => {
    await expect(UserModel.findOne({ email })).rejects.toThrow('Tenant context is required');
    await expect(UserModel.create({ tenantId, name: 'Unbound', email: 'unbound@batch6.test', passwordHash: 'x' })).rejects.toThrow('Tenant context is required');
    await expect(UserModel.updateOne({ email }, { $set: { name: 'Unbound update' } })).rejects.toThrow('Tenant context is required');
    await expect(tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: 'batch6', isPlatformContext: false, allowedTenantIds: [tenantId.toString()] }, async () => await UserModel.findOne({ tenantId: otherTenantId }))).rejects.toThrow('conflicts with workspace context');
  });

  it('securely provisions staff via tenant invitation acceptance under fail-closed UserModel', async () => {
    const rawToken = 'batch6-invitation-token-1234567890abcdef';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const inviteEmail = `invited-${tenantId}@batch6.test`;

    await OrganizationInvitationModel.collection.insertOne({
      tenantId,
      email: inviteEmail,
      role: 'INSTRUCTOR',
      tokenHash,
      invitedBy: new mongoose.Types.ObjectId(),
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000)
    });

    const result = await OrganizationInvitationService.acceptInvitation(rawToken, {
      name: 'Invited Instructor',
      password: 'Password123!'
    });

    expect(result.success).toBe(true);
    expect(result.tenantId).toBe(tenantId.toString());
    expect(result.role).toBe('INSTRUCTOR');

    const createdUser = await UserModel.collection.findOne({ email: inviteEmail });
    expect(createdUser).toBeDefined();
    expect(String(createdUser?.tenantId)).toBe(tenantId.toString());
    expect(createdUser?.status).toBe('ACTIVE');

    const member = await OrganizationMemberModel.collection.findOne({ tenantId, userId: createdUser?._id });
    expect(member).toBeDefined();
    expect(member?.role).toBe('INSTRUCTOR');
    expect(member?.status).toBe('ACTIVE');

    const invitation = await OrganizationInvitationModel.collection.findOne({ tokenHash });
    expect(invitation?.status).toBe('ACCEPTED');
  });
});
