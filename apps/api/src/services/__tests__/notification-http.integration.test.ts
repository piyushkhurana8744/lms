import http from 'http'; import mongoose from 'mongoose'; import { afterAll, beforeAll, describe, expect, it } from 'vitest'; import { NotificationDeliveryModel, NotificationModel, NotificationPreferenceModel, SessionModel, TenantModel, UserModel, connectDatabase, disconnectDatabase } from '@edtech/database'; import { signAccessToken, tenantContextStorage } from '@edtech/utils'; import { createApp } from '../../app'; import { NotificationService } from '../notification.service';
const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;
suite('Phase 14 Notification HTTP Authorization', () => { let server: http.Server, port: number; const tenantA = new mongoose.Types.ObjectId(), tenantB = new mongoose.Types.ObjectId(), userA = new mongoose.Types.ObjectId(), userB = new mongoose.Types.ObjectId(), userC = new mongoose.Types.ObjectId(); const tokens: Record<string, string> = {}; let notificationA = '', notificationB = '', notificationC = '';
  const request = (token: string | null, method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}) => new Promise<{ status: number; json: any }>((resolve, reject) => { const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body)); const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}), ...extraHeaders } }, (res) => { const chunks: Buffer[] = []; res.on('data', (chunk) => chunks.push(chunk)); res.on('end', () => { const raw = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode || 0, json: raw ? JSON.parse(raw) : undefined }); }); }); req.on('error', reject); req.end(payload); });
  beforeAll(async () => { process.env.INTERNAL_WORKER_SECRET = 'wave07-notification-http-secret'; await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'); for (const model of [NotificationDeliveryModel, NotificationModel, NotificationPreferenceModel, SessionModel, UserModel, TenantModel]) await model.collection.deleteMany({}); await TenantModel.collection.insertMany([{ _id: tenantA, name: 'A', slug: 'a' }, { _id: tenantB, name: 'B', slug: 'b' }]); for (const [label, id, tenant] of [['a', userA, tenantA], ['b', userB, tenantA], ['c', userC, tenantB]] as const) { await UserModel.collection.insertOne({ _id: id, tenantId: tenant, allowedTenantIds: [tenant], name: label, email: `${label}@test.local`, passwordHash: 'x', status: 'ACTIVE', emailVerified: true, roles: [] }); const sessionId = new mongoose.Types.ObjectId(); await SessionModel.collection.insertOne({ _id: sessionId, userId: id, tenantId: tenant, activeTenantId: tenant, currentRefreshTokenHash: 'x', tokenVersion: 1, lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 3600000), revokedAt: null }); tokens[label] = signAccessToken({ sub: id.toString(), sessionId: sessionId.toString(), tenantId: tenant.toString(), tokenVersion: 1 }); } const make = async (tenantId: mongoose.Types.ObjectId, recipient: mongoose.Types.ObjectId, sourceId: string) => tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: recipient.toString(), isPlatformContext: false, allowedTenantIds: [tenantId.toString()] }, () => NotificationService.createIntent({ tenantId: tenantId.toString(), recipientUserId: recipient.toString(), type: 'certificate.issued', sourceType: 'Certificate', sourceId, data: { courseTitle: 'Course' } })); notificationA = (await make(tenantA, userA, 'a'))!._id.toString(); notificationB = (await make(tenantA, userB, 'b'))!._id.toString(); notificationC = (await make(tenantB, userC, 'c'))!._id.toString(); server = createApp().listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve)); port = (server.address() as any).port; });
  afterAll(async () => { if (server) await new Promise<void>((resolve) => server.close(() => resolve())); await disconnectDatabase(); });
  it('rejects untrusted internal delivery callers and mismatched tenant bindings', async () => { const delivery = await NotificationDeliveryModel.findOne({ notificationId: notificationA }).lean(); expect(delivery).not.toBeNull(); const path = `/api/v1/internal/notifications/deliveries/${delivery!._id}/process`; expect((await request(null, 'POST', path)).status).toBe(401); expect((await request(null, 'POST', path, undefined, { 'x-internal-worker-secret': 'incorrect-secret' })).status).toBe(401); expect((await request(null, 'POST', path, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET! })).status).toBe(400); expect((await request(null, 'POST', path, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': 'invalid' })).status).toBe(400); const mismatch = await request(null, 'POST', path, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': tenantB.toString() }); expect(mismatch.status).toBe(500); expect(mismatch.json.error).not.toContain('a@test.local'); expect((await NotificationDeliveryModel.findById(delivery!._id))?.attemptCount).toBe(0); });
  it('allows own list/count/read/unread/mark-all and returns private DTO only', async () => { const list = await request(tokens.a, 'GET', '/api/v1/notifications'); expect(list.status).toBe(200); expect(list.json.data.data[0]).not.toHaveProperty('tenantId'); expect(list.json.data.data[0]).not.toHaveProperty('recipientUserId'); expect(list.json.data.data[0]).not.toHaveProperty('deduplicationKey'); expect((await request(tokens.a, 'GET', '/api/v1/notifications/unread-count')).status).toBe(200); expect((await request(tokens.a, 'POST', `/api/v1/notifications/${notificationA}/read`)).status).toBe(200); expect((await request(tokens.a, 'POST', `/api/v1/notifications/${notificationA}/unread`)).status).toBe(200); expect((await request(tokens.a, 'POST', '/api/v1/notifications/mark-all-read')).status).toBe(200); });
  it('validates preferences and scopes them to authenticated user', async () => { const valid = await request(tokens.a, 'PUT', '/api/v1/notifications/preferences', { preferences: [{ category: 'ACADEMIC', inAppEnabled: true, emailEnabled: false }] }); expect(valid.status).toBe(200); expect((await request(tokens.a, 'PUT', '/api/v1/notifications/preferences', { preferences: [{ category: 'UNKNOWN', inAppEnabled: true, emailEnabled: false }] })).status).toBe(400); expect((await request(tokens.a, 'PUT', '/api/v1/notifications/preferences', { preferences: [{ category: 'ACADEMIC', inAppEnabled: 'yes', emailEnabled: false }], userId: userB.toString() })).status).toBe(400); expect((await NotificationPreferenceModel.findOne({ userId: userB }))).toBeNull(); });
  it('denies same-tenant and cross-tenant notification substitution with zero mutation', async () => { expect((await request(tokens.a, 'POST', `/api/v1/notifications/${notificationB}/read`)).status).toBe(404); expect((await request(tokens.a, 'POST', `/api/v1/notifications/${notificationC}/read`)).status).toBe(404); expect((await NotificationModel.findById(notificationB))?.readAt).toBeNull(); expect((await NotificationModel.findById(notificationC))?.readAt).toBeNull(); });
  it('denies unauthenticated personal notification access', async () => { expect((await request(null, 'GET', '/api/v1/notifications')).status).toBe(401); expect((await request(null, 'GET', '/api/v1/notifications/preferences')).status).toBe(401); });
  it('rejects unauthenticated callers, invalid secrets, and cross-tenant bindings on internal notification routes', async () => {
    const { OutboxEventModel, NotificationIntentModel } = await import('@edtech/database');
    const eventId = `http-finance-${Date.now()}`;
    const intentId = `http-intent-${Date.now()}`;
    await tenantContextStorage.run(
      { currentTenantId: tenantA.toString(), currentUserId: userA.toString(), isPlatformContext: false, allowedTenantIds: [tenantA.toString()] },
      async () => {
        await OutboxEventModel.create({
          tenantId: tenantA,
          eventId,
          eventType: 'payment.success',
          aggregateType: 'Payment',
          aggregateId: new mongoose.Types.ObjectId(),
          payload: { studentUserId: userA.toString(), paymentNumber: 'PAY-HTTP-1', amountMinor: 5000 },
          status: 'PENDING',
          availableAt: new Date()
        });
        await NotificationIntentModel.create({
          tenantId: tenantA,
          eventId: intentId,
          type: 'certificate.issued',
          recipientUserId: userA,
          sourceType: 'Certificate',
          sourceId: 'cert-1',
          occurrenceKey: 'default',
          data: { courseTitle: 'Web Security' },
          status: 'PENDING',
          availableAt: new Date(),
          attemptCount: 0
        });
      }
    );

    const financePath = `/api/v1/internal/notifications/finance-events/${eventId}/consume`;
    const intentPath = `/api/v1/internal/notifications/intents/${intentId}/consume`;

    expect((await request(null, 'POST', financePath)).status).toBe(401);
    expect((await request(null, 'POST', intentPath)).status).toBe(401);
    expect((await request(null, 'POST', financePath, undefined, { 'x-internal-worker-secret': 'bad-secret' })).status).toBe(401);
    expect((await request(null, 'POST', intentPath, undefined, { 'x-internal-worker-secret': 'bad-secret' })).status).toBe(401);
    expect((await request(null, 'POST', financePath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET! })).status).toBe(400);
    expect((await request(null, 'POST', intentPath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET! })).status).toBe(400);
    expect((await request(null, 'POST', financePath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': 'invalid-hex' })).status).toBe(400);
    expect((await request(null, 'POST', intentPath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': 'invalid-hex' })).status).toBe(400);

    const financeMismatch = await request(null, 'POST', financePath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': tenantB.toString() });
    expect(financeMismatch.status).toBe(500);

    const intentMismatch = await request(null, 'POST', intentPath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': tenantB.toString() });
    expect(intentMismatch.status).toBe(500);

    const financeSuccess = await request(null, 'POST', financePath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': tenantA.toString() });
    expect(financeSuccess.status).toBe(200);

    const intentSuccess = await request(null, 'POST', intentPath, undefined, { 'x-internal-worker-secret': process.env.INTERNAL_WORKER_SECRET!, 'x-tenant-id': tenantA.toString() });
    expect(intentSuccess.status).toBe(200);
  });
});
