import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authorizePlatformSession, connectDatabase, CourseModel, disconnectDatabase, NotificationIntentModel, OrganizationDomainModel, runAuthBootstrapOperation, runAuthorizedPlatformOperation, SessionModel, UserModel } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.8 runtime tenant isolation hardening', () => {
  const tenantA = new mongoose.Types.ObjectId();
  const tenantB = new mongoose.Types.ObjectId();
  const courseA = new mongoose.Types.ObjectId();
  const courseB = new mongoose.Types.ObjectId();
  const inTenant = <T>(operation: () => Promise<T>) => tenantContextStorage.run({ currentTenantId: tenantA.toString(), currentUserId: 'wave08-test', isPlatformContext: false, allowedTenantIds: [tenantA.toString()] }, async () => await operation());

  beforeAll(async () => {
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0');
    await CourseModel.collection.insertMany([
      { _id: courseA, tenantId: tenantA, title: 'Tenant A course', slug: `wave08-a-${Date.now()}`, status: 'DRAFT' },
      { _id: courseB, tenantId: tenantB, title: 'Tenant B course', slug: `wave08-b-${Date.now()}`, status: 'DRAFT' }
    ]);
  });

  afterAll(async () => {
    await CourseModel.collection.deleteMany({ _id: { $in: [courseA, courseB] } });
    await disconnectDatabase();
  });

  it('rejects both legacy runtime bypass spellings', async () => {
    await expect(CourseModel.find({}).setOptions({ bypassTenantFilter: true } as any)).rejects.toThrow('Legacy tenant isolation option');
    await expect(CourseModel.find({}).setOptions({ __bypassTenantIsolation: true } as any)).rejects.toThrow('Legacy tenant isolation option');
  });

  it('fails closed without context and with malformed context', async () => {
    await expect(CourseModel.findOne({ _id: courseA })).rejects.toThrow('Tenant context is required');
    await expect(CourseModel.updateOne({ _id: courseA }, { $set: { title: 'no-context' } })).rejects.toThrow('Tenant context is required');
    await expect(CourseModel.deleteOne({ _id: courseA })).rejects.toThrow('Tenant context is required');
    await expect(CourseModel.aggregate([{ $match: { _id: courseA } }])).rejects.toThrow('Tenant context is required');
    await expect(CourseModel.create({ title: 'No context', slug: `no-context-${Date.now()}`, status: 'DRAFT' })).rejects.toThrow('Tenant context is required');
    await expect(tenantContextStorage.run({ currentTenantId: 'invalid', currentUserId: 'x', isPlatformContext: false, allowedTenantIds: [] }, async () => await CourseModel.findOne({ _id: courseA }))).rejects.toThrow('Tenant context is malformed');
    expect((await CourseModel.collection.findOne({ _id: courseA }))?.title).toBe('Tenant A course');
  });

  it('rejects conflicting nested tenant predicates', async () => {
    await expect(inTenant(() => CourseModel.find({ $or: [{ tenantId: tenantB }, { title: 'x' }] }))).rejects.toThrow('conflicts with workspace context');
  });

  it('rejects cross-tenant updates, deletes and tenant identity mutation', async () => {
    await expect(inTenant(() => CourseModel.updateOne({ _id: courseB, tenantId: tenantB }, { $set: { title: 'attacker' } }))).rejects.toThrow('conflicts with workspace context');
    await expect(inTenant(() => CourseModel.deleteOne({ _id: courseB, tenantId: tenantB }))).rejects.toThrow('conflicts with workspace context');
    await expect(inTenant(() => CourseModel.updateOne({ _id: courseA }, { $set: { tenantId: tenantB } } as any))).rejects.toThrow('Tenant identity is immutable');
  });

  it('rejects unsafe cross-collection aggregate stages and isolates ordinary aggregates', async () => {
    await expect(inTenant(() => CourseModel.aggregate([{ $lookup: { from: 'users', localField: 'tenantId', foreignField: 'tenantId', as: 'users' } }]))).rejects.toThrow('Unsafe cross-collection aggregation stage');
    const rows = await inTenant(() => CourseModel.aggregate([{ $project: { title: 1, tenantId: 1 } }]));
    expect(rows.map((row) => String(row.tenantId))).toEqual([tenantA.toString()]);
  });

  it('preserves valid tenant reads and writes', async () => {
    expect(await inTenant(() => CourseModel.countDocuments({}))).toBe(1);
    await inTenant(() => CourseModel.updateOne({ _id: courseA }, { $set: { title: 'Tenant A updated' } }));
    expect((await CourseModel.collection.findOne({ _id: courseA }))?.title).toBe('Tenant A updated');
  });

  it('fails closed for notification intent insertion and rejects mixed tenants', async () => {
    const intent = (tenantId: mongoose.Types.ObjectId, eventId: string) => ({ tenantId, eventId, type: 'announcement.published' as const, recipientUserId: new mongoose.Types.ObjectId(), sourceType: 'CommunicationAnnouncement', sourceId: 'source', occurrenceKey: eventId, data: { title: 'x' }, status: 'PENDING' as const, availableAt: new Date(), attemptCount: 0 });
    await expect(NotificationIntentModel.insertMany([intent(tenantA, 'wave08-no-context')])).rejects.toThrow('Tenant context is required');
    await expect(inTenant(() => NotificationIntentModel.insertMany([intent(tenantA, 'wave08-a'), intent(tenantB, 'wave08-b')]))).rejects.toThrow('conflicts with workspace context');
    expect(await NotificationIntentModel.collection.countDocuments({ eventId: { $in: ['wave08-no-context', 'wave08-a', 'wave08-b'] } })).toBe(0);
    await inTenant(() => NotificationIntentModel.insertMany([intent(tenantA, 'wave08-valid')]));
    expect(await NotificationIntentModel.collection.countDocuments({ eventId: 'wave08-valid', tenantId: tenantA })).toBe(1);
    await NotificationIntentModel.collection.deleteMany({ eventId: /^wave08-/ });
  });

  it('permits only exact domain bootstrap reads', async () => {
    await OrganizationDomainModel.collection.insertOne({ tenantId: tenantA, platformSubdomain: 'wave08.platform.com', customDomain: 'learn.wave08.test', status: 'ACTIVE', verificationToken: 'x', verificationMethod: 'CNAME', isPrimary: true });
    await expect(OrganizationDomainModel.findOne({ platformSubdomain: 'wave08.platform.com' })).rejects.toThrow('Tenant context is required');
    const resolved = await OrganizationDomainModel.findOne({ customDomain: 'learn.wave08.test', status: { $in: ['VERIFIED', 'ACTIVE'] } }).setOptions({ publicReadPolicy: 'DOMAIN_RESOLUTION' }).select('tenantId').lean();
    expect(String(resolved?.tenantId)).toBe(tenantA.toString());
    await expect(OrganizationDomainModel.findOne({ status: 'ACTIVE' }).setOptions({ publicReadPolicy: 'DOMAIN_RESOLUTION' })).rejects.toThrow('exact normalized hostname');
    await OrganizationDomainModel.collection.deleteMany({ tenantId: tenantA });
  });
});

