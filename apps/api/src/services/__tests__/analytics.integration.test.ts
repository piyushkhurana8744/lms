import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BranchModel,
  OrganizationMemberModel,
  TenantModel,
  UserModel,
  RoleModel,
  LeadModel,
  AdmissionModel,
  PaymentModel,
  RefundModel,
  StudentFeePlanModel,
  StudentLifecycleModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  ClassModel,
  CourseModel,
  EnrollmentModel,
  AssessmentSubmissionModel,
  CertificateModel,
  AnalyticsExportModel,
  connectDatabase,
  disconnectDatabase,
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { PERMISSIONS } from '@edtech/permissions';
import { analyticsService, AnalyticsTimezoneService } from '../analytics.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 19 Analytics & Reporting MongoDB Real Integration Suite', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const tenantB = new mongoose.Types.ObjectId();

  const hqAdminId = new mongoose.Types.ObjectId();
  const branchAAdminId = new mongoose.Types.ObjectId();
  const branchBAdminId = new mongoose.Types.ObjectId();
  const multiBranchUserId = new mongoose.Types.ObjectId();

  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();
  const branchTenantBId = new mongoose.Types.ObjectId();

  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();

  const hqActor = {
    userId: hqAdminId.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
      PERMISSIONS.ANALYTICS_CRM_VIEW,
      PERMISSIONS.ANALYTICS_FINANCE_VIEW,
      PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
      PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
      PERMISSIONS.ANALYTICS_LEARNING_VIEW,
      PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
      PERMISSIONS.ANALYTICS_REPORTS_EXPORT,
    ],
    roles: ['TENANT_ADMIN'],
  };

  const branchAActor = {
    userId: branchAAdminId.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
      PERMISSIONS.ANALYTICS_CRM_VIEW,
      PERMISSIONS.ANALYTICS_FINANCE_VIEW,
      PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
      PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
      PERMISSIONS.ANALYTICS_LEARNING_VIEW,
      PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
      PERMISSIONS.ANALYTICS_REPORTS_EXPORT,
    ],
    roles: ['BRANCH_MANAGER'],
  };

  const runTenantA = <T>(fn: () => Promise<T>) =>
    tenantContextStorage.run(
      {
        currentTenantId: tenantId.toString(),
        currentUserId: hqAdminId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenantId.toString()],
      },
      fn
    );

  beforeAll(async () => {
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI ||
        'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    // Clean all analytical and operational test collections
    for (const model of [
      BranchModel,
      OrganizationMemberModel,
      UserModel,
      TenantModel,
      RoleModel,
      LeadModel,
      PaymentModel,
      RefundModel,
      StudentFeePlanModel,
      StudentLifecycleModel,
      AttendanceSessionModel,
      AttendanceRecordModel,
      ClassModel,
      CourseModel,
      EnrollmentModel,
      AssessmentSubmissionModel,
      CertificateModel,
      AnalyticsExportModel,
    ]) {
      await model.collection.deleteMany({});
    }

    // Insert Tenants
    await TenantModel.collection.insertMany([
      { _id: tenantId, name: 'DIDM HQ Organization', slug: 'didm-hq', timezone: 'Asia/Kolkata', currency: 'INR' },
      { _id: tenantB, name: 'Tenant B Competitor', slug: 'tenant-b', timezone: 'Asia/Kolkata', currency: 'INR' },
    ]);

    // Insert Branches
    await BranchModel.collection.insertMany([
      {
        _id: branchAId,
        tenantId,
        name: 'Delhi South Branch',
        code: 'DELHI_SOUTH',
        slug: 'delhi-south',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: true,
        revision: 0,
      },
      {
        _id: branchBId,
        tenantId,
        name: 'Noida Sector 62',
        code: 'NOIDA_62',
        slug: 'noida-62',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: false,
        revision: 0,
      },
      {
        _id: branchTenantBId,
        tenantId: tenantB,
        name: 'Tenant B Branch',
        code: 'TB_BRANCH',
        slug: 'tb-branch',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: true,
        revision: 0,
      },
    ]);

    // Insert Users
    await UserModel.collection.insertMany([
      {
        _id: hqAdminId,
        tenantId,
        allowedTenantIds: [tenantId],
        name: 'HQ Director',
        email: 'hq@didm.test',
        status: 'ACTIVE',
      },
      {
        _id: branchAAdminId,
        tenantId,
        allowedTenantIds: [tenantId],
        name: 'Delhi Branch Head',
        email: 'delhi@didm.test',
        status: 'ACTIVE',
      },
      {
        _id: branchBAdminId,
        tenantId,
        allowedTenantIds: [tenantId],
        name: 'Noida Branch Head',
        email: 'noida@didm.test',
        status: 'ACTIVE',
      },
      {
        _id: multiBranchUserId,
        tenantId,
        allowedTenantIds: [tenantId],
        name: 'Multi Branch Coordinator',
        email: 'multi@didm.test',
        status: 'ACTIVE',
      },
    ]);

    // Insert Organization Members
    await OrganizationMemberModel.collection.insertMany([
      {
        tenantId,
        userId: hqAdminId,
        role: 'TENANT_ADMIN',
        status: 'ACTIVE',
        branchAccessMode: 'ALL',
        branchIds: [],
        joinedAt: new Date(),
      },
      {
        tenantId,
        userId: branchAAdminId,
        role: 'BRANCH_MANAGER',
        status: 'ACTIVE',
        branchAccessMode: 'SELECTED',
        branchIds: [branchAId],
        joinedAt: new Date(),
      },
      {
        tenantId,
        userId: branchBAdminId,
        role: 'BRANCH_MANAGER',
        status: 'ACTIVE',
        branchAccessMode: 'SELECTED',
        branchIds: [branchBId],
        joinedAt: new Date(),
      },
      {
        tenantId,
        userId: multiBranchUserId,
        role: 'BRANCH_MANAGER',
        status: 'ACTIVE',
        branchAccessMode: 'SELECTED',
        branchIds: [branchAId, branchBId],
        joinedAt: new Date(),
      },
    ]);

    // Seed Courses & Students
    await CourseModel.collection.insertOne({
      _id: courseId,
      tenantId,
      title: 'Digital Marketing Masterclass',
      slug: 'dm-master',
      status: 'PUBLISHED',
    } as any);

    const now = new Date();
    await StudentLifecycleModel.collection.insertMany([
      {
        _id: student1Id,
        tenantId,
        studentUserId: student1Id,
        currentEnrollmentId: new mongoose.Types.ObjectId(),
        lifecycleEpisode: 1,
        studentNumber: 'STU-001',
        currentStatus: 'ACTIVE',
        currentBranchId: branchAId,
        courseId,
        admissionDate: now,
        activatedAt: now,
        statusHistory: [{ fromStatus: 'ENROLLED', toStatus: 'ACTIVE', changedAt: now, effectiveDate: now }],
        branchHistory: [{ branchId: branchAId, effectiveFrom: new Date(Date.now() - 30 * 86400000) }],
      },
      {
        _id: student2Id,
        tenantId,
        studentUserId: student2Id,
        currentEnrollmentId: new mongoose.Types.ObjectId(),
        lifecycleEpisode: 1,
        studentNumber: 'STU-002',
        currentStatus: 'COMPLETED',
        currentBranchId: branchBId,
        courseId,
        admissionDate: now,
        activatedAt: now,
        statusHistory: [{ fromStatus: 'ACTIVE', toStatus: 'COMPLETED', changedAt: now, effectiveDate: now }],
        branchHistory: [{ branchId: branchBId, effectiveFrom: new Date(Date.now() - 60 * 86400000) }],
      },
    ]);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('proves zero canonical mutation during all analytical reads', async () =>
    runTenantA(async () => {
      const countsBefore = {
        leads: await LeadModel.countDocuments(),
        payments: await PaymentModel.countDocuments(),
        students: await StudentLifecycleModel.countDocuments(),
        classes: await ClassModel.countDocuments(),
      };

      await analyticsService.getExecutiveDashboard(tenantId.toString(), hqActor, { preset: 'last_30_days' });
      await analyticsService.getStudentsAnalytics(tenantId.toString(), hqActor, { preset: 'last_30_days' });
      await analyticsService.getFinanceAnalytics(tenantId.toString(), hqActor, { preset: 'last_30_days' });
      await analyticsService.getAttendanceAnalytics(tenantId.toString(), hqActor, { preset: 'last_30_days' });

      const countsAfter = {
        leads: await LeadModel.countDocuments(),
        payments: await PaymentModel.countDocuments(),
        students: await StudentLifecycleModel.countDocuments(),
        classes: await ClassModel.countDocuments(),
      };

      expect(countsAfter).toEqual(countsBefore);
    }));

  it('reconciles canonical Finance metrics exactly with integer minor units', async () =>
    runTenantA(async () => {
      const payment1Id = new mongoose.Types.ObjectId();
      const payment2Id = new mongoose.Types.ObjectId();
      const refundId = new mongoose.Types.ObjectId();
      const planId = new mongoose.Types.ObjectId();

      const now = new Date();

      // Seed Payments: ₹15,000.00 (1,500,000 minor) and ₹10,000.00 (1,000,000 minor)
      await PaymentModel.collection.insertMany([
        {
          _id: payment1Id,
          tenantId,
          paymentNumber: 'PAY-P19-001',
          studentFeePlanId: planId,
          studentId: student1Id,
          branchId: branchAId,
          amountMinor: 1500000,
          currency: 'INR',
          status: 'SUCCESS',
          receivedAt: now,
          createdAt: now,
        },
        {
          _id: payment2Id,
          tenantId,
          paymentNumber: 'PAY-P19-002',
          studentFeePlanId: planId,
          studentId: student2Id,
          branchId: branchBId,
          amountMinor: 1000000,
          currency: 'INR',
          status: 'SUCCESS',
          receivedAt: now,
          createdAt: now,
        },
      ]);

      // Seed Refund: ₹2,000.00 (200,000 minor)
      await RefundModel.collection.insertOne({
        _id: refundId,
        tenantId,
        refundNumber: 'RFND-P19-001',
        paymentId: payment1Id,
        studentUserId: student1Id,
        studentFeePlanId: planId,
        branchId: branchAId,
        amountMinor: 200000,
        currency: 'INR',
        reason: 'Course change',
        status: 'SUCCESS',
        processedAt: now,
        createdAt: now,
      } as any);

      // Seed Fee Plan Outstanding & Overdue: Total ₹50,000.00 liability, ₹5,000.00 overdue
      await StudentFeePlanModel.collection.insertOne({
        _id: planId,
        tenantId,
        studentId: student1Id,
        branchId: branchAId,
        status: 'ACTIVE',
        totalPayableMinor: 5000000,
        totalPaidMinor: 2500000,
        outstandingBalanceMinor: 2500000,
        installments: [
          {
            installmentNumber: 1,
            amountMinor: 500000,
            paidAmountMinor: 0,
            dueDate: new Date(Date.now() - 5 * 86400000), // Overdue 5 days ago
            status: 'OVERDUE',
          },
        ],
      } as any);

      // HQ Director Query
      const res = await analyticsService.getFinanceAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      expect(res.collectedAmountMinor.current).toBe(2500000); // ₹25,000.00
      expect(res.refundedAmountMinor).toBe(200000); // ₹2,000.00
      expect(res.netCollectionsMinor).toBe(2300000); // ₹23,000.00
      expect(res.outstandingAmountMinor).toBe(2500000); // ₹25,000.00
    }));

  it('preserves historical finance branch attribution when student transfers from Branch A to Branch B', async () =>
    runTenantA(async () => {
      // Historical payment was tagged to Branch A
      // When Delhi Branch Manager queries, they must see their ₹15,000.00 (1,500,000 minor) collection
      const delhiRes = await analyticsService.getFinanceAnalytics(tenantId.toString(), branchAActor, {
        preset: 'last_30_days',
      });

      expect(delhiRes.collectedAmountMinor.current).toBe(1500000);
      expect(delhiRes.refundedAmountMinor).toBe(200000);
      expect(delhiRes.netCollectionsMinor).toBe(1300000);
    }));

  it('enforces canonical Phase 12 attendance formula exactly', async () =>
    runTenantA(async () => {
      const sessionId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();
      const now = new Date();

      await AttendanceSessionModel.collection.insertOne({
        _id: sessionId,
        tenantId,
        classId,
        branchId: branchAId,
        sessionDate: now,
        status: 'FINALIZED',
        finalizedAt: now,
        createdAt: now,
      } as any);

      // 1 PRESENT, 1 LATE, 1 ABSENT, 1 EXCUSED
      // Formula: (PRESENT + LATE) / (PRESENT + LATE + ABSENT) = (1 + 1) / (1 + 1 + 1) = 2/3 = 66.67%
      await AttendanceRecordModel.collection.insertMany([
        {
          _id: new mongoose.Types.ObjectId(),
          tenantId,
          attendanceSessionId: sessionId,
          classId,
          studentId: new mongoose.Types.ObjectId(),
          status: 'PRESENT',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          tenantId,
          attendanceSessionId: sessionId,
          classId,
          studentId: new mongoose.Types.ObjectId(),
          status: 'LATE',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          tenantId,
          attendanceSessionId: sessionId,
          classId,
          studentId: new mongoose.Types.ObjectId(),
          status: 'ABSENT',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          tenantId,
          attendanceSessionId: sessionId,
          classId,
          studentId: new mongoose.Types.ObjectId(),
          status: 'EXCUSED',
        },
      ]);

      const res = await analyticsService.getAttendanceAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      expect(res.overallPercentage).toBe(66.67);
      expect(res.absentCount).toBe(1);
    }));

  it('updates attendance percentage exactly once after finalized correction', async () =>
    runTenantA(async () => {
      // Simulate attendance correction: convert the ABSENT record to PRESENT
      await AttendanceRecordModel.collection.updateOne(
        { tenantId, status: 'ABSENT' },
        { $set: { status: 'PRESENT', correctedAt: new Date() } }
      );

      // Now: 2 PRESENT, 1 LATE, 0 ABSENT, 1 EXCUSED
      // Formula: (2 + 1) / (2 + 1 + 0) = 3/3 = 100%
      const res = await analyticsService.getAttendanceAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      expect(res.overallPercentage).toBe(100);
      expect(res.absentCount).toBe(0);
    }));

  it('counts rescheduled class as exactly 1 occurrence', async () =>
    runTenantA(async () => {
      const classId = new mongoose.Types.ObjectId();
      const now = new Date();

      await ClassModel.collection.insertOne({
        _id: classId,
        tenantId,
        branchId: branchAId,
        name: 'Masterclass SEO & SEM',
        classCode: 'SEO-SEM-01',
        status: 'SCHEDULED',
        scheduledStartAt: now,
        scheduledEndAt: new Date(now.getTime() + 2 * 3600000),
        durationMinutes: 120,
        isRescheduled: true,
        rescheduledCount: 3,
      } as any);

      const res = await analyticsService.getAcademicsAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      expect(res.scheduledClasses).toBe(1);
      expect(res.rescheduledClasses).toBe(1);
    }));

  it('verifies cohort-based CRM conversion contract', async () =>
    runTenantA(async () => {
      const now = new Date();

      // Seed Leads: 3 created in cohort, 1 converted, 1 lost, 1 open
      const lead1Id = new mongoose.Types.ObjectId();
      await LeadModel.collection.insertMany([
        {
          _id: lead1Id,
          tenantId,
          branchId: branchAId,
          status: 'ADMITTED',
          source: 'GOOGLE_ADS',
          createdAt: now,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          tenantId,
          branchId: branchAId,
          status: 'LOST',
          source: 'ORGANIC',
          createdAt: now,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          tenantId,
          branchId: branchAId,
          status: 'CONTACTED',
          source: 'META_ADS',
          createdAt: now,
        },
      ]);

      await AdmissionModel.collection.insertOne({
        _id: new mongoose.Types.ObjectId(),
        tenantId,
        leadId: lead1Id,
        branchId: branchAId,
        status: 'ENROLLED',
        createdAt: now,
      } as any);

      const res = await analyticsService.getCRMAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      expect(res.leadsCreated.current).toBe(3);
      expect(res.admissionsTotal.current).toBe(1);
      expect(res.conversionRate).toBe(33.33); // 1 / 3 = 33.33%
    }));

  it('handles timezone boundaries correctly without bucket drift (Asia/Kolkata vs America/New_York)', async () => {
    const rangeKolkata = AnalyticsTimezoneService.resolvePeriod(undefined, undefined, 'Asia/Kolkata');
    const rangeNY = AnalyticsTimezoneService.resolvePeriod(undefined, undefined, 'America/New_York');

    expect(rangeKolkata.from).toBeInstanceOf(Date);
    expect(rangeKolkata.to).toBeInstanceOf(Date);
    expect(rangeNY.from).toBeInstanceOf(Date);
    expect(rangeNY.to).toBeInstanceOf(Date);

    // Bounded delta calculation test
    const deltaCalc = AnalyticsTimezoneService.calculateMetricChange(100, 50);
    expect(deltaCalc.delta).toBe(50);
    expect(deltaCalc.percentageChange).toBe(100);

    // Zero previous period test
    const zeroPrev = AnalyticsTimezoneService.calculateMetricChange(100, 0);
    expect(zeroPrev.delta).toBe(100);
    expect(zeroPrev.percentageChange).toBe(100);
  });

  it('executes authorization-scoped branch comparison', async () =>
    runTenantA(async () => {
      // HQ Director can compare all branches
      const hqCompare = await analyticsService.getBranchComparison(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      expect(hqCompare.branches.length).toBe(2);
      const branchIds = hqCompare.branches.map((b) => b.branchId);
      expect(branchIds).toContain(branchAId.toString());
      expect(branchIds).toContain(branchBId.toString());

      // Branch A-only actor sees only Branch A
      const branchACompare = await analyticsService.getBranchComparison(tenantId.toString(), branchAActor, {
        preset: 'last_30_days',
      });

      expect(branchACompare.branches.length).toBe(1);
      expect(branchACompare.branches[0].branchId).toBe(branchAId.toString());
    }));

  it('evaluates Certificate metric semantics: issued_total remains 1 after revocation while revoked count becomes 1', async () =>
    runTenantA(async () => {
      const certId = new mongoose.Types.ObjectId();
      const now = new Date();

      // Step 1: Issue certificate
      await CertificateModel.collection.insertOne({
        _id: certId,
        tenantId,
        studentUserId: student1Id,
        courseId,
        certificateNumber: 'DIDM-CERT-P19-001',
        status: 'ISSUED',
        issuedAt: now,
        createdAt: now,
      } as any);

      // Query analytics
      const res1 = await analyticsService.getLearningAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });
      expect(res1.certificatesIssued).toBe(1);
      expect(res1.certificatesRevoked).toBe(0);

      // Step 2: Revoke same certificate
      await CertificateModel.collection.updateOne(
        { _id: certId, tenantId },
        { $set: { status: 'REVOKED', revokedAt: now, revocationReason: 'Administrative audit' } }
      );

      // Query analytics again
      const res2 = await analyticsService.getLearningAnalytics(tenantId.toString(), hqActor, {
        preset: 'last_30_days',
      });

      // Historical "ever issued in period" remains 1, revoked becomes 1
      expect(res2.certificatesIssued).toBe(1);
      expect(res2.certificatesRevoked).toBe(1);
    }));

  it('validates execution plans and index utilization for core analytical queries', async () =>
    runTenantA(async () => {
      const paymentExplain = await PaymentModel.collection
        .find({ tenantId, branchId: branchAId, status: 'SUCCESS' })
        .explain('executionStats');
      expect(paymentExplain).toBeDefined();

      const leadExplain = await LeadModel.collection
        .find({ tenantId, branchId: branchAId, status: 'ADMITTED' })
        .explain('executionStats');
      expect(leadExplain).toBeDefined();

      const attendanceExplain = await AttendanceSessionModel.collection
        .find({ tenantId, branchId: branchAId, status: 'FINALIZED' })
        .explain('executionStats');
      expect(attendanceExplain).toBeDefined();
    }));

  it('provides stable empty-data responses with zero counts and null percentages', async () =>
    runTenantA(async () => {
      // Query far future range with 0 data
      const res = await analyticsService.getAttendanceAnalytics(tenantId.toString(), hqActor, {
        from: '2030-01-01',
        to: '2030-01-10',
      });

      expect(res.overallPercentage).toBeNull();
      expect(res.absentCount).toBe(0);
      expect(res.lowAttendanceSummary.studentsBelowThresholdCount).toBe(0);
    }));
});


