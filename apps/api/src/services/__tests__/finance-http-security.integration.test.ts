import fs from 'fs';
import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  connectDatabase, disconnectDatabase, CourseModel, FinancialLedgerModel, OrganizationMemberModel,
  OutboxEventModel, PaymentModel, ReceiptModel, RefundModel, SessionModel, StudentFeePlanModel,
  TenantModel, UserModel, PaymentGatewayConfigModel, setTransactionCapabilityOverride
} from '@edtech/database';
import { signAccessToken, tenantContextStorage } from '@edtech/utils';
import { createApp } from '../../app';
import { ReceiptArtifactService } from '../receiptArtifact.service';
import { connectRedis, disconnectRedis, getRedisClient, setRedisStateOverride } from '../../config/redis';
import { setFinanceFailurePoint } from '../financeFailureInjection';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('finance HTTP security and receipt delivery', () => {
  let server: http.Server; let port: number;
  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const request = (token: string, method: string, path: string, body?: any) => new Promise<{ status: number; headers: http.IncomingHttpHeaders; raw: Buffer; json?: any }>((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { authorization: `Bearer ${token}`, ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}) } }, (res) => {
      const chunks: Buffer[] = []; res.on('data', (chunk) => chunks.push(chunk)); res.on('end', () => {
        const raw = Buffer.concat(chunks); let json: any; try { json = JSON.parse(raw.toString()); } catch { /* binary */ }
        resolve({ status: res.statusCode || 0, headers: res.headers, raw, json });
      });
    }); req.on('error', reject); req.end(payload);
  });

  async function actor(label: string, tenantId: mongoose.Types.ObjectId, role: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT') {
    const userId = new mongoose.Types.ObjectId(); const sessionId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({ _id: userId, tenantId, allowedTenantIds: [tenantId], name: label, email: `${label.toLowerCase()}@test.local`, passwordHash: 'test', status: 'ACTIVE', emailVerified: true, isSuperAdmin: false, roles: [], createdAt: new Date(), updatedAt: new Date() });
    await OrganizationMemberModel.collection.insertOne({ _id: new mongoose.Types.ObjectId(), tenantId, userId, role, status: 'ACTIVE', joinedAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
    await SessionModel.collection.insertOne({ _id: sessionId, userId, tenantId, activeTenantId: tenantId, currentRefreshTokenHash: 'test', tokenVersion: 1, lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 3600_000), revokedAt: null, createdAt: new Date(), updatedAt: new Date() });
    ids[label] = userId; tokens[label] = signAccessToken({ sub: userId.toString(), sessionId: sessionId.toString(), tenantId: tenantId.toString(), tokenVersion: 1 });
  }

  async function financeFixture(label: string, tenantId: mongoose.Types.ObjectId, studentId: mongoose.Types.ObjectId) {
    const courseId = new mongoose.Types.ObjectId(), planId = new mongoose.Types.ObjectId(), paymentId = new mongoose.Types.ObjectId(), receiptId = new mongoose.Types.ObjectId(), refundId = new mongoose.Types.ObjectId(), installmentId = new mongoose.Types.ObjectId();
    await CourseModel.collection.insertOne({ _id: courseId, tenantId, title: `Course ${label}`, slug: `course-${label.toLowerCase()}`, createdAt: new Date(), updatedAt: new Date() });
    await StudentFeePlanModel.collection.insertOne({ _id: planId, tenantId, studentUserId: studentId, courseId, currency: 'INR', baseAmountMinor: 10000, discountAmountMinor: 0, netPayableMinor: 10000, paidAmountMinor: 10000, outstandingBalanceMinor: 0, installments: [{ _id: installmentId, sequence: 1, label: 'Fee', dueDate: new Date(), amountMinor: 10000, paidAmountMinor: 10000, status: 'PAID' }], status: 'PAID', createdBy: studentId, updatedBy: studentId, createdAt: new Date(), updatedAt: new Date() });
    await PaymentModel.collection.insertOne({ _id: paymentId, tenantId, paymentNumber: `PAY-${label}`, studentUserId: studentId, studentFeePlanId: planId, amountMinor: 10000, currency: 'INR', method: 'ONLINE_GATEWAY', status: 'SUCCESS', gatewayProvider: 'RAZORPAY', gatewayOrderId: `order-${label}`, gatewayPaymentId: `pay-${label}`, receivedAt: new Date(), allocations: [{ studentFeePlanId: planId, installmentId, amountMinor: 10000 }], refundedAmountMinor: 0, reservedRefundAmountMinor: 0, createdBy: studentId, updatedBy: studentId, receiptId, createdAt: new Date(), updatedAt: new Date() });
    await ReceiptModel.collection.insertOne({ _id: receiptId, tenantId, receiptNumber: `RCPT-${label}`, paymentId, studentUserId: studentId, studentFeePlanId: planId, amountMinor: 10000, currency: 'INR', paymentMethod: 'ONLINE_GATEWAY', issuedAt: new Date(), studentSnapshot: { fullName: label, email: `${label}@test.local`, phone: '' }, courseSnapshot: { courseId: courseId.toString(), title: `Course ${label}` }, organizationSnapshot: { organizationName: `Tenant ${label}` }, status: 'ISSUED', artifact: { status: 'PENDING' }, issuedBy: studentId, createdAt: new Date(), updatedAt: new Date() });
    await RefundModel.collection.insertOne({ _id: refundId, tenantId, refundNumber: `RFND-${label}`, paymentId, studentUserId: studentId, studentFeePlanId: planId, amountMinor: 1000, currency: 'INR', reason: 'test', status: 'PROCESSING', gatewayProvider: 'RAZORPAY', gatewayRefundId: `refund-${label}`, requestedBy: studentId, createdAt: new Date(), updatedAt: new Date() });
    return { courseId, planId, paymentId, receiptId, refundId };
  }

  async function openPlan(label: string, tenantId = ids.tenantA, studentId = ids.StudentA1) {
    const courseId = new mongoose.Types.ObjectId(), planId = new mongoose.Types.ObjectId(), installmentId = new mongoose.Types.ObjectId();
    await CourseModel.collection.insertOne({ _id: courseId, tenantId, title: `Open ${label}`, slug: `open-${label.toLowerCase()}-${planId}`, createdAt: new Date(), updatedAt: new Date() });
    await StudentFeePlanModel.collection.insertOne({ _id: planId, tenantId, studentUserId: studentId, courseId, currency: 'INR', baseAmountMinor: 10000, discountAmountMinor: 0, netPayableMinor: 10000, paidAmountMinor: 0, outstandingBalanceMinor: 10000, installments: [{ _id: installmentId, sequence: 1, label: 'Fee', dueDate: new Date(Date.now() + 86400000), amountMinor: 10000, paidAmountMinor: 0, status: 'UPCOMING' }], status: 'ACTIVE', createdBy: ids.AdminA, updatedBy: ids.AdminA, createdAt: new Date(), updatedAt: new Date() });
    return { planId, installmentId };
  }

  beforeAll(async () => {
    process.env.ALLOW_LOCAL_STORAGE_FALLBACK = 'true'; process.env.ALLOW_LOCAL_STORAGE = 'true';
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://localhost:27017/edtech_lms_test?replicaSet=rs0');
    for (const model of [FinancialLedgerModel, OutboxEventModel, RefundModel, ReceiptModel, PaymentModel, StudentFeePlanModel, CourseModel, OrganizationMemberModel, SessionModel, UserModel, PaymentGatewayConfigModel, TenantModel]) await model.collection.deleteMany({});
    ids.tenantA = new mongoose.Types.ObjectId(); ids.tenantB = new mongoose.Types.ObjectId();
    await TenantModel.collection.insertMany([{ _id: ids.tenantA, name: 'Tenant A', slug: 'http-tenant-a' }, { _id: ids.tenantB, name: 'Tenant B', slug: 'http-tenant-b' }]);
    await actor('AdminA', ids.tenantA, 'TENANT_ADMIN'); await actor('StaffA', ids.tenantA, 'INSTRUCTOR'); await actor('StudentA1', ids.tenantA, 'STUDENT'); await actor('StudentA2', ids.tenantA, 'STUDENT'); await actor('AdminB', ids.tenantB, 'TENANT_ADMIN'); await actor('StudentB1', ids.tenantB, 'STUDENT');
    Object.assign(ids, Object.fromEntries(Object.entries(await financeFixture('A1', ids.tenantA, ids.StudentA1)).map(([k, v]) => [`a1${k}`, v])));
    Object.assign(ids, Object.fromEntries(Object.entries(await financeFixture('A2', ids.tenantA, ids.StudentA2)).map(([k, v]) => [`a2${k}`, v])));
    Object.assign(ids, Object.fromEntries(Object.entries(await financeFixture('B1', ids.tenantB, ids.StudentB1)).map(([k, v]) => [`b1${k}`, v])));
    await tenantContextStorage.run({ currentTenantId: ids.tenantA.toString(), currentUserId: ids.AdminA.toString(), isPlatformContext: false, allowedTenantIds: [ids.tenantA.toString()] }, () => ReceiptArtifactService.generate(ids.a1receiptId.toString()));
    await connectRedis();
    server = createApp().listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve)); port = (server.address() as any).port;
  });
  afterAll(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); await disconnectRedis(); await disconnectDatabase(); });

  it('denies Admin A cross-tenant reads and mutations without changing Tenant B', async () => {
    const before = await PaymentModel.collection.findOne({ _id: ids.b1paymentId });
    const cases = [
      request(tokens.AdminA, 'GET', `/api/v1/finance/student-fees/${ids.b1planId}`),
      request(tokens.AdminA, 'GET', `/api/v1/finance/receipts/${ids.b1receiptId}`),
      request(tokens.AdminA, 'GET', `/api/v1/finance/receipts/${ids.b1receiptId}/download`),
      request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: ids.b1planId.toString(), amountMinor: 1000, method: 'CASH' }),
      request(tokens.AdminA, 'POST', `/api/v1/finance/payments/${ids.b1paymentId}/reconcile`),
      request(tokens.AdminA, 'POST', `/api/v1/finance/refunds/${ids.b1refundId}/reconcile`),
      request(tokens.AdminA, 'POST', `/api/v1/finance/payments/${ids.b1paymentId}/reverse`, { reason: 'cross tenant attack' })
    ];
    const results = await Promise.all(cases); expect(results.every((r) => [400, 404, 409].includes(r.status))).toBe(true);
    expect(await PaymentModel.collection.findOne({ _id: ids.b1paymentId })).toEqual(before);
  });

  it('enforces same-tenant student ownership on plan, receipt, and artifact HTTP routes', async () => {
    expect((await request(tokens.StudentA1, 'GET', '/api/v1/student/fees')).status).toBe(200);
    expect((await request(tokens.StudentA1, 'GET', `/api/v1/finance/student-fees/${ids.a1planId}`)).status).toBe(200);
    expect((await request(tokens.StudentA1, 'GET', `/api/v1/finance/student-fees/${ids.a2planId}`)).status).toBe(404);
    expect((await request(tokens.StudentA1, 'GET', `/api/v1/student/receipts/${ids.a1receiptId}`)).status).toBe(200);
    expect((await request(tokens.StudentA1, 'GET', `/api/v1/student/receipts/${ids.a2receiptId}`)).status).toBe(404);
    const own = await request(tokens.StudentA1, 'GET', `/api/v1/student/receipts/${ids.a1receiptId}/download`);
    expect(own.status).toBe(200); expect(own.headers['content-type']).toContain('application/pdf'); expect(own.raw.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await request(tokens.StudentA2, 'GET', `/api/v1/student/receipts/${ids.a1receiptId}/download`)).status).toBe(404);
    expect((await request(tokens.StudentB1, 'GET', `/api/v1/student/receipts/${ids.a1receiptId}/download`)).status).toBe(404);
  });

  it('enforces staff RBAC and permits authorized same-tenant admin receipt delivery', async () => {
    for (const [method, path, body] of [
      ['GET', '/api/v1/finance/payments'], ['GET', `/api/v1/finance/receipts/${ids.a1receiptId}/download`],
      ['POST', '/api/v1/finance/payments/manual', { studentFeePlanId: ids.a1planId.toString(), amountMinor: 1, method: 'CASH' }],
      ['POST', `/api/v1/finance/payments/${ids.a1paymentId}/reconcile`], ['POST', `/api/v1/finance/payments/${ids.a1paymentId}/reverse`, { reason: 'forbidden' }],
      ['GET', '/api/v1/finance/operations'], ['GET', '/api/v1/finance/readiness']
    ] as any[]) expect((await request(tokens.StaffA, method, path, body)).status).toBe(403);
    const admin = await request(tokens.AdminA, 'GET', `/api/v1/finance/receipts/${ids.a1receiptId}/download`);
    expect(admin.status).toBe(200); expect(admin.raw.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await request(tokens.AdminB, 'GET', `/api/v1/finance/receipts/${ids.a1receiptId}/download`)).status).toBe(404);
    const receipt: any = await ReceiptModel.collection.findOne({ _id: ids.a1receiptId }); expect(receipt.artifact.status).toBe('READY'); expect(fs.existsSync(`${process.cwd()}/uploads/tenants/${receipt.artifact.storageKey}`)).toBe(true);
  });

  it('executes healthy, heartbeat, gateway, webhook, and encryption readiness guards over HTTP', async () => {
    await PaymentGatewayConfigModel.collection.insertOne({ tenantId: ids.tenantA, provider: 'RAZORPAY', isEnabled: true, isLiveMode: false, razorpay: { keyId: 'rzp_test', keySecretEncrypted: 'encrypted', webhookSecretEncrypted: 'encrypted' }, updatedBy: ids.AdminA, createdAt: new Date(), updatedAt: new Date() });
    const redis = getRedisClient();
    const setFresh = async () => { await redis.set('finance:worker:heartbeat', String(Date.now())); await redis.set('finance:reconciliation:heartbeat', String(Date.now())); };
    const readiness = async () => (await request(tokens.AdminA, 'GET', '/api/v1/finance/readiness')).json.data;
    const guardedOrder = async () => request(tokens.StudentA1, 'POST', '/api/v1/finance/payments/order', { studentFeePlanId: ids.a1planId.toString(), amountMinor: 1000 });
    await setFresh(); expect((await readiness()).ready).toBe(true);
    await redis.del('finance:worker:heartbeat'); expect((await readiness()).checks.workerHeartbeat).toBe(false); expect((await guardedOrder()).status).toBe(409);
    await redis.set('finance:worker:heartbeat', String(Date.now() - 46_000)); expect((await readiness()).checks.workerHeartbeat).toBe(false);
    await setFresh(); await redis.del('finance:reconciliation:heartbeat'); expect((await readiness()).checks.reconciliationHeartbeat).toBe(false); expect((await guardedOrder()).status).toBe(409);
    await redis.set('finance:reconciliation:heartbeat', String(Date.now() - 91_000)); expect((await readiness()).checks.reconciliationHeartbeat).toBe(false); expect((await guardedOrder()).status).toBe(409);
    await setFresh(); await PaymentGatewayConfigModel.collection.updateOne({ tenantId: ids.tenantA }, { $set: { 'razorpay.keySecretEncrypted': '' } }); expect((await readiness()).checks.credentials).toBe(false); expect((await guardedOrder()).status).toBe(409);
    await PaymentGatewayConfigModel.collection.updateOne({ tenantId: ids.tenantA }, { $set: { 'razorpay.keySecretEncrypted': 'encrypted', 'razorpay.webhookSecretEncrypted': '' } }); expect((await readiness()).checks.webhookSecret).toBe(false); expect((await guardedOrder()).status).toBe(409);
    await PaymentGatewayConfigModel.collection.updateOne({ tenantId: ids.tenantA }, { $set: { 'razorpay.webhookSecretEncrypted': 'encrypted', isEnabled: false } }); expect((await readiness()).checks.gatewayEnabled).toBe(false); expect((await guardedOrder()).status).toBe(409);
    const oldNodeEnv = process.env.NODE_ENV; const oldKey = process.env.STORAGE_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production'; delete process.env.STORAGE_ENCRYPTION_KEY;
    await PaymentGatewayConfigModel.collection.updateOne({ tenantId: ids.tenantA }, { $set: { isEnabled: true } }); expect((await readiness()).checks.encryptionKey).toBe(false); expect((await guardedOrder()).status).toBe(409);
    process.env.NODE_ENV = oldNodeEnv; if (oldKey === undefined) delete process.env.STORAGE_ENCRYPTION_KEY; else process.env.STORAGE_ENCRYPTION_KEY = oldKey;
  });

  it('fails closed through actual readiness, online order, and manual mutation paths when transactions are unavailable', async () => {
    const { planId } = await openPlan('mongo-guard'); const before = await StudentFeePlanModel.collection.findOne({ _id: planId });
    setTransactionCapabilityOverride(false);
    try {
      const ready = await request(tokens.AdminA, 'GET', '/api/v1/finance/readiness'); expect(ready.json.data.checks.transactions).toBe(false);
      expect((await request(tokens.StudentA1, 'POST', '/api/v1/finance/payments/order', { studentFeePlanId: planId.toString(), amountMinor: 1000 })).status).toBe(409);
      expect((await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: planId.toString(), amountMinor: 1000, method: 'CASH', idempotencyKey: 'mongo-guard-1' })).status).toBeGreaterThanOrEqual(400);
      expect(await PaymentModel.collection.countDocuments({ studentFeePlanId: planId })).toBe(0);
      expect(await ReceiptModel.collection.countDocuments({ studentFeePlanId: planId })).toBe(0);
      expect(await FinancialLedgerModel.collection.countDocuments({ studentFeePlanId: planId })).toBe(0);
      expect(await StudentFeePlanModel.collection.findOne({ _id: planId })).toEqual(before);
    } finally { setTransactionCapabilityOverride(undefined); }
    const recovered = await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: planId.toString(), amountMinor: 1000, method: 'CASH', idempotencyKey: 'mongo-recovered-1' });
    expect(recovered.status).toBe(201);
  });

  it('reports actual Redis unavailability, blocks online order, then recovers without coupling manual payments', async () => {
    const redis = getRedisClient(); await redis.set('finance:worker:heartbeat', String(Date.now())); await redis.set('finance:reconciliation:heartbeat', String(Date.now()));
    const { planId } = await openPlan('redis-guard');
    setRedisStateOverride('disconnected');
    try {
      const ready = await request(tokens.AdminA, 'GET', '/api/v1/finance/readiness'); expect(ready.json.data.checks.redis).toBe(false); expect(ready.json.data.ready).toBe(false);
      expect((await request(tokens.StudentA1, 'POST', '/api/v1/finance/payments/order', { studentFeePlanId: planId.toString(), amountMinor: 1000 })).status).toBe(409);
      expect((await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: planId.toString(), amountMinor: 1000, method: 'UPI', idempotencyKey: 'redis-manual-1' })).status).toBe(201);
    } finally { setRedisStateOverride(undefined); }
    expect((await request(tokens.AdminA, 'GET', '/api/v1/finance/readiness')).json.data.checks.redis).toBe(true);
  });

  it('executes the complete manual reversal HTTP authorization and accounting lifecycle', async () => {
    const { planId } = await openPlan('reversal');
    const collected = await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: planId.toString(), amountMinor: 4000, method: 'CASH', idempotencyKey: 'reversal-payment-1' });
    expect(collected.status).toBe(201); const paymentId = collected.json.data.payment._id;
    expect((await request(tokens.StudentA1, 'POST', `/api/v1/finance/payments/${paymentId}/reverse`, { reason: 'student attempt' })).status).toBe(403);
    expect((await request(tokens.StaffA, 'POST', `/api/v1/finance/payments/${paymentId}/reverse`, { reason: 'staff attempt' })).status).toBe(403);
    expect((await request(tokens.AdminB, 'POST', `/api/v1/finance/payments/${paymentId}/reverse`, { reason: 'cross tenant' })).status).toBe(404);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/finance/payments/${ids.a1paymentId}/reverse`, { reason: 'online attempt' })).status).toBe(400);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/finance/payments/${paymentId}/reverse`, { reason: 'approved correction' })).status).toBe(200);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/finance/payments/${paymentId}/reverse`, { reason: 'duplicate' })).status).toBe(200);
    const payment: any = await PaymentModel.collection.findOne({ _id: new mongoose.Types.ObjectId(paymentId) }); const plan: any = await StudentFeePlanModel.collection.findOne({ _id: planId });
    expect(payment.status).toBe('REVERSED'); expect(plan.paidAmountMinor).toBe(0); expect(plan.outstandingBalanceMinor).toBe(10000); expect(plan.installments[0].paidAmountMinor).toBe(0);
    expect((await ReceiptModel.collection.findOne({ paymentId: payment._id }))?.status).toBe('CANCELLED');
    expect(await FinancialLedgerModel.collection.countDocuments({ paymentId: payment._id, entryType: 'REVERSAL' })).toBe(1);
    expect(await OutboxEventModel.collection.countDocuments({ eventId: `payment.reversed:${paymentId}` })).toBe(1);
  });

  it('persists receipt artifact failure without financial rollback, then retries and remains idempotent', async () => {
    const { planId } = await openPlan('artifact-retry'); const collected = await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: planId.toString(), amountMinor: 2500, method: 'CASH', idempotencyKey: 'artifact-retry-1' });
    const paymentId = collected.json.data.payment._id, receiptId = collected.json.data.receipt._id; const ledgerBefore = await FinancialLedgerModel.collection.countDocuments({ paymentId: new mongoose.Types.ObjectId(paymentId) });
    setFinanceFailurePoint('RECEIPT_BEFORE_UPLOAD');
    await expect(tenantContextStorage.run({ currentTenantId: ids.tenantA.toString(), currentUserId: ids.AdminA.toString(), isPlatformContext: false, allowedTenantIds: [ids.tenantA.toString()] }, () => ReceiptArtifactService.generate(receiptId))).rejects.toThrow('Injected finance failure');
    setFinanceFailurePoint(undefined);
    expect((await PaymentModel.collection.findOne({ _id: new mongoose.Types.ObjectId(paymentId) }))?.status).toBe('SUCCESS'); expect(await FinancialLedgerModel.collection.countDocuments({ paymentId: new mongoose.Types.ObjectId(paymentId) })).toBe(ledgerBefore);
    const failed: any = await ReceiptModel.collection.findOne({ _id: new mongoose.Types.ObjectId(receiptId) }); expect(failed.status).toBe('ISSUED'); expect(failed.artifact.status).toBe('FAILED'); expect(failed.artifact.lastError).toContain('Injected finance failure');
    const healthy: any = await tenantContextStorage.run({ currentTenantId: ids.tenantA.toString(), currentUserId: ids.AdminA.toString(), isPlatformContext: false, allowedTenantIds: [ids.tenantA.toString()] }, () => ReceiptArtifactService.generate(receiptId)); const key = healthy.artifact.storageKey;
    const downloaded = await request(tokens.StudentA1, 'GET', `/api/v1/student/receipts/${receiptId}/download`); expect(downloaded.status).toBe(200); expect(downloaded.raw.subarray(0, 5).toString()).toBe('%PDF-');
    const repeated: any = await tenantContextStorage.run({ currentTenantId: ids.tenantA.toString(), currentUserId: ids.AdminA.toString(), isPlatformContext: false, allowedTenantIds: [ids.tenantA.toString()] }, () => ReceiptArtifactService.generate(receiptId)); expect(repeated.artifact.storageKey).toBe(key);
  });

  it('enforces gateway enablement over HTTP and permits healthy test configuration', async () => {
    const redis = getRedisClient(); await redis.del('finance:worker:heartbeat'); await redis.del('finance:reconciliation:heartbeat'); process.env.STORAGE_ENCRYPTION_KEY = 'a'.repeat(64);
    const payload = { provider: 'RAZORPAY', isEnabled: true, isLiveMode: false, razorpay: { keyId: 'rzp_test_safe', keySecret: 'test-secret', webhookSecret: 'test-webhook' } };
    expect((await request(tokens.AdminA, 'PUT', '/api/v1/finance/settings/gateway', payload)).status).toBe(409);
    await redis.set('finance:worker:heartbeat', String(Date.now())); await redis.set('finance:reconciliation:heartbeat', String(Date.now()));
    expect((await request(tokens.AdminA, 'PUT', '/api/v1/finance/settings/gateway', payload)).status).toBe(200);
    const config: any = await PaymentGatewayConfigModel.collection.findOne({ tenantId: ids.tenantA }); expect(config.isEnabled).toBe(true); expect(JSON.stringify(config)).not.toContain('test-secret'); expect(JSON.stringify(config)).not.toContain('test-webhook');
  });

  it('collects manual payment with gateway disabled and no provider secrets, with exactly-once effects', async () => {
    await PaymentGatewayConfigModel.collection.updateOne({ tenantId: ids.tenantA }, { $set: { isEnabled: false, razorpay: { keyId: '', keySecretEncrypted: '', webhookSecretEncrypted: '' } } });
    const { planId } = await openPlan('manual-independent'); const result = await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/manual', { studentFeePlanId: planId.toString(), amountMinor: 3000, method: 'BANK_TRANSFER', idempotencyKey: 'manual-independent-1' }); expect(result.status).toBe(201);
    const paymentId = new mongoose.Types.ObjectId(result.json.data.payment._id); const plan: any = await StudentFeePlanModel.collection.findOne({ _id: planId });
    expect(await PaymentModel.collection.countDocuments({ _id: paymentId })).toBe(1); expect(plan.paidAmountMinor).toBe(3000); expect(plan.outstandingBalanceMinor).toBe(7000); expect(plan.installments[0].paidAmountMinor).toBe(3000);
    expect(await FinancialLedgerModel.collection.countDocuments({ paymentId, entryType: 'PAYMENT' })).toBe(1); expect(await ReceiptModel.collection.countDocuments({ paymentId })).toBe(1);
    expect(await OutboxEventModel.collection.countDocuments({ aggregateId: paymentId, eventType: 'payment.success' })).toBe(1); expect(await OutboxEventModel.collection.countDocuments({ aggregateType: 'Receipt', eventType: 'receipt.generated', 'payload.receiptNumber': result.json.data.receipt.receiptNumber })).toBe(1);
  });

  it('rejects remaining cross-tenant provider-reference permutations without Tenant B effects', async () => {
    const snapshot = async () => ({ payment: await PaymentModel.collection.findOne({ _id: ids.b1paymentId }), refund: await RefundModel.collection.findOne({ _id: ids.b1refundId }), plan: await StudentFeePlanModel.collection.findOne({ _id: ids.b1planId }), ledger: await FinancialLedgerModel.collection.countDocuments({ tenantId: ids.tenantB }), receipts: await ReceiptModel.collection.countDocuments({ tenantId: ids.tenantB }), outbox: await OutboxEventModel.collection.countDocuments({ tenantId: ids.tenantB }) });
    const before = await snapshot();
    expect((await request(tokens.AdminA, 'POST', '/api/v1/finance/payments/verify', { paymentId: ids.b1paymentId.toString(), gatewayPaymentId: 'pay-B1', gatewayOrderId: 'order-B1', gatewaySignature: 'attack' })).status).toBe(404);
    expect((await request(tokens.AdminA, 'POST', '/api/v1/finance/refunds', { paymentId: ids.b1paymentId.toString(), amountMinor: 100, reason: 'cross tenant attack' })).status).toBe(404);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/finance/refunds/${ids.b1refundId}/reconcile`)).status).toBe(404);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/finance/payments/${ids.b1paymentId}/reconcile`)).status).toBe(404);
    expect(await snapshot()).toEqual(before);
  });
});