suite('Wave 0.8 verified platform authority', () => {
  const adminId = new mongoose.Types.ObjectId();
  const tenantAdminId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const revokedSessionId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0');
    await UserModel.collection.insertMany([
      { _id: adminId, tenantId: null, name: 'Platform Admin', email: `platform-${adminId}@test.local`, passwordHash: 'x', status: 'ACTIVE', isSuperAdmin: true },
      { _id: tenantAdminId, tenantId: new mongoose.Types.ObjectId(), name: 'Tenant Admin', email: `tenant-${tenantAdminId}@test.local`, passwordHash: 'x', status: 'ACTIVE', isSuperAdmin: false }
    ]);
    await SessionModel.collection.insertMany([
      { _id: sessionId, userId: adminId, currentRefreshTokenHash: 'x', tokenVersion: 1, expiresAt: new Date(Date.now() + 60_000), revokedAt: null },
      { _id: revokedSessionId, userId: adminId, currentRefreshTokenHash: 'x', tokenVersion: 1, expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() }
    ]);
  });

  afterAll(async () => {
    await SessionModel.collection.deleteMany({ _id: { $in: [sessionId, revokedSessionId] } });
    await UserModel.collection.deleteMany({ _id: { $in: [adminId, tenantAdminId] } });
    await disconnectDatabase();
  });

  it('rejects forged authority and revoked, mismatched, or non-platform sessions', async () => {
    await expect(runAuthorizedPlatformOperation({ actorId: adminId.toString() } as any, { reason: 'x', correlationId: 'x' }, async () => true)).rejects.toThrow('Trusted platform authority');
    await expect(authorizePlatformSession({ actorId: adminId.toString(), sessionId: revokedSessionId.toString(), reason: 'test', correlationId: 'revoked' })).rejects.toThrow('expired or revoked');
    await expect(authorizePlatformSession({ actorId: tenantAdminId.toString(), sessionId: sessionId.toString(), reason: 'test', correlationId: 'mismatch' })).rejects.toThrow('do not match');
    const tenantSession = new mongoose.Types.ObjectId();
    await SessionModel.collection.insertOne({ _id: tenantSession, userId: tenantAdminId, currentRefreshTokenHash: 'x', tokenVersion: 1, expiresAt: new Date(Date.now() + 60_000), revokedAt: null });
    await expect(authorizePlatformSession({ actorId: tenantAdminId.toString(), sessionId: tenantSession.toString(), reason: 'test', correlationId: 'tenant-admin' })).rejects.toThrow('SuperAdmin');
    await SessionModel.collection.deleteOne({ _id: tenantSession });
  });

  it('binds a valid capability to session, reason and correlation', async () => {
    const authority = await authorizePlatformSession({ actorId: adminId.toString(), sessionId: sessionId.toString(), reason: 'support', correlationId: 'corr-1' });
    await expect(runAuthorizedPlatformOperation(authority, { reason: 'wrong', correlationId: 'corr-1' }, async () => true)).rejects.toThrow('binding mismatch');
    await expect(runAuthorizedPlatformOperation(authority, { reason: 'support', correlationId: 'corr-1' }, async () => true)).resolves.toBe(true);
  });

  it('binds authentication bootstrap to exact normalized identity and purpose', async () => {
    await expect(UserModel.find({ email: 'platform@example.test' }).setOptions({ authBootstrapPolicy: 'LOGIN_USER_BY_EMAIL' })).rejects.toThrow('bootstrap context');
    const email = `platform-${adminId}@test.local`.toLowerCase();
    const rows = await runAuthBootstrapOperation('LOGIN_USER_BY_EMAIL', email, () => UserModel.find({ email }).setOptions({ authBootstrapPolicy: 'LOGIN_USER_BY_EMAIL' }).limit(2));
    expect(rows).toHaveLength(1);
    await expect(runAuthBootstrapOperation('LOGIN_USER_BY_EMAIL', email, () => UserModel.find({ email: `tenant-${tenantAdminId}@test.local` }).setOptions({ authBootstrapPolicy: 'LOGIN_USER_BY_EMAIL' }))).rejects.toThrow('does not match bound identity');
  });
});
