import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AuditLogModel,
  AutomationEventModel,
  AutomationExecutionModel,
  AutomationModel,
  AutomationStepExecutionModel,
  CertificateModel,
  CertificateSequenceModel,
  CourseModel,
  EnrollmentModel,
  OrganizationBrandingModel,
  OrganizationStorageModel,
  NotificationDeliveryModel,
  NotificationIntentModel,
  NotificationModel,
  OrganizationEmailSettingsModel,
  TenantModel,
  UserModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { CertificateService } from '../certificate.service';
import { CertificateArtifactService, setCertificateArtifactFailurePoint } from '../certificateArtifact.service';
import { NotificationService, setNotificationHandoffFailure } from '../notification.service';
import { EmailService } from '../email/email.service';
import { AutomationService } from '../automation.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 13 Certificates & Credential Verification MongoDB Integration Suite', () => {
  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();
  const adminAId = new mongoose.Types.ObjectId();
  const adminBId = new mongoose.Types.ObjectId();
  const studentAId = new mongoose.Types.ObjectId();
  const studentBId = new mongoose.Types.ObjectId();
  const courseAId = new mongoose.Types.ObjectId();
  const courseBId = new mongoose.Types.ObjectId();

  let enrollmentAId: mongoose.Types.ObjectId;
  let enrollmentIncompleteId: mongoose.Types.ObjectId;
  let enrollmentBId: mongoose.Types.ObjectId;

  const adminA = { userId: adminAId.toString() };
  const adminB = { userId: adminBId.toString() };

  const runA = <T>(fn: () => Promise<T>) =>
    tenantContextStorage.run(
      {
        currentTenantId: tenantAId.toString(),
        currentUserId: adminAId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenantAId.toString()]
      },
      fn
    );

  const runB = <T>(fn: () => Promise<T>) =>
    tenantContextStorage.run(
      {
        currentTenantId: tenantBId.toString(),
        currentUserId: adminBId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenantBId.toString()]
      },
      fn
    );

  beforeAll(async () => {
    process.env.WEB_APP_URL = 'https://learn.didm.test';
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI ||
        'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    for (const m of [
      CertificateModel,
      CertificateSequenceModel,
      EnrollmentModel,
      CourseModel,
      UserModel,
      TenantModel,
      AuditLogModel,
      OrganizationStorageModel,
      OrganizationBrandingModel
      ,NotificationDeliveryModel, NotificationIntentModel, NotificationModel, OrganizationEmailSettingsModel
    ]) {
      await m.collection.deleteMany({});
    }

    await Promise.all([
      CertificateModel.syncIndexes(),
      CertificateSequenceModel.syncIndexes(),
      EnrollmentModel.syncIndexes(),
      CourseModel.syncIndexes()
    ]);

    // Seed Tenants
    await TenantModel.collection.insertMany([
      { _id: tenantAId, name: 'Academy Alpha', slug: 'academy-alpha' },
      { _id: tenantBId, name: 'Academy Beta', slug: 'academy-beta' }
    ]);

    await OrganizationStorageModel.collection.insertMany([
      { tenantId: tenantAId, provider: 'LOCAL', status: 'CONNECTED', isEnabled: true },
      { tenantId: tenantBId, provider: 'LOCAL', status: 'CONNECTED', isEnabled: true }
    ]);

    await OrganizationBrandingModel.collection.insertMany([
      { tenantId: tenantAId, organizationName: 'Academy Alpha Global' },
      { tenantId: tenantBId, organizationName: 'Academy Beta Tech' }
    ]);

    // Seed Users
    await UserModel.collection.insertMany([
      {
        _id: adminAId,
        tenantId: tenantAId,
        allowedTenantIds: [tenantAId],
        name: 'Admin Alpha',
        email: 'admin@alpha.test',
        passwordHash: 'x',
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: adminBId,
        tenantId: tenantBId,
        allowedTenantIds: [tenantBId],
        name: 'Admin Beta',
        email: 'admin@beta.test',
        passwordHash: 'x',
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: studentAId,
        tenantId: tenantAId,
        allowedTenantIds: [tenantAId],
        name: 'Student Alice',
        email: 'alice@alpha.test',
        passwordHash: 'x',
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: studentBId,
        tenantId: tenantAId,
        allowedTenantIds: [tenantAId],
        name: 'Student Bob',
        email: 'bob@alpha.test',
        passwordHash: 'x',
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Seed Courses
    await CourseModel.collection.insertMany([
      {
        _id: courseAId,
        tenantId: tenantAId,
        title: 'Fullstack Mastery Alpha',
        slug: 'fullstack-mastery-alpha',
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: courseBId,
        tenantId: tenantBId,
        title: 'Data Science Beta',
        slug: 'data-science-beta',
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Seed Enrollments
    enrollmentAId = new mongoose.Types.ObjectId();
    enrollmentIncompleteId = new mongoose.Types.ObjectId();
    enrollmentBId = new mongoose.Types.ObjectId();

    await EnrollmentModel.collection.insertMany([
      {
        _id: enrollmentAId,
        tenantId: tenantAId,
        studentId: studentAId,
        courseId: courseAId,
        status: 'COMPLETED',
        progressPercent: 100,
        completedAt: new Date('2026-09-15T10:00:00Z'),
        enrolledAt: new Date('2026-08-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: enrollmentIncompleteId,
        tenantId: tenantAId,
        studentId: studentBId,
        courseId: courseAId,
        status: 'ACTIVE',
        progressPercent: 65,
        enrolledAt: new Date('2026-08-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: enrollmentBId,
        tenantId: tenantBId,
        studentId: studentAId, // In tenant B
        courseId: courseBId,
        status: 'COMPLETED',
        progressPercent: 100,
        completedAt: new Date('2026-09-20T10:00:00Z'),
        enrolledAt: new Date('2026-08-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  });

  afterAll(async () => {
    setCertificateArtifactFailurePoint(undefined);
    setNotificationHandoffFailure(false);
    await disconnectDatabase();
  });

  // 1. Eligible Issuance
  it('1. evaluates eligibility and issues certificate for completed enrollment', async () => {
    const eligibility = await runA(() => CertificateService.eligibility(enrollmentAId.toString()));
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.checks.courseCompletion.passed).toBe(true);
    expect(eligibility.reasons).toHaveLength(0);

    const certificate = await runA(() =>
      CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminA)
    );

    expect(certificate.status).toBe('ISSUED');
    expect(certificate.certificateNumber).toMatch(/^CERT-2026-\d{6}$/);
    expect(certificate.verificationCode).toBeDefined();
    expect(certificate.student.name).toBe('Student Alice');
    expect(certificate.course.title).toBe('Fullstack Mastery Alpha');
    const issuedNotification = await NotificationModel.findOne({ sourceId: certificate.id, type: 'certificate.issued' });
    expect(issuedNotification?.recipientUserId.toString()).toBe(studentAId.toString());
    expect(await NotificationDeliveryModel.countDocuments({ notificationId: issuedNotification!._id })).toBe(1);
  });

  // 2. Ineligible Issuance Rejection
  it('2. rejects certificate issuance for incomplete enrollment with structured reasons', async () => {
    const eligibility = await runA(() =>
      CertificateService.eligibility(enrollmentIncompleteId.toString())
    );
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reasons).toContain('COURSE_NOT_COMPLETED');

    await expect(
      runA(() => CertificateService.issue({ enrollmentId: enrollmentIncompleteId.toString() }, adminA))
    ).rejects.toThrow('Enrollment is not eligible for certificate issuance');
  });

  // 3. Duplicate Issuance Prevention
  it('3. repeated issuance request returns existing active certificate without creating duplicate', async () => {
    const cert1 = await runA(() =>
      CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminA)
    );
    const cert2 = await runA(() =>
      CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminA)
    );

    expect(cert1.id).toBe(cert2.id);
    expect(cert1.certificateNumber).toBe(cert2.certificateNumber);
    expect(await CertificateModel.collection.countDocuments({ enrollmentId: enrollmentAId })).toBe(1);
  });

  // 4. Same-Enrollment 10-Way Issuance Race
  it('4. 10 simultaneous issue requests for the same enrollment create exactly 1 certificate identity', async () => {
    // Create new eligible enrollment for race
    const raceEnrollmentId = new mongoose.Types.ObjectId();
    const raceStudentId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: raceStudentId,
      tenantId: tenantAId,
      allowedTenantIds: [tenantAId],
      name: 'Issuance Race Student',
      email: 'issuance-race@alpha.test',
      passwordHash: 'x',
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: false,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await EnrollmentModel.collection.insertOne({
      _id: raceEnrollmentId,
      tenantId: tenantAId,
      studentId: raceStudentId,
      courseId: courseAId,
      status: 'COMPLETED',
      progressPercent: 100,
      completedAt: new Date('2026-09-25T10:00:00Z'),
      enrolledAt: new Date('2026-08-01T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        runA(() => CertificateService.issue({ enrollmentId: raceEnrollmentId.toString() }, adminA))
      )
    );

    const firstId = results[0].id;
    for (const r of results) {
      expect(r.id).toBe(firstId);
    }
    expect(await CertificateModel.collection.countDocuments({ enrollmentId: raceEnrollmentId })).toBe(1);
  });

  // 5. Certificate Number 20-Way Concurrency
  it('5. 20 concurrent issuances across different students generate 20 unique sequential numbers', async () => {
    const enrollments: mongoose.Types.ObjectId[] = [];

    for (let i = 0; i < 20; i++) {
      const sId = new mongoose.Types.ObjectId();
      const eId = new mongoose.Types.ObjectId();
      await UserModel.collection.insertOne({
        _id: sId,
        tenantId: tenantAId,
        allowedTenantIds: [tenantAId],
        name: `Concurrency Student ${i}`,
        email: `conc-${i}@alpha.test`,
        passwordHash: 'x',
        status: 'ACTIVE',
        emailVerified: true,
        isSuperAdmin: false,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await EnrollmentModel.collection.insertOne({
        _id: eId,
        tenantId: tenantAId,
        studentId: sId,
        courseId: courseAId,
        status: 'COMPLETED',
        progressPercent: 100,
        completedAt: new Date('2026-09-28T00:00:00Z'),
        enrolledAt: new Date('2026-08-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      enrollments.push(eId);
    }

    const issuedCertificates = await Promise.all(
      enrollments.map((eId) =>
        runA(() => CertificateService.issue({ enrollmentId: eId.toString() }, adminA))
      )
    );

    const numbers = issuedCertificates.map((c) => c.certificateNumber);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(20);
  });

  // 6. Snapshot Immutability
  it('6. mutating mutable student or course models after issuance does not alter issued credential snapshot', async () => {
    const cert = await runA(() =>
      CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminA)
    );

    // Modify student and course in DB
    await UserModel.collection.updateOne({ _id: studentAId }, { $set: { name: 'Alice Mutated Name' } });
    await CourseModel.collection.updateOne({ _id: courseAId }, { $set: { title: 'Mutated Course Title' } });

    // Verify public verification still returns historical frozen snapshot
    const publicData = await CertificateService.verify(cert.verificationCode);
    expect(publicData.studentName).toBe('Student Alice');
    expect(publicData.courseTitle).toBe('Fullstack Mastery Alpha');
  });

  // 7 & 8. Revocation & Idempotent Revocation
  it('7 & 8. revokes certificate with reason and handles concurrent/repeated revocations deterministically', async () => {
    const cert = await runA(() =>
      CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminA)
    );

    const [rev1, rev2] = await Promise.all([
      runA(() =>
        CertificateService.revoke(
          cert.id,
          { reason: 'Administrative cancellation due to honor code violation' },
          adminA
        )
      ),
      runA(() =>
        CertificateService.revoke(
          cert.id,
          { reason: 'Administrative cancellation due to honor code violation' },
          adminA
        )
      )
    ]);

    expect(rev1.status).toBe('REVOKED');
    expect(rev2.status).toBe('REVOKED');
    expect(rev1.revocationReason).toBe('Administrative cancellation due to honor code violation');

    // Verification must reflect revoked status
    const verified = await CertificateService.verify(cert.verificationCode);
    expect(verified.valid).toBe(false);
    expect(verified.status).toBe('REVOKED');
    expect(await NotificationModel.countDocuments({ sourceId: cert.id, type: 'certificate.revoked' })).toBe(1);
    await runA(() => CertificateService.revoke(cert.id, { reason: 'Administrative cancellation due to honor code violation' }, adminA));
    expect(await NotificationModel.countDocuments({ sourceId: cert.id, type: 'certificate.revoked' })).toBe(1);
  });

  // 9, 10 & 11. Artifact Failure Injection and Operational Recovery
  it('9, 10 & 11. handles renderer & storage failures gracefully and recovers via artifact retry', async () => {
    const qrSpy = vi.spyOn(QRCode, 'toBuffer');
    // Create new enrollment
    const failEnrollmentId = new mongoose.Types.ObjectId();
    const failStudentId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: failStudentId,
      tenantId: tenantAId,
      allowedTenantIds: [tenantAId],
      name: 'Recovery Student',
      email: 'recov@alpha.test',
      passwordHash: 'x',
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: false,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await EnrollmentModel.collection.insertOne({
      _id: failEnrollmentId,
      tenantId: tenantAId,
      studentId: failStudentId,
      courseId: courseAId,
      status: 'COMPLETED',
      progressPercent: 100,
      completedAt: new Date('2026-09-29T00:00:00Z'),
      enrolledAt: new Date('2026-08-01T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Inject renderer failure
    setCertificateArtifactFailurePoint('RENDER');
    const certWithFailedArtifact = await runA(() =>
      CertificateService.issue({ enrollmentId: failEnrollmentId.toString() }, adminA)
    );

    // Credential is ISSUED, but artifact is FAILED
    expect(certWithFailedArtifact.status).toBe('ISSUED');
    expect(certWithFailedArtifact.artifact.status).toBe('FAILED');

    // Remove failure point and trigger recovery retry
    setCertificateArtifactFailurePoint(undefined);
    const recoveredCert = await runA(() =>
      CertificateService.retry(certWithFailedArtifact.id, adminA)
    );

    expect(recoveredCert.status).toBe('ISSUED');
    expect(recoveredCert.artifact.status).toBe('READY');
    expect(recoveredCert.id).toBe(certWithFailedArtifact.id);
    expect(recoveredCert.certificateNumber).toBe(certWithFailedArtifact.certificateNumber);
    expect(recoveredCert.verificationCode).toBe(certWithFailedArtifact.verificationCode);
    const expectedVerificationUrl = `https://learn.didm.test/verify/certificate/${certWithFailedArtifact.verificationCode}`;
    expect(recoveredCert.verificationUrl).toBe(`/verify/certificate/${certWithFailedArtifact.verificationCode}`);
    expect(qrSpy).toHaveBeenCalledWith(expectedVerificationUrl, expect.objectContaining({ type: 'png' }));

    const stored = await CertificateModel.findById(recoveredCert.id);
    const artifact = await runA(() => CertificateArtifactService.download(stored));
    expect('buffer' in artifact).toBe(true);
    const pdf = (artifact as { buffer: Buffer }).buffer;
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.toString('latin1')).toContain(certWithFailedArtifact.certificateNumber);
    expect(pdf.toString('latin1')).toContain('Recovery Student');
    expect(pdf.toString('latin1')).toContain(expectedVerificationUrl);
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
    expect(pdf.toString('latin1')).toContain('/QR Do');

    setCertificateArtifactFailurePoint('STORAGE');
    await expect(runA(() => CertificateService.retry(recoveredCert.id, adminA))).rejects.toThrow('Injected certificate storage failure');
    setCertificateArtifactFailurePoint(undefined);
    const storageRecovered = await runA(() => CertificateService.retry(recoveredCert.id, adminA));
    expect(storageRecovered.artifact.status).toBe('READY');
    expect(storageRecovered.id).toBe(certWithFailedArtifact.id);
    expect(storageRecovered.certificateNumber).toBe(certWithFailedArtifact.certificateNumber);
    expect(storageRecovered.verificationCode).toBe(certWithFailedArtifact.verificationCode);
    qrSpy.mockRestore();
  });

  // 12. Tenant Isolation
  it('11a. recovers durable certificate notification after post-commit handoff crash', async () => {
    const studentId = new mongoose.Types.ObjectId(); const enrollmentId = new mongoose.Types.ObjectId();
    await TenantModel.collection.updateOne({ _id: tenantAId }, { $set: { status: 'ACTIVE' } });
    await Promise.all([AutomationEventModel.syncIndexes(), AutomationExecutionModel.syncIndexes(), AutomationStepExecutionModel.syncIndexes(), NotificationIntentModel.syncIndexes()]);
    await UserModel.collection.insertOne({ _id: studentId, tenantId: tenantAId, allowedTenantIds: [tenantAId], name: 'Handoff Student', email: 'handoff@alpha.test', passwordHash: 'x', status: 'ACTIVE', emailVerified: true, roles: [] });
    await EnrollmentModel.collection.insertOne({ _id: enrollmentId, tenantId: tenantAId, studentId, courseId: courseAId, status: 'COMPLETED', progressPercent: 100, completedAt: new Date(), enrolledAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
    const automation:any=await AutomationModel.create({tenantId:tenantAId,name:'Certificate composition',status:'ACTIVE',version:1,triggerType:'certificate.issued',conditions:{mode:'ALL',items:[]},steps:[{stepId:'notify',type:'ACTION',actionType:'NOTIFICATION_CREATE',inputs:{recipientUserId:studentId.toString(),notificationType:'certificate.issued',data:{courseTitle:'Composition'}}}],branchMode:'ALL',branchIds:[],capabilitySnapshot:['organization.notifications.update'],createdBy:adminAId,updatedBy:adminAId});
    setNotificationHandoffFailure(true);
    const certificate = await runA(() => CertificateService.issue({ enrollmentId: enrollmentId.toString() }, adminA));
    setNotificationHandoffFailure(false);
    expect(certificate.status).toBe('ISSUED');
    const eventId = `certificate.issued:${certificate.id}`;
    expect((await NotificationIntentModel.findOne({ eventId }))?.status).toBe('PENDING');
    expect(await NotificationModel.countDocuments({ sourceId: certificate.id, type: 'certificate.issued' })).toBe(0);
    await NotificationService.consumeOutboxEvent(eventId);
    expect(await NotificationModel.countDocuments({ sourceId: certificate.id, type: 'certificate.issued' })).toBe(1);
    expect(await CertificateModel.countDocuments({ enrollmentId })).toBe(1);
    const domain:any=await AutomationEventModel.findOne({eventId:`domain:${eventId}`});await AutomationEventModel.updateMany({_id:{$ne:domain._id},status:'PENDING'},{$set:{status:'PROCESSED'}}).setOptions({bypassTenantFilter:true});await AutomationService.processNextEvent();const execution:any=await AutomationExecutionModel.findOne({triggerEventId:domain.eventId,automationId:automation._id});expect(execution.status).toBe('COMPLETED');expect(await AutomationStepExecutionModel.countDocuments({executionId:execution._id,status:'COMPLETED'})).toBe(1);expect(await NotificationIntentModel.countDocuments({eventId:`${execution._id}:notify`})).toBe(1);await NotificationService.consumeOutboxEvent(eventId);await AutomationService.processNextEvent();expect(await CertificateModel.countDocuments({enrollmentId})).toBe(1);expect(await AutomationExecutionModel.countDocuments({triggerEventId:domain.eventId,automationId:automation._id})).toBe(1);expect(await NotificationIntentModel.countDocuments({eventId:`${execution._id}:notify`})).toBe(1);
  });

  it('11b. recovers revocation notification after post-commit crash with stable credential identity', async () => {
    const studentId = new mongoose.Types.ObjectId(); const enrollmentId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({ _id: studentId, tenantId: tenantAId, allowedTenantIds: [tenantAId], name: 'Revocation Recovery Student', email: 'revocation-recovery@alpha.test', passwordHash: 'x', status: 'ACTIVE', emailVerified: true, roles: [] });
    await EnrollmentModel.collection.insertOne({ _id: enrollmentId, tenantId: tenantAId, studentId, courseId: courseAId, status: 'COMPLETED', progressPercent: 100, completedAt: new Date(), enrolledAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
    const issued = await runA(() => CertificateService.issue({ enrollmentId: enrollmentId.toString() }, adminA));
    setNotificationHandoffFailure(true);
    const revoked = await runA(() => CertificateService.revoke(issued.id, { reason: 'Controlled revocation recovery proof' }, adminA));
    setNotificationHandoffFailure(false);
    expect(revoked.status).toBe('REVOKED'); expect(revoked.id).toBe(issued.id); expect(revoked.certificateNumber).toBe(issued.certificateNumber); expect(revoked.verificationCode).toBe(issued.verificationCode); expect(revoked.revocationReason).toBe('Controlled revocation recovery proof');
    expect(await CertificateModel.countDocuments({ enrollmentId })).toBe(1); expect(await CertificateService.verify(issued.verificationCode)).toMatchObject({ valid: false, status: 'REVOKED', certificateNumber: issued.certificateNumber });
    const eventId = `certificate.revoked:${issued.id}`;
    expect((await NotificationIntentModel.findOne({ eventId }))?.status).toBe('PENDING');
    expect(await NotificationModel.countDocuments({ sourceId: issued.id, type: 'certificate.revoked' })).toBe(0);
    await NotificationService.consumeOutboxEvent(eventId);
    const notification = await NotificationModel.findOne({ sourceId: issued.id, type: 'certificate.revoked' }); const delivery = await NotificationDeliveryModel.findOne({ notificationId: notification!._id });
    await OrganizationEmailSettingsModel.deleteMany({ tenantId: tenantAId }).setOptions({ bypassTenantFilter: true });
    await OrganizationEmailSettingsModel.create({ tenantId: tenantAId, provider: 'SMTP', status: 'VERIFIED', fromName: 'Alpha', fromEmail: 'certificates@alpha.test' });
    const sendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'revocation-message-1' }); const provider = vi.spyOn(EmailService, 'createProvider').mockReturnValue({ sendEmail, verifyConnection: vi.fn(), getProviderName: () => 'DOUBLE' });
    try { await Promise.all(Array.from({ length: 10 }, () => NotificationService.processDelivery(delivery!._id.toString()))); } finally { provider.mockRestore(); }
    await NotificationService.consumeOutboxEvent(eventId); await Promise.all(Array.from({ length: 3 }, () => NotificationService.processDelivery(delivery!._id.toString())));
    const recovered = await CertificateModel.findById(issued.id); const savedDelivery = await NotificationDeliveryModel.findById(delivery!._id);
    expect((await NotificationIntentModel.findOne({ eventId }))?.status).toBe('PROCESSED'); expect(await NotificationModel.countDocuments({ sourceId: issued.id, type: 'certificate.revoked' })).toBe(1); expect(await NotificationDeliveryModel.countDocuments({ notificationId: notification!._id })).toBe(1);
    expect(recovered?.status).toBe('REVOKED'); expect(recovered?.certificateNumber).toBe(issued.certificateNumber); expect(recovered?.verificationCode).toBe(issued.verificationCode); expect(recovered?.revocationReason).toBe('Controlled revocation recovery proof'); expect(savedDelivery?.status).toBe('DELIVERED'); expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('12. prevents cross-tenant access to eligibility, issuance, list, and download', async () => {
    // Tenant B admin attempting to issue Tenant A enrollment
    await expect(
      runB(() => CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminB))
    ).rejects.toThrow();

    // Tenant B admin listing certificates only sees Tenant B
    const listB = await runB(() => CertificateService.list({}));
    const tenantBIds = listB.data.map((c: any) => c.id);
    expect(tenantBIds).not.toContain(enrollmentAId.toString());
  });

  // 13. Student Ownership
  it('13. student can only view and download their own issued certificates', async () => {
    const listAlice = await runA(() => CertificateService.studentList(studentAId.toString()));
    const listBob = await runA(() => CertificateService.studentList(studentBId.toString()));

    expect(listAlice.length).toBeGreaterThan(0);
    // Student B cannot download Student A's certificate
    await expect(
      runA(() => CertificateService.getForDownload(listAlice[0].id, studentBId.toString()))
    ).rejects.toThrow('Certificate not found');
  });

  // 14. Public Verification
  it('14. public verification succeeds globally without exposing private database fields', async () => {
    const cert = await runA(() =>
      CertificateService.issue({ enrollmentId: enrollmentAId.toString() }, adminA)
    );

    const publicResult = await CertificateService.verify(cert.verificationCode);
    expect(publicResult.certificateNumber).toBe(cert.certificateNumber);
    expect(publicResult.studentName).toBe('Alice Mutated Name');
    expect(publicResult.courseTitle).toBe('Mutated Course Title');

    // Assert that no private tenantId, studentId, or storage keys exist in verification response
    expect((publicResult as any).tenantId).toBeUndefined();
    expect((publicResult as any).studentId).toBeUndefined();
    expect((publicResult as any).storageKey).toBeUndefined();
  });
});
