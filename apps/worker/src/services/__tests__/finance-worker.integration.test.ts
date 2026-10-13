import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase, OutboxEventModel, PaymentModel } from '@edtech/database';
import { claimOutboxEvent, dispatchClaimedEvent } from '../outboxDispatcher';
import { claimReconciliation } from '../financeReconciliation';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;
suite('finance worker reliability integration', () => {
  const oid = () => new PaymentModel()._id;
  const runId = oid().toString(); const tenantId = oid();
  beforeAll(async () => { await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://localhost:27017/edtech_lms_test?replicaSet=rs0'); await OutboxEventModel.deleteMany({}); await OutboxEventModel.syncIndexes(); });
  afterAll(async () => { await OutboxEventModel.deleteMany({ eventId: new RegExp(`^${runId}`) }); await PaymentModel.collection.deleteMany({ paymentNumber: new RegExp(`^${runId}`) }); await disconnectDatabase(); });

  async function event(suffix: string, overrides: any = {}) { return OutboxEventModel.create({ tenantId, eventId: `${runId}:${suffix}`, eventType: 'payment.success', aggregateType: 'Payment', aggregateId: oid(), payload: { email: 'student@example.com' }, status: 'PENDING', availableAt: new Date(), ...overrides }); }

  it('allows one active claim', async () => { await event('claim'); const claims = await Promise.all(Array.from({ length: 10 }, () => claimOutboxEvent())); expect(claims.filter(Boolean)).toHaveLength(1); });
  it('recovers an expired lease', async () => { await event('lease', { status: 'PROCESSING', attemptCount: 1, leaseUntil: new Date(0) }); const claimed = await claimOutboxEvent(); expect(claimed?.eventId).toBe(`${runId}:lease`); expect(claimed?.attemptCount).toBe(2); });
  it('persists failure and retries with stable job identity', async () => { await event('retry'); const first = await claimOutboxEvent(); await dispatchClaimedEvent(first, { add: async () => { throw new Error('queue unavailable'); } }); const failed = await OutboxEventModel.findOne({ eventId: `${runId}:retry` }); expect(failed?.status).toBe('PENDING'); failed!.availableAt = new Date(0); await failed!.save(); const ids: string[] = []; await dispatchClaimedEvent(await claimOutboxEvent(), { add: async (_n, _d, options) => { ids.push(options.jobId); } }); expect(ids).toEqual([`${runId}_retry`]); });
  it('recovers publish-then-mark failure with one stable identity', async () => { await event('crash'); const ids: string[] = []; const queue = { add: async (_n: string, _d: any, options: any) => { ids.push(options.jobId); } }; await dispatchClaimedEvent(await claimOutboxEvent(), queue, undefined, async () => { throw new Error('crash'); }); const retry = await OutboxEventModel.findOne({ eventId: `${runId}:crash` }); retry!.availableAt = new Date(0); await retry!.save(); await dispatchClaimedEvent(await claimOutboxEvent(), queue); expect(ids).toHaveLength(2); expect(new Set(ids).size).toBe(1); });
  it('dead-letters after maximum attempts', async () => { await event('dead', { attemptCount: 4 }); await dispatchClaimedEvent(await claimOutboxEvent(), { add: async () => { throw new Error('permanent'); } }); expect((await OutboxEventModel.findOne({ eventId: `${runId}:dead` }))?.status).toBe('FAILED'); });
  it('claims stale reconciliation work once', async () => { const id = oid(); await PaymentModel.collection.insertOne({ _id: id, tenantId, paymentNumber: `${runId}-reconcile`, status: 'PENDING', createdAt: new Date(0) }); const claims = await Promise.all(Array.from({ length: 10 }, () => claimReconciliation('payment', 1))); expect(claims.filter((claim) => claim?._id.toString() === id.toString())).toHaveLength(1); });
});
