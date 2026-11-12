import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authorizeInternalSystemCaller, connectDatabase, disconnectDatabase, OutboxEventModel, PaymentModel, SystemAuthority } from '@edtech/database';
import { claimOutboxEvent, dispatchClaimedEvent } from '../outboxDispatcher.ts';
import { claimReconciliation } from '../financeReconciliation.ts';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;
suite('finance worker reliability integration', () => {
  const oid = () => new PaymentModel()._id;
  const runId = oid().toString(); const tenantId = oid();
  let authority: SystemAuthority;
  beforeAll(async () => { process.env.INTERNAL_WORKER_SECRET ||= 'wave07-test-worker-secret'; authority = authorizeInternalSystemCaller(process.env.INTERNAL_WORKER_SECRET, 'finance-worker-test')!; await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://localhost:27017/edtech_lms_test?replicaSet=rs0'); await OutboxEventModel.deleteMany({}); await OutboxEventModel.syncIndexes(); });
  afterAll(async () => { await OutboxEventModel.deleteMany({ eventId: new RegExp(`^${runId}`) }); await PaymentModel.collection.deleteMany({ paymentNumber: new RegExp(`^${runId}`) }); await disconnectDatabase(); });

  async function event(suffix: string, overrides: any = {}) { return OutboxEventModel.create({ tenantId, eventId: `${runId}:${suffix}`, eventType: 'payment.success', aggregateType: 'Payment', aggregateId: oid(), payload: { email: 'student@example.com' }, status: 'PENDING', availableAt: new Date(), ...overrides }); }

  it('rejects an unauthorized caller', async () => { await expect(claimOutboxEvent({ principal: 'forged' } as SystemAuthority)).rejects.toThrow('Trusted internal system authority'); });
  it('allows one active claim', async () => { await event('claim'); const claims = await Promise.all(Array.from({ length: 10 }, () => claimOutboxEvent(authority))); expect(claims.filter(Boolean)).toHaveLength(1); });
  it('recovers an expired lease', async () => { await event('lease', { status: 'PROCESSING', attemptCount: 1, leaseUntil: new Date(0) }); const claimed = await claimOutboxEvent(authority); expect(claimed?.eventId).toBe(`${runId}:lease`); expect(claimed?.attemptCount).toBe(2); });
  it('persists failure and retries with stable job identity', async () => { await event('retry'); const first = await claimOutboxEvent(authority); await dispatchClaimedEvent(first, { add: async () => { throw new Error('queue unavailable'); } }); const failed = await OutboxEventModel.findOne({ eventId: `${runId}:retry` }); expect(failed?.status).toBe('PENDING'); failed!.availableAt = new Date(0); await failed!.save(); const ids: string[] = []; await dispatchClaimedEvent(await claimOutboxEvent(authority), { add: async (_n, _d, options) => { ids.push(options.jobId); } }); expect(ids).toEqual([`${runId}_retry`]); });
  it('recovers publish-then-mark failure with one stable identity', async () => { await event('crash'); const ids: string[] = []; const queue = { add: async (_n: string, _d: any, options: any) => { ids.push(options.jobId); } }; await dispatchClaimedEvent(await claimOutboxEvent(authority), queue, undefined, async () => { throw new Error('crash'); }); const retry = await OutboxEventModel.findOne({ eventId: `${runId}:crash` }); retry!.availableAt = new Date(0); await retry!.save(); await dispatchClaimedEvent(await claimOutboxEvent(authority), queue); expect(ids).toHaveLength(2); expect(new Set(ids).size).toBe(1); });
  it('dead-letters after maximum attempts', async () => { await event('dead', { attemptCount: 4 }); await dispatchClaimedEvent(await claimOutboxEvent(authority), { add: async () => { throw new Error('permanent'); } }); expect((await OutboxEventModel.findOne({ eventId: `${runId}:dead` }))?.status).toBe('FAILED'); });
  it('claims stale reconciliation work once and rejects unauthorized callers', async () => {
    const id = oid();
    await PaymentModel.collection.insertOne({ _id: id, tenantId, paymentNumber: `${runId}-reconcile`, status: 'PENDING', createdAt: new Date(0) });
    await expect(claimReconciliation('payment', 1)).rejects.toThrow('Trusted internal system authority is required');
    await expect(claimReconciliation('payment', 1, { principal: 'forged' } as SystemAuthority)).rejects.toThrow('Trusted internal system authority');
    const claims = await Promise.all(Array.from({ length: 10 }, () => claimReconciliation('payment', 1, authority)));
    expect(claims.filter((claim) => claim?._id.toString() === id.toString())).toHaveLength(1);
  });
});
