import crypto from 'crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectDatabase,
  disconnectDatabase,
  TenantModel,
  UserModel,
  SessionModel,
  PaymentModel,
  RefundModel,
  PaymentWebhookEventModel,
  CertificateModel,
  issuePlatformAuthority,
  runAuthorizedPlatformOperation,
  authorizeInternalSystemCaller,
  SystemAuthority,
  assertPublicReadPolicy,
  runPlatformProvisioningOperation
} from '@edtech/database';
import { AuthService } from '../auth.service';
import { FinanceService } from '../finance.service';
import { CertificateService } from '../certificate.service';
import { PaymentProviderFactory } from '../payment/paymentProviderFactory';
import { tenantContextStorage } from '@edtech/utils';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../errors/appError';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.7 Batch 5 Trust Boundary, Platform Authority & Public Verification Integration Suite', () => {
  const tenantA = new mongoose.Types.ObjectId();
  const tenantB = new mongoose.Types.ObjectId();
  const superAdminId = new mongoose.Types.ObjectId();
  const targetUserA = new mongoose.Types.ObjectId();
  const targetUserB = new mongoose.Types.ObjectId();
  let validSystemAuth: SystemAuthority;

  beforeAll(async () => {
    process.env.INTERNAL_WORKER_SECRET ||= 'wave07-batch5-test-secret';
    validSystemAuth = authorizeInternalSystemCaller(process.env.INTERNAL_WORKER_SECRET, 'batch5-security-tester')!;
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0');

    await Promise.all([
      PaymentModel.syncIndexes(),
      RefundModel.syncIndexes(),
      PaymentWebhookEventModel.syncIndexes(),
      CertificateModel.syncIndexes()
    ]);

    await Promise.all([
      TenantModel.collection.deleteMany({ _id: { $in: [tenantA, tenantB] } }),
      UserModel.collection.deleteMany({ _id: { $in: [superAdminId, targetUserA, targetUserB] } })
    ]);

    await TenantModel.collection.insertMany([
      { _id: tenantA, name: 'Tenant A', slug: 'wave07-b5-tenant-a', status: 'ACTIVE' },
      { _id: tenantB, name: 'Tenant B', slug: 'wave07-b5-tenant-b', status: 'ACTIVE' }
    ]);

    await UserModel.collection.insertMany([
      { _id: superAdminId, tenantId: null, allowedTenantIds: [], name: 'Super Admin', email: 'super@wave07.test', passwordHash: 'hash', isSuperAdmin: true, status: 'ACTIVE' },
      { _id: targetUserA, tenantId: tenantA, allowedTenantIds: [tenantA], name: 'User A', email: 'user.a@wave07.test', passwordHash: 'hash', isSuperAdmin: false, status: 'ACTIVE' },
      { _id: targetUserB, tenantId: tenantB, allowedTenantIds: [tenantB], name: 'User B', email: 'user.b@wave07.test', passwordHash: 'hash', isSuperAdmin: false, status: 'ACTIVE' }
    ]);
  });

  afterAll(async () => {
    await TenantModel.collection.deleteMany({ _id: { $in: [tenantA, tenantB] } });
    await UserModel.collection.deleteMany({ _id: { $in: [superAdminId, targetUserA, targetUserB] } });
    await disconnectDatabase();
  });

  describe('Razorpay Webhook Trust Boundary', () => {
    const orderId = `order_test_${Date.now()}`;
    const paymentId = new mongoose.Types.ObjectId();
    const webhookSecret = 'test-razorpay-webhook-secret';

    beforeAll(async () => {
      await PaymentModel.create({
        _id: paymentId,
        tenantId: tenantA,
        gatewayProvider: 'RAZORPAY',
        gatewayOrderId: orderId,
        paymentNumber: 'PAY-WAVE07-B5-01',
        studentUserId: targetUserA,
        studentFeePlanId: new mongoose.Types.ObjectId(),
        amountMinor: 500000,
        currency: 'INR',
        method: 'ONLINE_GATEWAY',
        status: 'PENDING',
        receivedAt: new Date(),
        createdBy: targetUserA,
        updatedBy: targetUserA,
        metadata: {}
      });
    });

    it('rejects webhook requests with missing signature header', async () => {
      const payload = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      await expect(
        FinanceService.processRazorpayWebhook(payload, '', undefined, validSystemAuth)
      ).rejects.toThrow('Missing Razorpay webhook signature');
    });

    it('rejects webhook requests with malformed order ID injection', async () => {
      const payload = Buffer.from(JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { order_id: 'order_id_with_illegal_chars$!#' } } }
      }));
      await expect(
        FinanceService.processRazorpayWebhook(payload, 'a'.repeat(64), undefined, validSystemAuth)
      ).rejects.toThrow('Invalid Razorpay order identifier format');
    });

    it('rejects webhook requests targeting unknown order ID with 404', async () => {
      const payload = Buffer.from(JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { order_id: 'order_nonexistent_12345' } } }
      }));
      await expect(
        FinanceService.processRazorpayWebhook(payload, 'a'.repeat(64), undefined, validSystemAuth)
      ).rejects.toThrow('Webhook does not reference a known internal transaction');
    });

    it('rejects invalid signature before mutating financial state', async () => {
      const payloadObj = {
        id: `evt_${Date.now()}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: orderId,
              amount: 500000
            }
          }
        }
      };
      const rawBody = Buffer.from(JSON.stringify(payloadObj));
      const invalidSignature = 'a'.repeat(64);

      const mockProvider = {
        verifyWebhookSignature: vi.fn().mockReturnValue(false),
        fetchPayment: vi.fn()
      };
      vi.spyOn(PaymentProviderFactory, 'getProviderForTenant').mockResolvedValue(mockProvider as any);

      await expect(
        FinanceService.processRazorpayWebhook(rawBody, invalidSignature, payloadObj.id, validSystemAuth)
      ).rejects.toThrow('Invalid webhook signature');

      expect(mockProvider.verifyWebhookSignature).toHaveBeenCalled();
      expect(mockProvider.fetchPayment).not.toHaveBeenCalled();

      // Ensure no inbox record was marked processed
      const inbox = await PaymentWebhookEventModel.findOne({ providerEventId: payloadObj.id });
      expect(inbox).toBeNull();
    });
  });

  describe('Platform Authority & SuperAdmin Impersonation Boundaries', () => {
    let superAdminSessionId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      superAdminSessionId = new mongoose.Types.ObjectId();
      await SessionModel.create({
        _id: superAdminSessionId,
        userId: superAdminId,
        tenantId: null,
        activeTenantId: null,
        tokenVersion: 1,
        currentRefreshTokenHash: 'dummy',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    it('rejects impersonation by an inactive caller account', async () => {
      const inactiveAdmin = new mongoose.Types.ObjectId();
      await runPlatformProvisioningOperation('Provision inactive admin for test', async () => {
        await UserModel.create({
          _id: inactiveAdmin,
          name: 'Inactive Admin',
          email: 'inactive@wave07.test',
          passwordHash: 'x',
          isSuperAdmin: true,
          status: 'SUSPENDED'
        });
      });

      const inactiveSessionId = new mongoose.Types.ObjectId();
      await SessionModel.create({
        _id: inactiveSessionId,
        userId: inactiveAdmin,
        tenantId: null,
        activeTenantId: null,
        tokenVersion: 1,
        currentRefreshTokenHash: 'dummy',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      await expect(
        AuthService.impersonateUser({
          targetUserId: targetUserA.toString(),
          superAdminUserId: inactiveAdmin.toString(),
          reason: 'Test suspension check',
          originalSessionId: inactiveSessionId.toString()
        })
      ).rejects.toThrow(/Active platform SuperAdmin permission is required|Platform Super Admin access required for impersonation/);
    });

    it('rejects impersonation when caller session is revoked', async () => {
      await SessionModel.updateOne({ _id: superAdminSessionId }, { $set: { revokedAt: new Date() } });

      await expect(
        AuthService.impersonateUser({
          targetUserId: targetUserA.toString(),
          superAdminUserId: superAdminId.toString(),
          reason: 'Test revoked session check',
          originalSessionId: superAdminSessionId.toString()
        })
      ).rejects.toThrow('Platform Super Admin session is expired or revoked');
    });

    it('allows verified SuperAdmin session to impersonate target user and exit cleanly', async () => {
      const result = await AuthService.impersonateUser({
        targetUserId: targetUserA.toString(),
        superAdminUserId: superAdminId.toString(),
        reason: 'Customer support investigation',
        originalSessionId: superAdminSessionId.toString()
      });

      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();

      // Find impersonated session
      const impersonatedSession = await SessionModel.findOne({
        userId: targetUserA,
        impersonatedBy: superAdminId
      });
      expect(impersonatedSession).not.toBeNull();
      expect(impersonatedSession!.impersonationReason).toBe('Customer support investigation');

      // Exit impersonation
      const exitResult = await AuthService.exitImpersonation({
        currentSessionId: impersonatedSession!._id.toString()
      });
      expect(exitResult.impersonationEnded).toBe(true);

      // Verify impersonated session was revoked
      const revokedSession = await SessionModel.findById(impersonatedSession!._id);
      expect(revokedSession!.revokedAt).not.toBeNull();
    });
  });

  describe('Public Certificate Verification Policy', () => {
    const certCode = 'cert_verify_wave07_batch5_secure_code_2026_token';
    const certId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
      await CertificateModel.create({
        _id: certId,
        tenantId: tenantA,
        studentId: targetUserA,
        courseId: new mongoose.Types.ObjectId(),
        enrollmentId: new mongoose.Types.ObjectId(),
        certificateNumber: 'CERT-2026-001',
        verificationCode: certCode,
        status: 'ISSUED',
        issuedAt: new Date('2026-01-15T10:00:00Z'),
        issuedBy: targetUserA,
        eligibilitySnapshot: {
          enrollmentStatus: 'COMPLETED',
          progressPercent: 100,
          completedAt: new Date('2026-01-14T18:00:00Z')
        },
        credentialSnapshot: {
          studentName: 'Aman Sharma',
          courseTitle: 'Full Stack Engineering',
          organizationName: 'DIDM Academy',
          completionDate: new Date('2026-01-14T18:00:00Z'),
          issueDate: new Date('2026-01-15T10:00:00Z'),
          studentEmail: 'aman.private@example.com',
          privateInternalNotes: 'Confidential grade 98%'
        }
      });
    });

    it('returns public credential snapshot without private student PII', async () => {
      const publicResult = await CertificateService.verify(certCode);

      expect(publicResult.valid).toBe(true);
      expect(publicResult.status).toBe('ISSUED');
      expect(publicResult.certificateNumber).toBe('CERT-2026-001');
      expect(publicResult.studentName).toBe('Aman Sharma');
      expect(publicResult.courseTitle).toBe('Full Stack Engineering');
      expect(publicResult.organizationName).toBe('DIDM Academy');

      // Crucial: Private PII must NOT be included in public snapshot
      expect((publicResult as any).studentEmail).toBeUndefined();
      expect((publicResult as any).privateInternalNotes).toBeUndefined();
      expect((publicResult as any).studentId).toBeUndefined();
      expect((publicResult as any).tenantId).toBeUndefined();
    });

    it('correctly marks revoked certificate as invalid', async () => {
      const revokedCode = 'cert_revoked_wave07_batch5_misconduct_999_token';
      await CertificateModel.create({
        _id: new mongoose.Types.ObjectId(),
        tenantId: tenantA,
        studentId: targetUserA,
        courseId: new mongoose.Types.ObjectId(),
        enrollmentId: new mongoose.Types.ObjectId(),
        certificateNumber: 'CERT-2026-REV',
        verificationCode: revokedCode,
        status: 'REVOKED',
        issuedAt: new Date('2026-01-10T10:00:00Z'),
        issuedBy: targetUserA,
        revokedAt: new Date(),
        revocationReason: 'Academic misconduct',
        eligibilitySnapshot: {
          enrollmentStatus: 'COMPLETED',
          progressPercent: 100,
          completedAt: new Date('2026-01-10T09:00:00Z')
        },
        credentialSnapshot: {
          studentName: 'Dishonest Student',
          courseTitle: 'Full Stack Engineering',
          organizationName: 'DIDM Academy',
          completionDate: new Date('2026-01-10T09:00:00Z'),
          issueDate: new Date('2026-01-10T10:00:00Z')
        }
      });

      const publicResult = await CertificateService.verify(revokedCode);
      expect(publicResult.valid).toBe(false);
      expect(publicResult.status).toBe('REVOKED');
      expect(publicResult.studentName).toBe('Dishonest Student');
    });

    it('rejects non-existent verification code with NotFoundError', async () => {
      await expect(
        CertificateService.verify('cert_nonexistent_wave07_batch5_missing_000_token')
      ).rejects.toThrow('Credential not found');
    });

    it('policy rejects malformed or non-string verification code queries', () => {
      expect(() =>
        assertPublicReadPolicy('CERTIFICATE_VERIFICATION', { verificationCode: { $regex: '.*' } })
      ).toThrow('Public certificate verification requires an exact valid verificationCode predicate');

      expect(() =>
        assertPublicReadPolicy('CERTIFICATE_VERIFICATION', {})
      ).toThrow('Public certificate verification requires an exact valid verificationCode predicate');
    });
  });
});
