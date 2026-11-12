import crypto from 'crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectDatabase,
  disconnectDatabase,
  AutomationEventModel,
  AutomationExecutionModel,
  AutomationModel,
  AutomationStepExecutionModel,
  IntegrationConnectionModel,
  ExternalMeetingModel,
  LiveClassRecordingModel,
  PaymentModel,
  RefundModel,
  TenantModel,
  UserModel,
  authorizeInternalSystemCaller,
  SystemAuthority,
  runAuthorizedSystemOperation
} from '@edtech/database';
import { AutomationService } from '../automation.service';
import { IntegrationWebhookService } from '../integrations/orchestration/integrationWebhook.service';
import { ZoomRecordingService } from '../integrations/orchestration/zoomRecording.service';
import { FinanceService } from '../finance.service';
import { PaymentProviderFactory } from '../payment/paymentProviderFactory';
import { tenantContextStorage } from '@edtech/utils';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.7 Batch 4 Trust Boundary & Security Integration Suite', () => {
  const tenantA = new mongoose.Types.ObjectId();
  const tenantB = new mongoose.Types.ObjectId();
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  let validAuthority: SystemAuthority;

  beforeAll(async () => {
    process.env.INTERNAL_WORKER_SECRET ||= 'wave07-batch4-test-secret';
    validAuthority = authorizeInternalSystemCaller(process.env.INTERNAL_WORKER_SECRET, 'batch4-security-tester')!;
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0');

    await Promise.all([
      AutomationEventModel.syncIndexes(),
      AutomationExecutionModel.syncIndexes(),
      AutomationStepExecutionModel.syncIndexes(),
      IntegrationConnectionModel.syncIndexes(),
      ExternalMeetingModel.syncIndexes(),
      LiveClassRecordingModel.syncIndexes(),
      PaymentModel.syncIndexes(),
      RefundModel.syncIndexes()
    ]);

    await Promise.all([
      AutomationEventModel.collection.deleteMany({}),
      AutomationExecutionModel.collection.deleteMany({}),
      AutomationStepExecutionModel.collection.deleteMany({}),
      IntegrationConnectionModel.collection.deleteMany({}),
      ExternalMeetingModel.collection.deleteMany({}),
      LiveClassRecordingModel.collection.deleteMany({}),
      PaymentModel.collection.deleteMany({}),
      RefundModel.collection.deleteMany({})
    ]);

    await TenantModel.collection.insertMany([
      { _id: tenantA, name: 'Tenant A', slug: 'wave07-b4-tenant-a', status: 'ACTIVE' },
      { _id: tenantB, name: 'Tenant B', slug: 'wave07-b4-tenant-b', status: 'ACTIVE' }
    ]);
    await UserModel.collection.insertMany([
      { _id: userA, tenantId: tenantA, allowedTenantIds: [tenantA], name: 'User A', email: 'a@batch4.test', passwordHash: 'x', status: 'ACTIVE' },
      { _id: userB, tenantId: tenantB, allowedTenantIds: [tenantB], name: 'User B', email: 'b@batch4.test', passwordHash: 'x', status: 'ACTIVE' }
    ]);
  });

  afterAll(async () => {
    await TenantModel.collection.deleteMany({ _id: { $in: [tenantA, tenantB] } });
    await UserModel.collection.deleteMany({ _id: { $in: [userA, userB] } });
    await disconnectDatabase();
  });

  describe('Automation Service Security Boundaries', () => {
    beforeEach(async () => {
      await AutomationEventModel.collection.deleteMany({});
      await AutomationExecutionModel.collection.deleteMany({});
      await AutomationStepExecutionModel.collection.deleteMany({});
    });

    it('rejects forged SYSTEM capability during automation event processing', async () => {
      const forged = { principal: 'attacker' } as SystemAuthority;
      await expect(
        AutomationService.processNextEvent(new Date(), forged)
      ).rejects.toThrow('Trusted internal system authority is required');
    });

    it('rejects cross-tenant automation event consumption when expectedTenantId mismatches', async () => {
      const eventId = `cross-event-${Date.now()}`;
      await AutomationService.publishEvent({
        tenantId: tenantA,
        eventId,
        eventType: 'student.enrolled',
        occurredAt: new Date(),
        actorId: userA,
        resourceType: 'Enrollment',
        resourceId: new mongoose.Types.ObjectId().toString(),
        correlationId: 'corr-1',
        depth: 0,
        payloadVersion: 1,
        payload: { sample: 'data' }
      });
      await AutomationEventModel.updateOne({ eventId }, { $set: { availableAt: new Date(Date.now() - 1000) } });

      // Claiming with expectedTenantId = tenantB must reject
      await expect(
        AutomationService.processNextEvent(new Date(), validAuthority, tenantB.toString())
      ).rejects.toThrow('Automation event tenant binding rejected');

      // Claiming with matching tenantA succeeds
      const claimed = await AutomationService.processNextEvent(new Date(), validAuthority, tenantA.toString());
      expect(claimed).not.toBeNull();
      expect(claimed.tenantId.toString()).toBe(tenantA.toString());
    });

    it('prevents duplicate claims across 10 concurrent workers', async () => {
      const eventId = `concurrent-event-${Date.now()}`;
      await AutomationService.publishEvent({
        tenantId: tenantA,
        eventId,
        eventType: 'lead.created',
        occurredAt: new Date(),
        actorId: userA,
        resourceType: 'Lead',
        resourceId: new mongoose.Types.ObjectId().toString(),
        correlationId: 'corr-conc',
        depth: 0,
        payloadVersion: 1,
        payload: { sample: 'conc' }
      });
      await AutomationEventModel.updateOne({ eventId }, { $set: { availableAt: new Date(Date.now() - 1000) } });

      const claims = await Promise.all(
        Array.from({ length: 10 }, () => AutomationService.processNextEvent(new Date(), validAuthority, tenantA.toString()))
      );
      const successfulClaims = claims.filter((c) => c !== null);
      expect(successfulClaims).toHaveLength(1);
    });

    it('recovers an expired execution lease safely without cross-tenant escalation', async () => {
      const staleTime = new Date(Date.now() - 120_000);
      const autoId = new mongoose.Types.ObjectId();
      const execA = await AutomationExecutionModel.create({
        tenantId: tenantA,
        automationId: autoId,
        automationVersion: 1,
        triggerEventId: `stale-trig-${Date.now()}`,
        triggerType: 'lead.created',
        resourceType: 'Lead',
        resourceId: new mongoose.Types.ObjectId().toString(),
        status: 'RUNNING',
        currentStep: 0,
        snapshot: { name: 'Stale auto', triggerType: 'lead.created', conditions: { mode: 'ALL', items: [] }, steps: [{ stepId: 'step1', type: 'DELAY', delaySeconds: 1 }], branchMode: 'ALL', branchIds: [], capabilitySnapshot: [], activationActorId: userA },
        context: { eventId: 'e', eventType: 'lead.created', resourceType: 'Lead', resourceId: '1', payload: { a: 1 } },
        correlationId: 'corr-stale',
        depth: 0,
        startedAt: staleTime,
        updatedAt: staleTime,
        nextRunAt: new Date(Date.now() - 1000)
      });

      // Stale step execution
      await AutomationStepExecutionModel.create({
        executionId: execA._id,
        stepId: 'step1',
        tenantId: tenantA,
        stepIndex: 0,
        actionType: 'DELAY',
        status: 'RUNNING',
        attemptCount: 1,
        idempotencyKey: `${execA._id}:step1`,
        updatedAt: staleTime
      });

      const recoveredCount = await AutomationService.recoverDue(new Date(Date.now() + 5000), 10, validAuthority);
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const updatedStep = await AutomationStepExecutionModel.findOne({ executionId: execA._id, stepId: 'step1' });
      expect(updatedStep?.status).toBe('WAITING');
      expect((await AutomationExecutionModel.findById(execA._id))?.status).toBe('WAITING');
    });
  });

  describe('Integration Webhook & Zoom Recording Security Boundaries', () => {
    it('rejects invalid or missing Zoom webhook signature', async () => {
      process.env.ZOOM_WEBHOOK_SECRET = 'zoom-secret-123';
      await expect(
        IntegrationWebhookService.handleWebhook({
          provider: 'ZOOM',
          headers: {},
          payload: { event: 'meeting.ended' }
        })
      ).rejects.toThrow('Missing Zoom webhook signature');

      await expect(
        IntegrationWebhookService.handleWebhook({
          provider: 'ZOOM',
          headers: {
            'x-zm-request-timestamp': String(Math.floor(Date.now() / 1000)),
            'x-zm-signature': 'v0=invalid-hex-signature-00000000000000000000000000000000000000000000'
          },
          payload: { event: 'meeting.ended' }
        })
      ).rejects.toThrow('Invalid Zoom webhook signature');
    });

    it('rejects Zoom webhook targeting unknown or unconnected external tenant', async () => {
      process.env.ZOOM_WEBHOOK_SECRET = 'zoom-secret-123';
      const ts = String(Math.floor(Date.now() / 1000));
      const payload = {
        event: 'meeting.ended',
        id: `evt-${Date.now()}`,
        payload: { account_id: 'unknown-zoom-acc', object: { id: '99999999' } }
      };
      const raw = JSON.stringify(payload);
      const expected = `v0=${crypto.createHmac('sha256', 'zoom-secret-123').update(`v0:${ts}:${raw}`).digest('hex')}`;

      await expect(
        IntegrationWebhookService.handleWebhook({
          provider: 'ZOOM',
          headers: {
            'x-zm-request-timestamp': ts,
            'x-zm-signature': expected
          },
          rawBody: raw,
          payload
        })
      ).rejects.toThrow('Zoom webhook account is not connected');
    });

    it('rejects forged capability on Zoom recording sync', async () => {
      const forged = { principal: 'attacker' } as SystemAuthority;
      await expect(
        ZoomRecordingService.sync(new mongoose.Types.ObjectId().toString(), forged)
      ).rejects.toThrow('Trusted internal system authority is required');
    });

    it('rejects cross-tenant meeting binding in signalMeetingEnded', async () => {
      const connId = new mongoose.Types.ObjectId();
      const extMeetingId = `zoom-meet-${Date.now()}`;
      await ExternalMeetingModel.create({
        tenantId: tenantA,
        connectionId: connId,
        classId: new mongoose.Types.ObjectId(),
        organizerUserId: userA,
        joinUrl: 'https://zoom.us/j/12345678',
        scheduledStart: new Date(),
        scheduledEnd: new Date(Date.now() + 3600_000),
        provider: 'ZOOM',
        externalMeetingId: extMeetingId,
        providerStatus: 'IN_PROGRESS'
      });

      // Caller claims meeting with tenantB expectation -> must reject
      await expect(
        ZoomRecordingService.signalMeetingEnded(connId.toString(), extMeetingId, new Date(), validAuthority, tenantB.toString())
      ).rejects.toThrow('Zoom recording meeting tenant binding rejected');
    });
  });

  describe('Razorpay Webhook Ownership Security', () => {
    it('rejects Razorpay webhook without signature', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      await expect(
        FinanceService.processRazorpayWebhook(body, '')
      ).rejects.toThrow('Missing Razorpay webhook signature');
    });

    it('rejects forged capability on Razorpay webhook execution', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { order_id: 'order-123' } } } }));
      const forged = { principal: 'attacker' } as SystemAuthority;
      await expect(
        FinanceService.processRazorpayWebhook(body, 'sig-123', 'evt-1', forged)
      ).rejects.toThrow('Trusted internal system authority is required');
    });

    it('rejects unknown order ID with 404', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { order_id: 'non-existent-order' } } } }));
      await expect(
        FinanceService.processRazorpayWebhook(body, 'any-sig', 'evt-unknown-1', validAuthority)
      ).rejects.toThrow('Webhook does not reference a known internal transaction');
    });

    it('strictly verifies signature inside resolved tenant context', async () => {
      const orderId = `order-tenant-a-${Date.now()}`;
      const paymentId = new mongoose.Types.ObjectId();
      await PaymentModel.create({
        _id: paymentId,
        tenantId: tenantA,
        paymentNumber: `PAY-SECA-1`,
        studentUserId: userA,
        studentFeePlanId: new mongoose.Types.ObjectId(),
        amountMinor: 5000,
        currency: 'INR',
        method: 'ONLINE_GATEWAY',
        status: 'PENDING',
        gatewayProvider: 'RAZORPAY',
        gatewayOrderId: orderId,
        receivedAt: new Date(),
        allocations: [],
        refundedAmountMinor: 0,
        reservedRefundAmountMinor: 0,
        createdBy: userA,
        updatedBy: userA
      });

      const providerSpy = vi.spyOn(PaymentProviderFactory, 'getProviderForTenant').mockResolvedValue({
        verifyWebhookSignature: (raw: string, sig: string) => sig === 'valid-tenant-a-signature',
        fetchPayment: vi.fn(),
        fetchPaymentForOrder: vi.fn(),
        createOrder: vi.fn(),
        fetchRefund: vi.fn(),
        findRefund: vi.fn(),
        verifyPaymentSignature: vi.fn(),
        initiateRefund: vi.fn()
      } as any);

      const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123', order_id: orderId } } } }));

      // Invalid signature fails with ForbiddenError
      await expect(
        FinanceService.processRazorpayWebhook(body, 'wrong-signature', 'evt-bad-sig', validAuthority)
      ).rejects.toThrow('Invalid webhook signature');

      providerSpy.mockRestore();
    });
  });
});
