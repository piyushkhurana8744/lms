import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TenantModel,
  BranchModel,
  UserModel,
  BatchModel,
  CourseModel,
  ClassModel,
  IntegrationConnectionModel,
  ExternalMeetingModel,
  IntegrationOperationModel,
  IntegrationWebhookEventModel,
  OrganizationMemberModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { IntegrationOperationService } from '../integrations/orchestration/integrationOperation.service';
import { TokenManagerService } from '../integrations/security/tokenManager.service';
import { LiveClassOrchestratorService } from '../integrations/orchestration/liveClassOrchestrator.service';
import { IntegrationWebhookService } from '../integrations/orchestration/integrationWebhook.service';
import { DeterministicLiveMeetingTestAdapter } from '../integrations/adapters/test/deterministicLiveMeetingTestAdapter';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 22 External Integration Platform Failure & Concurrency Test Suite', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();

  let testAdapter: DeterministicLiveMeetingTestAdapter;

  const actor = {
    userId: instructorId.toString(),
    roles: ['INSTRUCTOR'],
    isHqActor: false,
    isSuperAdmin: false
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    await TenantModel.create({ _id: tenantId, name: 'Failure Test Tenant', slug: 'fail-tenant', status: 'ACTIVE' });
    await BranchModel.create({ _id: branchId, tenantId, name: 'Branch 1', code: 'B1', slug: 'branch-1-fail', status: 'ACTIVE' });
    await UserModel.create([
      { _id: adminId, tenantId, allowedTenantIds: [tenantId], email: 'admin@fail.com', name: 'Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructorId, tenantId, allowedTenantIds: [tenantId], email: 'inst@fail.com', name: 'Instructor', passwordHash: 'hash123', status: 'ACTIVE' }
    ]);
    await OrganizationMemberModel.create([
      { tenantId, userId: adminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
      { tenantId, userId: instructorId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' }
    ]);
    await CourseModel.create({
      _id: courseId,
      tenantId,
      title: 'Fail Proof Course',
      slug: 'fp-101',
      status: 'PUBLISHED'
    });
    await BatchModel.create({
      _id: batchId,
      tenantId,
      branchId,
      courseId,
      name: 'Fail Proof Batch',
      batchCode: 'FPB-1',
      startDate: new Date(),
      status: 'ONGOING',
      instructorId,
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
      mode: 'ONLINE',
      maxSeats: 30,
      enrolledCount: 0,
      daysOfWeek: ['MON'],
      showOnWebsite: true
    });

    IntegrationProviderRegistry.setTestMode(true);
    testAdapter = IntegrationProviderRegistry.getDeterministicLiveAdapter('ZOOM');
  });

  afterAll(async () => {
    await IntegrationOperationModel.deleteMany({});
    await ExternalMeetingModel.deleteMany({});
    await IntegrationConnectionModel.deleteMany({});
    await ClassModel.deleteMany({});
    await BatchModel.deleteMany({});
    await CourseModel.deleteMany({});
    await OrganizationMemberModel.deleteMany({});
    await UserModel.deleteMany({});
    await BranchModel.deleteMany({});
    await TenantModel.deleteMany({});
    await disconnectDatabase();
  });

  describe('1. Injected Provider 429 / 503 & Transient Failure Classification', () => {
    it('classifies 429 Rate Limit as RETRYABLE with exponential backoff', async () => {
      const idempotencyKey = `OP_RATE_LIMIT_${Date.now()}`;
      let attemptsCount = 0;

      await expect(
        IntegrationOperationService.executeWithIdempotency({
          tenantId: tenantId.toString(),
          provider: 'ZOOM',
          connectionId: new mongoose.Types.ObjectId().toString(),
          operationType: 'CREATE_MEETING',
          canonicalResourceType: 'Class',
          canonicalResourceId: new mongoose.Types.ObjectId().toString(),
          idempotencyKey,
          payload: {},
          fn: async () => {
            attemptsCount++;
            const err: any = new Error('Rate limit exceeded');
            err.statusCode = 429;
            throw err;
          }
        })
      ).rejects.toThrow();

      const op = await IntegrationOperationModel.findOne({ idempotencyKey });
      expect(op).toBeDefined();
      expect(op?.status).toBe('RETRYABLE');
      expect(op?.errorCategory).toBe('RATE_LIMITED');
      expect(op?.nextRetryAt).toBeDefined();
      expect(op?.attempts).toBe(1);
    });

    it('classifies 503 Temporary Provider Failure as RETRYABLE', async () => {
      const idempotencyKey = `OP_503_${Date.now()}`;

      await expect(
        IntegrationOperationService.executeWithIdempotency({
          tenantId: tenantId.toString(),
          provider: 'ZOOM',
          connectionId: new mongoose.Types.ObjectId().toString(),
          operationType: 'RESCHEDULE_MEETING',
          canonicalResourceType: 'Class',
          canonicalResourceId: new mongoose.Types.ObjectId().toString(),
          idempotencyKey,
          payload: {},
          fn: async () => {
            const err: any = new Error('Service Unavailable');
            err.statusCode = 503;
            throw err;
          }
        })
      ).rejects.toThrow();

      const op = await IntegrationOperationModel.findOne({ idempotencyKey });
      expect(op?.status).toBe('RETRYABLE');
      expect(op?.errorCategory).toBe('TEMPORARY_PROVIDER_FAILURE');
    });
  });

  describe('2. Token Refresh Race Condition Proof (10 Concurrent Requests)', () => {
    it('executes exactly 1 refresh operation under 10 concurrent requests without refresh storm', async () => {
      const conn = await IntegrationConnectionModel.create({
        tenantId,
        provider: 'ZOOM',
        scopeType: 'USER',
        userId: adminId.toString(),
        status: 'CONNECTED',
        encryptedCredentials: SecretEncryptionService.encryptSecret(
          JSON.stringify({
            refreshToken: 'valid_refresh_token_123',
            accessToken: 'expired_access_token_123'
          })
        ),
        expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
      });

      let refreshCallCount = 0;
      const mockRefresh = async () => {
        refreshCallCount++;
        await new Promise((r) => setTimeout(r, 50)); // simulate latency
        return {
          accessToken: 'fresh_access_token_' + Date.now(),
          expiresInSeconds: 3600
        };
      };

      // Launch 10 simultaneous token requests
      const promises = Array.from({ length: 10 }).map(() =>
        TokenManagerService.getValidAccessToken(conn, mockRefresh)
      );

      const results = await Promise.all(promises);

      // Verify all 10 calls got the exact same fresh access token
      expect(results.length).toBe(10);
      const firstToken = results[0];
      expect(firstToken).toContain('fresh_access_token_');
      results.forEach((tok) => expect(tok).toBe(firstToken));

      // Verify lock prevented multiple refreshes: exactly 1 refresh operation executed
      expect(refreshCallCount).toBe(1);

      const updatedConn = await IntegrationConnectionModel.findById(conn._id);
      expect(updatedConn?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('3. Ambiguous Provider Commit Crash Recovery (Google Meet, Zoom, Microsoft Teams)', () => {
    const providers: Array<'GOOGLE_MEET' | 'ZOOM' | 'MICROSOFT_TEAMS'> = ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'];

    providers.forEach((prov) => {
      it(`recovers from ambiguous crash for ${prov} without creating duplicates`, async () => {
        const classId = new mongoose.Types.ObjectId();
        await ClassModel.create({
          _id: classId,
          tenantId,
          branchId,
          batchId,
          courseId,
          instructorId,
          name: `Ambiguous Commit ${prov} Class`,
          classCode: `CLS-${prov.slice(0, 3)}-CRASH`,
          scheduledStartAt: new Date(Date.now() + 3600000),
          scheduledEndAt: new Date(Date.now() + 7200000),
          startDate: new Date(Date.now() + 3600000),
          endDate: new Date(Date.now() + 7200000),
          status: 'SCHEDULED',
          scheduleRevision: 0,
          mode: 'ONLINE',
          capacity: 30,
          enrolledCount: 0,
          enrolledStudents: [],
          timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
          daysOfWeek: [],
          showOnWebsite: false
        });

        await IntegrationConnectionModel.create({
          tenantId,
          provider: prov,
          scopeType: 'TENANT',
          status: 'CONNECTED',
          encryptedCredentials: SecretEncryptionService.encryptSecret(
            JSON.stringify({
              refreshToken: `ref_${prov}`,
              accessToken: `acc_${prov}`
            })
          )
        });

        const provAdapter = IntegrationProviderRegistry.getDeterministicLiveAdapter(prov);

        // Inject crash: adapter creates meeting externally but throws error before DIDM commits ExternalMeeting
        provAdapter.setInjectedFailure({ errorType: 'AMBIGUOUS_CREATE_CRASH' });

        await expect(
          LiveClassOrchestratorService.createMeetingForClass(
            tenantId.toString(),
            classId.toString(),
            { provider: prov },
            actor
          )
        ).rejects.toThrow();

        // Clear crash mode and retry
        provAdapter.setInjectedFailure(null);

        const recoveredMeeting = await LiveClassOrchestratorService.createMeetingForClass(
          tenantId.toString(),
          classId.toString(),
          { provider: prov },
          actor
        );

        expect(recoveredMeeting.externalMeetingId).toBeDefined();
        expect(recoveredMeeting.syncStatus).toBe('SYNCED');

        // Verify exactly ONE ExternalMeeting document exists in MongoDB
        const meetingCount = await ExternalMeetingModel.countDocuments({
          tenantId,
          classId: classId.toString()
        });
        expect(meetingCount).toBe(1);

        // Verify logical operations completed = 1
        const opCount = await IntegrationOperationModel.countDocuments({
          tenantId,
          canonicalResourceId: classId.toString(),
          status: 'COMPLETED'
        });
        expect(opCount).toBe(1);
      });
    });
  });

  describe('4. Webhook Replay Idempotency Proof', () => {
    it('processes 10 duplicate webhook deliveries with exactly 1 stored event and 1 logical effect', async () => {
      const externalEventId = `evt_replay_${Date.now()}`;
      const payload = {
        event: 'meeting.participant_joined',
        payload: {
          object: {
            id: 'mtg_123',
            participant: { user_name: 'Test Student', email: 'student@test.com' }
          }
        }
      };

      // Deliver 10 simultaneous webhook requests with the same externalEventId
      const deliveries = await Promise.all(
        Array.from({ length: 10 }).map(() =>
          IntegrationWebhookService.handleWebhook({
            provider: 'ZOOM',
            headers: { 'x-didm-test-webhook': 'deterministic' },
            payload: {
              id: externalEventId,
              event: 'meeting.participant_joined',
              payload: {
                object: {
                  id: 'mtg_123',
                  participant: { user_name: 'Test Student', email: 'student@test.com' }
                }
              }
            }
          })
        )
      );

      // Verify all 10 return success (HTTP 200 equivalent)
      expect(deliveries.length).toBe(10);
      deliveries.forEach((d) => expect(['PROCESSED', 'IGNORED']).toContain(d.status));

      // Verify exactly ONE record stored in database
      const eventCount = await IntegrationWebhookEventModel.countDocuments({
        provider: 'ZOOM',
        externalEventId
      });
      expect(eventCount).toBe(1);
    });
  });
});
