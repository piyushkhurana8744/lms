import { afterEach, describe, expect, it, vi } from 'vitest';
import { RazorpayProvider } from '../payment/razorpay.provider';

describe('Razorpay refund ambiguity controls', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends a stable internal refund identity to the provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'rfnd_1', amount: 500, status: 'pending' })
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new RazorpayProvider({ keyId: 'key', keySecret: 'secret' });

    await provider.initiateRefund({ paymentId: 'pay_1', amountMinor: 500, reason: 'duplicate', idempotencyKey: 'RFND-2026-0001' });

    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({
      amount: 500,
      receipt: 'RFND-2026-0001',
      notes: { reason: 'duplicate', internalRefundId: 'RFND-2026-0001' }
    });
  });

  it('discovers the provider refund by the stable identity after a timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [
        { id: 'rfnd_other', payment_id: 'pay_1', amount: 100, status: 'processed', receipt: 'other' },
        { id: 'rfnd_match', payment_id: 'pay_1', amount: 500, status: 'processed', notes: { internalRefundId: 'RFND-2026-0001' } }
      ] })
    }));
    const provider = new RazorpayProvider({ keyId: 'key', keySecret: 'secret' });

    await expect(provider.findRefund('pay_1', 'RFND-2026-0001')).resolves.toEqual({
      refundId: 'rfnd_match', paymentId: 'pay_1', amountMinor: 500, status: 'PROCESSED'
    });
  });
});
