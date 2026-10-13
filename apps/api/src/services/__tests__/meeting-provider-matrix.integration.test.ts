import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TenantModel,
  BranchModel,
  UserModel,
  BatchModel,
  CourseModel,
  ClassModel,
  EnrollmentModel,
  IntegrationConnectionModel,
  ExternalMeetingModel,
  AttendanceEvidenceModel,
  LiveMeetingAssociationHistoryModel,
  OrganizationMemberModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { LiveClassOrchestratorService } from '../integrations/orchestration/liveClassOrchestrator.service';
import { DeterministicLiveMeetingTestAdapter } from '../integrations/adapters/test/deterministicLiveMeetingTestAdapter';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';
import { IntegrationProvider } from '@edtech/types';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 22 Live Meeting Provider Matrix & Concurrency Test Suite', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();

  const courseId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();

  const connections: Record<string, string> = {
    GOOGLE_MEET: '',
    ZOOM: '',
    MICROSOFT_TEAMS: ''
  };

  const actor = {
    userId: instructorId.toString(),
    roles: ['INSTRUCTOR'],
    isHqActor: false,
    isSuperAdmin: false
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    await TenantModel.create({ _id: tenantId, name: 'Provider Matrix Tenant', slug: 'prov-matrix', status: 'ACTIVE' });
    await BranchModel.create({ _id: branchId, tenantId, name: 'Matrix Branch', code: 'MB-1', slug: 'branch-matrix', status: 'ACTIVE' });

    await UserModel.create([
      { _id: instructorId, tenantId, allowedTenantIds: [tenantId], email: 'instructor@matrix.edu', name: 'Matrix Instructor', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student1Id, tenantId, allowedTenantIds: [tenantId], email: 'student1@matrix.edu', name: 'Alice Student', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student2Id, tenantId, allowedTenantIds: [tenantId], email: 'student2@matrix.edu', name: 'Bob Student', passwordHash: 'hash123', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.create([
      { tenantId, userId: instructorId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' },
      { tenantId, userId: student1Id, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' },
      { tenantId, userId: student2Id, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' }
    ]);

    await CourseModel.create({
      _id: courseId,
      tenantId,
      title: 'Matrix Architecture Course',
      slug: 'mat-101',
      status: 'PUBLISHED'
    });

    await BatchModel.create({
      _id: batchId,
      tenantId,
      branchId,
      courseId,
      name: 'Matrix Batch Alpha',
      batchCode: 'MBA-1',
      startDate: new Date(),
      status: 'ONGOING',
      instructorId,
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
      mode: 'ONLINE',
      maxSeats: 30,
      enrolledCount: 2,
      daysOfWeek: ['MON'],
      showOnWebsite: true
    });

    await EnrollmentModel.create([
      { tenantId, studentId: student1Id, courseId, batchId, status: 'ACTIVE' },
      { tenantId, studentId: student2Id, courseId, batchId, status: 'ACTIVE' }
    ]);

    IntegrationProviderRegistry.setTestMode(true);

    const providers: IntegrationProvider[] = ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'];
    for (const p of providers) {
      const conn = await IntegrationConnectionModel.create({
        tenantId,
        provider: p,
        status: 'CONNECTED',
        encryptedCredentials: SecretEncryptionService.encryptSecret(
          JSON.stringify({
            refreshToken: `ref_${p}`,
            accessToken: `acc_${p}`
          })
        ),
        externalAccountId: `host@${p.toLowerCase()}.com`
      });
      connections[p] = conn._id.toString();
    }
  });

  afterAll(async () => {
    await LiveMeetingAssociationHistoryModel.deleteMany({});
    await AttendanceEvidenceModel.deleteMany({});
    await ExternalMeetingModel.deleteMany({});
    await IntegrationConnectionModel.deleteMany({});
    await ClassModel.deleteMany({});
    await EnrollmentModel.deleteMany({});
    await BatchModel.deleteMany({});
    await CourseModel.deleteMany({});
    await OrganizationMemberModel.deleteMany({});
    await UserModel.deleteMany({});
    await BranchModel.deleteMany({});
    await TenantModel.deleteMany({});
    await disconnectDatabase();
  });

  const providers: IntegrationProvider[] = ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'];

  it('persists append-only Meet to Zoom to Teams association history and converges concurrent retries', async () => {
    const switchClassId = new mongoose.Types.ObjectId();
    await ClassModel.create({
      _id: switchClassId, tenantId, branchId, batchId, courseId, instructorId,
      name: 'Provider Switch History', classCode: 'CLS-SWITCH-HISTORY',
      scheduledStartAt: new Date(Date.now() + 3600000), scheduledEndAt: new Date(Date.now() + 7200000),
      startDate: new Date(Date.now() + 3600000), endDate: new Date(Date.now() + 7200000),
      status: 'SCHEDULED', scheduleRevision: 0, mode: 'ONLINE', capacity: 30,
      enrolledCount: 0, enrolledStudents: [],
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' }, daysOfWeek: [], showOnWebsite: false
    });

    for (const provider of providers) {
      await LiveClassOrchestratorService.createMeetingForClass(
        tenantId.toString(), switchClassId.toString(), { provider }, actor
      );
    }
    await Promise.all(Array.from({ length: 10 }, () =>
      LiveClassOrchestratorService.createMeetingForClass(
        tenantId.toString(), switchClassId.toString(), { provider: 'MICROSOFT_TEAMS' }, actor
      )
    ));

    const history = await LiveMeetingAssociationHistoryModel.find({ tenantId, classId: switchClassId })
      .sort({ activatedAt: 1 });
    expect(history).toHaveLength(3);
    expect(history.map((entry) => entry.provider)).toEqual(providers);
    expect(history.filter((entry) => entry.status === 'ACTIVE')).toHaveLength(1);
    expect(history[2].status).toBe('ACTIVE');
    expect(history[0].status).toBe('RETIRED');
    expect(history[1].status).toBe('RETIRED');
    for (const entry of history) {
      expect(entry.actorId.toString()).toBe(instructorId.toString());
      expect(entry.activatedAt).toBeInstanceOf(Date);
      expect(entry.externalMeetingId).toBeTruthy();
    }
    expect(history[0].retiredAt).toBeInstanceOf(Date);
    expect(history[1].retiredAt).toBeInstanceOf(Date);
    expect(await LiveMeetingAssociationHistoryModel.countDocuments({
      tenantId: new mongoose.Types.ObjectId(), classId: switchClassId
    }).setOptions({ bypassTenantFilter: true })).toBe(0);
    expect(await ExternalMeetingModel.countDocuments({ tenantId, classId: switchClassId })).toBe(1);
  });

  providers.forEach((provider) => {
    describe(`Provider Matrix Lifecycle: ${provider}`, () => {
      let classDocId: mongoose.Types.ObjectId;

      it(`creates and synchronizes ${provider} meeting for canonical class`, async () => {
        classDocId = new mongoose.Types.ObjectId();
        await ClassModel.create({
          _id: classDocId,
          tenantId,
          branchId,
          batchId,
          courseId,
          instructorId,
          name: `${provider} Matrix Class`,
          classCode: `CLS-${provider.slice(0, 4)}`,
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

        const meeting = await LiveClassOrchestratorService.createMeetingForClass(
          tenantId.toString(),
          classDocId.toString(),
          { provider, topic: `${provider} Class Demo` },
          actor
        );

        expect(meeting.classId).toBe(classDocId.toString());
        expect(meeting.provider).toBe(provider);
        expect(meeting.joinUrl).toBeDefined();
        expect(meeting.syncStatus).toBe('SYNCED');
      });

      it(`reschedules ${provider} meeting safely when canonical class time updates`, async () => {
        const cls = await ClassModel.findById(classDocId);
        expect(cls).toBeDefined();

        cls!.scheduledStartAt = new Date(Date.now() + 10800000);
        cls!.scheduledEndAt = new Date(Date.now() + 14400000);
        cls!.scheduleRevision += 1;
        await cls!.save();

        const updatedMeeting = await LiveClassOrchestratorService.rescheduleMeetingForClass(
          tenantId.toString(),
          classDocId.toString(),
          actor
        );

        expect(updatedMeeting).toBeDefined();
        expect(updatedMeeting?.syncStatus).toBe('SYNCED');
        expect(new Date(updatedMeeting!.scheduledStart).getTime()).toBe(cls!.scheduledStartAt.getTime());
      });

      it(`cancels ${provider} meeting when canonical class is cancelled`, async () => {
        const cancelled = await LiveClassOrchestratorService.cancelMeetingForClass(
          tenantId.toString(),
          classDocId.toString(),
          'Inclement weather',
          actor
        );

        expect(cancelled).toBe(true);

        const meetingDoc = await ExternalMeetingModel.findOne({ tenantId, classId: classDocId.toString() });
        expect(meetingDoc?.providerStatus).toBe('CANCELLED');
      });
    });
  });

  describe('Concurrency Proofs: 10 Concurrent Create Requests across all 3 Providers', () => {
    const matrixProviders: IntegrationProvider[] = ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'];

    matrixProviders.forEach((prov) => {
      it(`creates exactly 1 logical ExternalMeeting record for ${prov} under 10 concurrent requests`, async () => {
        const raceClassId = new mongoose.Types.ObjectId();
        await ClassModel.create({
          _id: raceClassId,
          tenantId,
          branchId,
          batchId,
          courseId,
          instructorId,
          name: `Concurrent Create Race ${prov}`,
          classCode: `CLS-${prov.slice(0, 3)}-RACE`,
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

        // 10 simultaneous create requests
        const promises = Array.from({ length: 10 }).map(() =>
          LiveClassOrchestratorService.createMeetingForClass(
            tenantId.toString(),
            raceClassId.toString(),
            { provider: prov },
            actor
          )
        );

        const results = await Promise.all(promises);
        expect(results.length).toBe(10);

        // Verify all results converge to same meeting ID
        const firstMeetingId = results[0].externalMeetingId;
        results.forEach((r) => expect(r.externalMeetingId).toBe(firstMeetingId));

        // Verify exactly ONE record exists in DB
        const count = await ExternalMeetingModel.countDocuments({
          tenantId,
          classId: raceClassId
        });
        expect(count).toBe(1);
      });
    });
  });

  describe('Cancel vs Reschedule Race Concurrency Proof', () => {
    it('ensures canonical cancellation wins over pending reschedule, denying join and preventing resurrection', async () => {
      const raceClassId = new mongoose.Types.ObjectId();
      const initialStart = new Date(Date.now() + 3600000);
      const initialEnd = new Date(Date.now() + 7200000);

      await ClassModel.create({
        _id: raceClassId,
        tenantId,
        branchId,
        batchId,
        courseId,
        instructorId,
        name: 'Cancel vs Reschedule Race Class',
        classCode: 'CLS-CR-RACE',
        scheduledStartAt: initialStart,
        scheduledEndAt: initialEnd,
        startDate: initialStart,
        endDate: initialEnd,
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
        daysOfWeek: [],
        showOnWebsite: false
      });

      await LiveClassOrchestratorService.createMeetingForClass(
        tenantId.toString(),
        raceClassId.toString(),
        { provider: 'GOOGLE_MEET' },
        actor
      );

      // Race: Canonical cancel Class AND attempt to run reschedule concurrently
      const cls = await ClassModel.findById(raceClassId);
      cls!.status = 'CANCELLED';
      await cls!.save();

      const [cancelResult, rescheduleResult] = await Promise.all([
        LiveClassOrchestratorService.cancelMeetingForClass(
          tenantId.toString(),
          raceClassId.toString(),
          'Weather cancel',
          actor
        ),
        LiveClassOrchestratorService.rescheduleMeetingForClass(
          tenantId.toString(),
          raceClassId.toString(),
          actor
        )
      ]);

      expect(cancelResult).toBe(true);

      // Verify external meeting converges to CANCELLED
      const finalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId: raceClassId.toString() });
      expect(finalMeeting?.providerStatus).toBe('CANCELLED');

      // Verify student join is DENIED immediately (zero resurrection)
      const studentActor = {
        userId: student1Id.toString(),
        roles: ['STUDENT'],
        isHqActor: false,
        isSuperAdmin: false
      };

      await expect(
        LiveClassOrchestratorService.getAuthorizedJoinInfo(tenantId.toString(), raceClassId.toString(), studentActor)
      ).rejects.toThrow(/cancelled/i);
    });
  });

  describe('Participant & Attendance Evidence Resolution Matrix', () => {
    it('safely resolves mapped students, aggregates reconnects, isolates unknown participants, and does not mutate finalized attendance', async () => {
      const evidenceClassId = new mongoose.Types.ObjectId();
      await ClassModel.create({
        _id: evidenceClassId,
        tenantId,
        branchId,
        batchId,
        courseId,
        instructorId,
        name: 'Attendance Evidence Class',
        classCode: 'CLS-EVID-1',
        scheduledStartAt: new Date(Date.now() - 7200000),
        scheduledEndAt: new Date(Date.now() - 3600000),
        startDate: new Date(Date.now() - 7200000),
        endDate: new Date(Date.now() - 3600000),
        status: 'COMPLETED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 2,
        enrolledStudents: [],
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
        daysOfWeek: [],
        showOnWebsite: false
      });

      await ExternalMeetingModel.create({
        tenantId,
        branchId,
        classId: evidenceClassId.toString(),
        provider: 'GOOGLE_MEET',
        connectionId: connections.GOOGLE_MEET,
        organizerUserId: instructorId.toString(),
        externalMeetingId: 'meet-evidence-test-123',
        joinUrl: 'https://meet.google.com/test-123',
        providerStatus: 'COMPLETED',
        scheduledStart: new Date(Date.now() - 7200000),
        scheduledEnd: new Date(Date.now() - 3600000),
        timezone: 'UTC',
        syncStatus: 'SYNCED'
      });

      const adapter = IntegrationProviderRegistry.getDeterministicLiveAdapter('GOOGLE_MEET');
      adapter.participantEvidenceFixture = [
        // 1. Mapped active student Alice
        {
          participantExternalId: 'part_alice_1',
          displayName: 'Alice Student',
          email: 'student1@matrix.edu',
          joinTime: new Date(Date.now() - 7000000),
          durationMinutes: 30
        },
        // 2. Alice reconnect session (should aggregate / map safely)
        {
          participantExternalId: 'part_alice_2',
          displayName: 'Alice Student',
          email: 'student1@matrix.edu',
          joinTime: new Date(Date.now() - 5000000),
          durationMinutes: 25
        },
        // 3. Unknown external participant
        {
          participantExternalId: 'part_unknown',
          displayName: 'Guest Hacker',
          email: 'stranger@external.com',
          joinTime: new Date(Date.now() - 7000000),
          durationMinutes: 10
        },
        // 4. Duplicate display name with unmapped email
        {
          participantExternalId: 'part_impostor',
          displayName: 'Alice Student',
          email: 'alice.fake@other.com',
          joinTime: new Date(Date.now() - 6000000),
          durationMinutes: 15
        },
        // 5. Instructor participant
        {
          participantExternalId: 'part_instructor',
          displayName: 'Matrix Instructor',
          email: 'instructor@matrix.edu',
          joinTime: new Date(Date.now() - 7200000),
          durationMinutes: 60
        }
      ];

      const evidenceList = await LiveClassOrchestratorService.syncAttendanceEvidence(
        tenantId.toString(),
        evidenceClassId.toString(),
        actor
      );

      expect(evidenceList.length).toBe(5);

      // Check Alice sessions resolved to Alice student ID
      const aliceSessions = evidenceList.filter((e) => e.email === 'student1@matrix.edu');
      expect(aliceSessions.length).toBe(2);
      aliceSessions.forEach((s) => {
        expect(s.resolvedStudentId).toBe(student1Id.toString());
        expect(s.resolutionStatus).toBe('RESOLVED');
      });

      // Check unknown participant remains UNRESOLVED
      const unknownSession = evidenceList.find((e) => e.email === 'stranger@external.com');
      expect(unknownSession).toBeDefined();
      expect(unknownSession?.resolvedStudentId).toBeNull();
      expect(unknownSession?.resolutionStatus).toBe('UNRESOLVED');

      // Check duplicate name with fake email is NOT mapped to Alice
      const impostorSession = evidenceList.find((e) => e.email === 'alice.fake@other.com');
      expect(impostorSession).toBeDefined();
      expect(impostorSession?.resolvedStudentId).toBeNull();
      expect(impostorSession?.resolutionStatus).toBe('UNRESOLVED');
    });
  });
});
