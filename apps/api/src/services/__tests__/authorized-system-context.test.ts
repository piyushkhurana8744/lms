import { afterEach, describe, expect, it } from 'vitest';
import { authorizeInternalSystemCaller, getAuthorizedExecutionContext, runAuthorizedSystemOperation, SystemAuthority } from '@edtech/database';

describe('authorized SYSTEM execution boundary', () => {
  const original = process.env.INTERNAL_WORKER_SECRET;
  afterEach(() => { if (original === undefined) delete process.env.INTERNAL_WORKER_SECRET; else process.env.INTERNAL_WORKER_SECRET = original; });

  it('rejects missing, incorrect and forged worker authority', async () => {
    process.env.INTERNAL_WORKER_SECRET = 'wave07-authority-secret';
    expect(authorizeInternalSystemCaller(undefined, 'worker')).toBeUndefined();
    expect(authorizeInternalSystemCaller('incorrect', 'worker')).toBeUndefined();
    await expect(runAuthorizedSystemOperation({ principal: 'forged' } as SystemAuthority, { kind: 'WORKER_CLAIM', reason: 'test', correlationId: 'forged' }, async () => true)).rejects.toThrow('Trusted internal system authority');
  });

  it('contains authority to its asynchronous operation and tenant', async () => {
    process.env.INTERNAL_WORKER_SECRET = 'wave07-authority-secret';
    const authority = authorizeInternalSystemCaller(process.env.INTERNAL_WORKER_SECRET, 'trusted-worker')!;
    const tenantId = '507f1f77bcf86cd799439011';
    await runAuthorizedSystemOperation(authority, { kind: 'WORKER_CLAIM', tenantId, reason: 'claim test', correlationId: 'claim-1' }, async () => {
      expect(getAuthorizedExecutionContext()).toMatchObject({ mode: 'SYSTEM', kind: 'WORKER_CLAIM', tenantId, principal: 'trusted-worker' });
      await expect(runAuthorizedSystemOperation(authority, { kind: 'WORKER_CLAIM', tenantId: '507f191e810c19729de860ea', reason: 'cross tenant', correlationId: 'claim-2' }, async () => true)).rejects.toThrow('cannot change tenant');
    });
    expect(getAuthorizedExecutionContext()).toBeUndefined();
  });

  it('rejects unregistered kinds, invalid tenant IDs, and query tenant mismatches', async () => {
    process.env.INTERNAL_WORKER_SECRET = 'wave07-authority-secret';
    const authority = authorizeInternalSystemCaller(process.env.INTERNAL_WORKER_SECRET, 'trusted-worker')!;
    const validTenant = '507f1f77bcf86cd799439011';
    await expect(runAuthorizedSystemOperation(authority, { kind: 'INVALID_KIND' as any, reason: 'test', correlationId: 'c1' }, async () => true)).rejects.toThrow('Unregistered system operation kind');
    await expect(runAuthorizedSystemOperation(authority, { kind: 'WORKER_CLAIM', tenantId: 'not-valid-hex', reason: 'test', correlationId: 'c2' }, async () => true)).rejects.toThrow('Authorized system tenantId is invalid');
  });
});
