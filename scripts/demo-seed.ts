import mongoose, { Types } from 'mongoose';
import {
  TenantModel,
  BranchModel,
  AcademicRoomModel,
  RoleModel,
  UserModel,
  OrganizationMemberModel,
  OrganizationSettingsModel,
  OrganizationBrandingModel,
  OrganizationWebsiteModel,
  CourseModel,
  CourseModuleModel,
  LessonModel,
  BatchModel,
  StudentLifecycleModel,
  StudentLifecycleEventModel,
  EnrollmentModel,
  LessonProgressModel,
  AcademicCalendarModel,
  CalendarExceptionModel,
  TimetableModel,
  ClassModel,
  ExternalMeetingModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  AttendanceEvidenceModel,
  FeeStructureModel,
  StudentFeePlanModel,
  PaymentModel,
  FinancialLedgerModel,
  ReceiptModel,
  CertificateModel,
  NotificationModel,
  NotificationDeliveryModel,
  NotificationPreferenceModel,
  CommunicationAnnouncementModel,
  CommunicationConversationModel,
  CommunicationMessageModel,
  CommunicationReadStateModel,
  LeadModel,
  LeadActivityModel,
  LeadFollowUpModel,
  AdmissionModel,
  AutomationModel,
  AutomationExecutionModel,
  AutomationEventModel,
  IntegrationConnectionModel,
  IntegrationSyncRunModel,
  InstructorAvailabilityModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { hashPassword } from '@edtech/utils';
import {
  DEMO_ORG,
  DEMO_BRANCHES,
  DEMO_ROOMS,
  DEMO_USERS,
  DEMO_COURSES,
  DEMO_BATCHES,
  DEMO_CRM_LEADS
} from './demo-data';

// ==========================================
// 1. SAFETY & PRODUCTION GUARDS
// ==========================================
if (process.env.NODE_ENV === 'production') {
  console.error('\n❌ FATAL: Demo seed is strictly prohibited in PRODUCTION environment.');
  process.exit(1);
}

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGO_INTEGRATION_URI ||
  'mongodb://127.0.0.1:27017/edtech_lms?directConnection=true';

async function seed() {
  console.log('\n======================================================');
  console.log('🚀 DIDM LMS — COMPLETE REALISTIC DEMO ENVIRONMENT SEED');
  console.log('======================================================');
  console.log(`Connecting to database at: ${MONGO_URI}\n`);

  await connectDatabase(MONGO_URI);

  // Common password hash for all demo identities: "DemoPass123!"
  const defaultPasswordHash = await hashPassword('DemoPass123!');
  console.log('✓ Computed development credential security hash');

  // ==========================================
  // 2. TENANT & BRANDING
  // ==========================================
  let tenant = await TenantModel.findOne({ slug: DEMO_ORG.slug });
  if (!tenant) {
    tenant = await TenantModel.create({
      name: DEMO_ORG.name,
      slug: DEMO_ORG.slug,
      customDomain: DEMO_ORG.domain,
      isCustomDomainVerified: true,
      status: 'ACTIVE'
    });
  } else {
    tenant.name = DEMO_ORG.name;
    tenant.customDomain = DEMO_ORG.domain;
    tenant.status = 'ACTIVE';
    await tenant.save();
  }
  const tenantId = tenant._id;
  console.log(`✓ Demo Tenant: "${tenant.name}" (${tenant._id})`);

  // Organization Settings & Branding
  await OrganizationSettingsModel.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        profile: {
          organizationName: DEMO_ORG.name,
          contactEmail: DEMO_ORG.contactEmail,
          contactPhone: DEMO_ORG.contactPhone,
          address: DEMO_ORG.address,
          timezone: DEMO_ORG.timezone,
          currency: DEMO_ORG.currency
        }
      }
    },
    { upsert: true, new: true }
  );

  await OrganizationBrandingModel.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=80&fit=crop',
        primaryColor: '#BE1E2E',
        secondaryColor: '#1A1A1A',
        accentColor: '#FF3B30',
        fontFamily: 'Inter',
        faviconUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=32&h=32&fit=crop'
      }
    },
    { upsert: true, new: true }
  );
  console.log('✓ Organization Settings & Branding configured');

  // ==========================================
  // 3. BRANCHES & ROOMS
  // ==========================================
  const branchMap = new Map<string, Types.ObjectId>();
  for (const b of DEMO_BRANCHES) {
    const branch = await BranchModel.findOneAndUpdate(
      { tenantId, code: b.code },
      {
        $set: {
          name: b.name,
          slug: b.slug,
          city: b.city,
          state: b.state,
          isPrimary: b.isPrimary,
          status: 'ACTIVE',
          timezone: b.timezone,
          address: b.address,
          capacity: b.capacity
        }
      },
      { upsert: true, new: true }
    );
    branchMap.set(b.code, branch._id);
  }
  console.log(`✓ Created ${branchMap.size} Branches (${Array.from(branchMap.keys()).join(', ')})`);

  const roomMap = new Map<string, Types.ObjectId>();
  for (const r of DEMO_ROOMS) {
    const branchId = branchMap.get(r.branchCode);
    if (!branchId) continue;
    const room = await AcademicRoomModel.findOneAndUpdate(
      { tenantId, code: r.code },
      {
        $set: {
          name: r.name,
          branchId,
          capacity: r.capacity,
          status: 'ACTIVE'
        }
      },
      { upsert: true, new: true }
    );
    roomMap.set(r.code, room._id);
  }
  console.log(`✓ Created ${roomMap.size} Academic Rooms`);

  // ==========================================
  // 4. USERS & MEMBERSHIPS
  // ==========================================
  const userMap = new Map<string, Types.ObjectId>();

  // A. SuperAdmin (Global Identity)
  let superAdmin = await UserModel.findOne({ email: DEMO_USERS.superadmin.email });
  if (!superAdmin) {
    superAdmin = await UserModel.create({
      name: DEMO_USERS.superadmin.name,
      email: DEMO_USERS.superadmin.email,
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: true,
      tenantId: null,
      allowedTenantIds: [tenantId]
    });
  } else {
    superAdmin.isSuperAdmin = true;
    superAdmin.passwordHash = defaultPasswordHash;
    if (!superAdmin.allowedTenantIds?.includes(tenantId)) {
      superAdmin.allowedTenantIds.push(tenantId);
    }
    await superAdmin.save();
  }
  userMap.set('superadmin', superAdmin._id);

  // Helper to upsert tenant user & organization membership
  async function upsertUser(
    userData: { name: string; email: string; phone?: string; status?: string },
    role: 'TENANT_ADMIN' | 'BRANCH_ADMIN' | 'INSTRUCTOR' | 'STUDENT',
    branchAccessMode: 'ALL' | 'SELECTED' = 'ALL',
    branchCodes: string[] = []
  ) {
    const validUserStatus = userData.status === 'SUSPENDED' || userData.status === 'INVITED' ? userData.status : 'ACTIVE';
    let u = await UserModel.findOne({ email: userData.email, tenantId });
    if (!u) {
      u = await UserModel.create({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        passwordHash: defaultPasswordHash,
        status: validUserStatus,
        emailVerified: true,
        isSuperAdmin: false,
        tenantId,
        allowedTenantIds: [tenantId]
      });
    } else {
      u.name = userData.name;
      u.passwordHash = defaultPasswordHash;
      u.status = validUserStatus;
      await u.save();
    }

    const branchIds = branchCodes.map((c) => branchMap.get(c)!).filter(Boolean);

    await OrganizationMemberModel.findOneAndUpdate(
      { tenantId, userId: u._id },
      {
        $set: {
          role,
          status: userData.status === 'WITHDRAWN' ? 'SUSPENDED' : 'ACTIVE',
          branchAccessMode,
          branchIds,
          joinedAt: new Date(Date.now() - 60 * 86400000)
        }
      },
      { upsert: true, new: true }
    );

    return u;
  }

  // B. Tenant Admin
  const adminUser = await upsertUser(DEMO_USERS.tenantAdmin, 'TENANT_ADMIN', 'ALL');
  userMap.set('admin', adminUser._id);

  // C. Branch Admins
  const bMainAdmin = await upsertUser(DEMO_USERS.branchAdminMain, 'BRANCH_ADMIN', 'SELECTED', ['MAIN']);
  userMap.set('branch_main', bMainAdmin._id);

  const bSouthAdmin = await upsertUser(DEMO_USERS.branchAdminSouth, 'BRANCH_ADMIN', 'SELECTED', ['GURGAON']);
  userMap.set('branch_south', bSouthAdmin._id);

  // D. Instructors
  for (const inst of DEMO_USERS.instructors) {
    const instUser = await upsertUser(inst, 'INSTRUCTOR', 'SELECTED', inst.branchCodes);
    userMap.set(inst.email, instUser._id);

    // Seed Availability Window for each Instructor (Mon-Fri 09:00 - 18:00)
    await InstructorAvailabilityModel.findOneAndUpdate(
      { tenantId, instructorId: instUser._id },
      {
        $set: {
          timezone: DEMO_ORG.timezone,
          weeklyWindows: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' },
            { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' },
            { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' },
            { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' },
            { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }
          ],
          exceptions: []
        }
      },
      { upsert: true, new: true }
    );
  }

  // E. Primary Student: Aman Verma
  const primaryStudent = await upsertUser(
    DEMO_USERS.primaryStudent,
    'STUDENT',
    'SELECTED',
    [DEMO_USERS.primaryStudent.branchCode]
  );
  userMap.set('primary_student', primaryStudent._id);
  userMap.set(DEMO_USERS.primaryStudent.email, primaryStudent._id);

  // F. Additional Students
  for (const s of DEMO_USERS.students) {
    const sUser = await upsertUser(s, 'STUDENT', 'SELECTED', [s.branchCode]);
    userMap.set(s.email, sUser._id);
  }

  console.log(`✓ Seeded ${userMap.size} Users & Memberships across all roles`);

  // ==========================================
  // 5. COURSES, MODULES & LESSONS
  // ==========================================
  const courseMap = new Map<string, Types.ObjectId>();
  const lessonMap = new Map<string, Types.ObjectId[]>(); // courseSlug -> lessonIds

  for (const c of DEMO_COURSES) {
    const course = await CourseModel.findOneAndUpdate(
      { tenantId, slug: c.slug },
      {
        $set: {
          title: c.title,
          shortDescription: c.shortDescription,
          description: c.description,
          level: c.level,
          category: c.category,
          status: 'PUBLISHED',
          price: c.price,
          currency: 'INR',
          isFree: false,
          thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
          durationHours: c.durationHours
        }
      },
      { upsert: true, new: true }
    );
    courseMap.set(c.slug, course._id);

    const allCourseLessonIds: Types.ObjectId[] = [];

    // Modules & Lessons
    for (let mIdx = 0; mIdx < c.modules.length; mIdx++) {
      const modData = c.modules[mIdx];
      const mod = await CourseModuleModel.findOneAndUpdate(
        { tenantId, courseId: course._id, order: mIdx + 1 },
        {
          $set: {
            title: modData.title,
            description: modData.description,
            status: 'PUBLISHED'
          }
        },
        { upsert: true, new: true }
      );

      for (let lIdx = 0; lIdx < modData.lessons.length; lIdx++) {
        const lesData = modData.lessons[lIdx];
        const lesson = await LessonModel.findOneAndUpdate(
          { tenantId, courseId: course._id, moduleId: mod._id, order: lIdx + 1 },
          {
            $set: {
              title: lesData.title,
              slug: `${c.slug}-m${mIdx + 1}-l${lIdx + 1}`,
              type: lesData.type,
              status: 'PUBLISHED',
              durationMinutes: lesData.durationMinutes,
              videoUrl:
                lesData.type === 'VIDEO'
                  ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                  : undefined,
              textContent:
                lesData.type === 'TEXT'
                  ? `## ${lesData.title}\n\nComprehensive technical guidelines and implementation steps for this topic.\n\n### Key Learning Objectives\n- Understand foundational theory and practical application\n- Execute real-world strategy templates\n- Measure performance outcomes and KPI analytics`
                  : undefined
            }
          },
          { upsert: true, new: true }
        );
        allCourseLessonIds.push(lesson._id);
      }
    }
    lessonMap.set(c.slug, allCourseLessonIds);
  }
  console.log(`✓ Seeded ${courseMap.size} Courses with complete Curriculum & Lessons`);

  // ==========================================
  // 6. BATCHES
  // ==========================================
  const batchMap = new Map<string, Types.ObjectId>();
  const now = new Date();

  for (const b of DEMO_BATCHES) {
    const courseId = courseMap.get(b.courseSlug);
    const branchId = branchMap.get(b.branchCode);
    const instructorId = userMap.get(b.instructorEmail);
    if (!courseId || !branchId || !instructorId) continue;

    const startDate = new Date(now.getTime() + b.daysOffset * 86400000);
    const endDate = new Date(startDate.getTime() + b.durationDays * 86400000);

    const batch = await BatchModel.findOneAndUpdate(
      { tenantId, batchCode: b.batchCode },
      {
        $set: {
          name: b.name,
          courseId,
          branchId,
          instructorId,
          mode: b.mode,
          status: b.status,
          timing: b.timing,
          startDate,
          endDate,
          maxCapacity: 35
        }
      },
      { upsert: true, new: true }
    );
    batchMap.set(b.batchCode, batch._id);
  }
  console.log(`✓ Seeded ${batchMap.size} Active Cohort Batches`);

  // ==========================================
  // 7. STUDENT LIFECYCLES & ENROLLMENTS
  // ==========================================
  const primaryBatchId = batchMap.get('DM-2026-OCT-MORNING')!;
  const dmCourseId = courseMap.get('adv-digital-marketing')!;
  const pmCourseId = courseMap.get('performance-marketing-masterclass')!;
  const smCourseId = courseMap.get('social-media-fundamentals')!;

  // A. Aman Verma Enrollments
  // 1. Advanced Digital Marketing (68% complete)
  const dmLessons = lessonMap.get('adv-digital-marketing') || [];
  const completedDmCount = Math.floor(dmLessons.length * 0.68); // ~22 lessons

  const amanDmEnrollment = await EnrollmentModel.findOneAndUpdate(
    { tenantId, studentId: primaryStudent._id, courseId: dmCourseId },
    {
      $set: {
        status: 'ACTIVE',
        progressPercent: 68,
        completedLessons: completedDmCount,
        totalLessons: dmLessons.length,
        enrolledAt: new Date(Date.now() - 30 * 86400000),
        lastAccessedAt: new Date(Date.now() - 2 * 3600000)
      }
    },
    { upsert: true, new: true }
  );

  // 2. Performance Marketing Masterclass (34% complete)
  const pmLessons = lessonMap.get('performance-marketing-masterclass') || [];
  const completedPmCount = Math.floor(pmLessons.length * 0.34); // ~8 lessons

  const amanPmEnrollment = await EnrollmentModel.findOneAndUpdate(
    { tenantId, studentId: primaryStudent._id, courseId: pmCourseId },
    {
      $set: {
        status: 'ACTIVE',
        progressPercent: 34,
        completedLessons: completedPmCount,
        totalLessons: pmLessons.length,
        enrolledAt: new Date(Date.now() - 15 * 86400000),
        lastAccessedAt: new Date(Date.now() - 24 * 3600000)
      }
    },
    { upsert: true, new: true }
  );

  // 3. Social Media Marketing Fundamentals (100% complete)
  const smLessons = lessonMap.get('social-media-fundamentals') || [];
  const amanSmEnrollment = await EnrollmentModel.findOneAndUpdate(
    { tenantId, studentId: primaryStudent._id, courseId: smCourseId },
    {
      $set: {
        status: 'COMPLETED',
        progressPercent: 100,
        completedLessons: smLessons.length,
        totalLessons: smLessons.length,
        enrolledAt: new Date(Date.now() - 60 * 86400000),
        completedAt: new Date(Date.now() - 5 * 86400000),
        lastAccessedAt: new Date(Date.now() - 5 * 86400000)
      }
    },
    { upsert: true, new: true }
  );

  // Student Lifecycle Record for Aman
  await StudentLifecycleModel.findOneAndUpdate(
    { tenantId, studentUserId: primaryStudent._id },
    {
      $set: {
        studentNumber: 'DIDM-2026-0001',
        currentStatus: 'ACTIVE',
        currentBatchId: primaryBatchId,
        currentEnrollmentId: amanDmEnrollment._id,
        branchId: branchMap.get('MAIN'),
        joinedAt: new Date(Date.now() - 30 * 86400000)
      }
    },
    { upsert: true, new: true }
  );

  // Seed Lesson Progress for Aman
  // Completed DM lessons
  for (let i = 0; i < completedDmCount; i++) {
    await LessonProgressModel.findOneAndUpdate(
      { tenantId, studentId: primaryStudent._id, lessonId: dmLessons[i] },
      {
        $set: {
          courseId: dmCourseId,
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - (30 - i) * 86400000),
          lastPositionSeconds: 1800
        }
      },
      { upsert: true, new: true }
    );
  }

  // Active in-progress DM lesson (lesson 23)
  if (dmLessons[completedDmCount]) {
    await LessonProgressModel.findOneAndUpdate(
      { tenantId, studentId: primaryStudent._id, lessonId: dmLessons[completedDmCount] },
      {
        $set: {
          courseId: dmCourseId,
          status: 'IN_PROGRESS',
          lastPositionSeconds: 420 // 7 minutes in
        }
      },
      { upsert: true, new: true }
    );
  }

  // Completed all SM lessons
  for (const lId of smLessons) {
    await LessonProgressModel.findOneAndUpdate(
      { tenantId, studentId: primaryStudent._id, lessonId: lId },
      {
        $set: {
          courseId: smCourseId,
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - 10 * 86400000),
          lastPositionSeconds: 2400
        }
      },
      { upsert: true, new: true }
    );
  }

  // B. Roster for all other students
  for (let sIdx = 0; sIdx < DEMO_USERS.students.length; sIdx++) {
    const s = DEMO_USERS.students[sIdx];
    const sId = userMap.get(s.email)!;
    const sBranchId = branchMap.get(s.branchCode)!;

    // Distribute students across batches
    const targetBatchId = sIdx % 2 === 0 ? primaryBatchId : batchMap.get('DM-2026-OCT-EVENING')!;
    const progress = Math.min(100, Math.floor(20 + sIdx * 3));

    const sEnrollment = await EnrollmentModel.findOneAndUpdate(
      { tenantId, studentId: sId, courseId: dmCourseId },
      {
        $set: {
          status: s.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
          progressPercent: s.status === 'COMPLETED' ? 100 : progress,
          completedLessons: Math.floor((dmLessons.length * progress) / 100),
          totalLessons: dmLessons.length,
          enrolledAt: new Date(Date.now() - 30 * 86400000)
        }
      },
      { upsert: true, new: true }
    );

    await StudentLifecycleModel.findOneAndUpdate(
      { tenantId, studentUserId: sId },
      {
        $set: {
          studentNumber: s.studentNumber,
          currentStatus: s.status,
          currentBatchId: targetBatchId,
          currentEnrollmentId: sEnrollment._id,
          branchId: sBranchId,
          joinedAt: new Date(Date.now() - 30 * 86400000)
        }
      },
      { upsert: true, new: true }
    );
  }
  console.log('✓ Seeded Student Lifecycles, Multi-Course Enrollments & Progress tracking');



  // ==========================================
  // 8. CLASSES & LIVE MEETING SCHEDULES
  // ==========================================
  const aaravId = userMap.get('aarav.sharma@didm.edu')!;
  const mainRoomId = roomMap.get('LAB-101');

  // Student roster ObjectIds for Aman's batch
  const enrolledStudentsRoster = [
    { studentId: primaryStudent._id, studentName: primaryStudent.name, studentEmail: primaryStudent.email, status: 'ENROLLED', enrolledAt: new Date(now.getTime() - 30 * 86400000) },
    ...DEMO_USERS.students.slice(0, 15).map((s) => ({
      studentId: userMap.get(s.email)!,
      studentName: s.name,
      studentEmail: s.email,
      status: 'ENROLLED',
      enrolledAt: new Date(now.getTime() - 30 * 86400000)
    }))
  ];

  // Integration Connection Mock Records
  const zoomConn = await IntegrationConnectionModel.findOneAndUpdate(
    { tenantId, provider: 'ZOOM' },
    {
      $set: {
        status: 'CONNECTED',
        scopeType: 'TENANT',
        externalAccountId: 'didm-zoom-dev@didm.edu',
        scopes: ['meeting:write:admin', 'meeting:read:admin'],
        metadata: { isDemo: true }
      }
    },
    { upsert: true, new: true }
  );

  const gmeetConn = await IntegrationConnectionModel.findOneAndUpdate(
    { tenantId, provider: 'GOOGLE_MEET' },
    {
      $set: {
        status: 'CONNECTED',
        scopeType: 'TENANT',
        externalAccountId: 'didm-gmeet-dev@didm.edu',
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
        metadata: { isDemo: true }
      }
    },
    { upsert: true, new: true }
  );

  const teamsConn = await IntegrationConnectionModel.findOneAndUpdate(
    { tenantId, provider: 'MICROSOFT_TEAMS' },
    {
      $set: {
        status: 'CONNECTED',
        scopeType: 'TENANT',
        externalAccountId: 'didm-teams-dev@didm.edu',
        scopes: ['OnlineMeetings.ReadWrite.All'],
        metadata: { isDemo: true }
      }
    },
    { upsert: true, new: true }
  );

  const classList = [
    {
      name: 'Google Ads Search & Performance Max Campaign Setup',
      classCode: 'DM-CLS-101',
      offsetHours: 2, // Today in 2 hours (Joinable / Upcoming)
      durationMinutes: 90,
      status: 'SCHEDULED',
      mode: 'ONLINE',
      provider: 'GOOGLE_MEET',
      meetingUrl: 'https://meet.google.com/didm-demo-gads'
    },
    {
      name: 'Meta Ads Creative Strategy & High-Converting Copywriting',
      classCode: 'DM-CLS-102',
      offsetHours: 24, // Tomorrow
      durationMinutes: 120,
      status: 'SCHEDULED',
      mode: 'ONLINE',
      provider: 'ZOOM',
      meetingUrl: 'https://zoom.us/j/98800112233'
    },
    {
      name: 'GA4 Event Tracking & Funnel Analysis Masterclass',
      classCode: 'DM-CLS-103',
      offsetHours: 72, // In 3 days
      durationMinutes: 120,
      status: 'SCHEDULED',
      mode: 'ONLINE',
      provider: 'MICROSOFT_TEAMS',
      meetingUrl: 'https://teams.microsoft.com/l/meetup-join/didm-ga4-masterclass'
    },
    {
      name: 'SEO On-Page Optimization & Technical Site Audit',
      classCode: 'DM-CLS-100',
      offsetHours: -24, // Yesterday (Completed)
      durationMinutes: 120,
      status: 'COMPLETED',
      mode: 'OFFLINE',
      provider: 'GOOGLE_MEET',
      meetingUrl: 'https://meet.google.com/didm-seo-done'
    },
    {
      name: 'Landing Page Conversion Rate Optimization (CRO)',
      classCode: 'DM-CLS-099',
      offsetHours: -72, // 3 days ago (Completed)
      durationMinutes: 120,
      status: 'COMPLETED',
      mode: 'HYBRID',
      provider: 'ZOOM',
      meetingUrl: 'https://zoom.us/j/98800112299'
    },
    {
      name: 'Affiliate Marketing & Network Partnerships',
      classCode: 'DM-CLS-098',
      offsetHours: -120, // 5 days ago (Cancelled)
      durationMinutes: 90,
      status: 'CANCELLED',
      mode: 'ONLINE',
      isRescheduled: true,
      provider: 'ZOOM',
      meetingUrl: 'https://zoom.us/j/98800112298'
    }
  ];

  const classIds: Types.ObjectId[] = [];

  for (const cData of classList) {
    const start = new Date(now.getTime() + cData.offsetHours * 3600000);
    const end = new Date(start.getTime() + cData.durationMinutes * 60000);

    const cls = await ClassModel.findOneAndUpdate(
      { tenantId, classCode: cData.classCode },
      {
        $set: {
          name: cData.name,
          courseId: dmCourseId,
          batchId: primaryBatchId,
          instructorId: aaravId,
          roomId: mainRoomId,
          branchId: branchMap.get('MAIN'),
          startDate: start,
          endDate: end,
          scheduledStartAt: start,
          scheduledEndAt: end,
          timing: {
            startTime: '10:00',
            endTime: '12:00',
            timezone: DEMO_ORG.timezone
          },
          daysOfWeek: ['MON'],
          timezone: DEMO_ORG.timezone,
          mode: cData.mode,
          capacity: 30,
          enrolledCount: enrolledStudentsRoster.length,
          status: cData.status,
          source: 'ONE_OFF',
          scheduleRevision: 1,
          showOnWebsite: true,
          isRescheduled: Boolean(cData.isRescheduled),
          enrolledStudents: enrolledStudentsRoster,
          zoomDetails: cData.provider === 'ZOOM' ? { meetingUrl: cData.meetingUrl, meetingId: '98800112233' } : undefined
        }
      },
      { upsert: true, new: true }
    );
    classIds.push(cls._id);

    // Link External Meeting Record
    const conn = cData.provider === 'ZOOM' ? zoomConn : cData.provider === 'GOOGLE_MEET' ? gmeetConn : teamsConn;
    await ExternalMeetingModel.findOneAndUpdate(
      { tenantId, classId: cls._id },
      {
        $set: {
          branchId: branchMap.get('MAIN'),
          provider: cData.provider,
          connectionId: conn._id,
          organizerUserId: aaravId,
          externalMeetingId: `ext-${cData.classCode}`,
          joinUrl: cData.meetingUrl,
          providerStatus: cData.status === 'COMPLETED' ? 'COMPLETED' : cData.status === 'CANCELLED' ? 'CANCELLED' : 'SCHEDULED',
          scheduledStart: start,
          scheduledEnd: end,
          timezone: DEMO_ORG.timezone,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }
  console.log(`✓ Seeded ${classList.length} Scheduled Classes with Provider Integration metadata`);

  // ==========================================
  // 9. ASSESSMENTS & SUBMISSIONS
  // ==========================================
  // Assessment 1: Foundations Quiz (Auto-graded)
  const quiz1 = await AssessmentModel.findOneAndUpdate(
    { tenantId, slug: 'digital-marketing-fundamentals-quiz' },
    {
      $set: {
        title: 'Digital Marketing Fundamentals Quiz',
        type: 'QUIZ',
        scope: 'BATCH_LINKED',
        courseId: dmCourseId,
        batchId: primaryBatchId,
        status: 'PUBLISHED',
        durationMinutes: 30,
        passingScorePercent: 70,
        maxAttempts: 3,
        description: 'Core concepts test on search marketing, paid channels, funnels, and marketing analytics.',
        createdBy: aaravId,
        questions: [
          {
            questionText: 'What does CPA stand for in digital performance advertising?',
            questionType: 'MCQ',
            options: [
              { text: 'Cost Per Action', isCorrect: true },
              { text: 'Click Per Action', isCorrect: false },
              { text: 'Cost Per Acquisition', isCorrect: false },
              { text: 'Click Per Ad', isCorrect: false }
            ],
            points: 5
          },
          {
            questionText: 'Which search intent reflects a user ready to buy immediately?',
            questionType: 'MCQ',
            options: [
              { text: 'Informational', isCorrect: false },
              { text: 'Transactional', isCorrect: true },
              { text: 'Navigational', isCorrect: false },
              { text: 'Investigational', isCorrect: false }
            ],
            points: 5
          }
        ]
      }
    },
    { upsert: true, new: true }
  );

  // Assessment 2: SEO Keyword Research (Assignment - Graded)
  const assign1 = await AssessmentModel.findOneAndUpdate(
    { tenantId, slug: 'seo-keyword-research-gap-analysis' },
    {
      $set: {
        title: 'SEO Keyword Research & Competitor Gap Analysis',
        type: 'ASSIGNMENT',
        scope: 'BATCH_LINKED',
        courseId: dmCourseId,
        batchId: primaryBatchId,
        status: 'PUBLISHED',
        description: 'Submit a comprehensive 20-keyword cluster mapping report with search intent analysis and top 3 competitor content gaps.',
        createdBy: aaravId,
        passingScorePercent: 60,
        assignmentDetails: {
          submissionType: 'URL_LINK',
          maxScore: 100,
          rubric: 'Search intent categorization (40%), Competitor gap depth (30%), Cluster organization (30%)',
          dueDate: new Date(now.getTime() - 8 * 86400000)
        }
      }
    },
    { upsert: true, new: true }
  );

  // Assessment 3: Google Ads Budgeting (Assignment - Awaiting Grading)
  const assign2 = await AssessmentModel.findOneAndUpdate(
    { tenantId, slug: 'google-ads-search-pmax-strategy' },
    {
      $set: {
        title: 'Google Ads Search & PMax Campaign Strategy',
        type: 'ASSIGNMENT',
        scope: 'BATCH_LINKED',
        courseId: dmCourseId,
        batchId: primaryBatchId,
        status: 'PUBLISHED',
        description: 'Structure a ₹50,000 monthly Google Ads campaign plan with RSA copies, negative keyword list, and Target CPA bidding.',
        createdBy: aaravId,
        passingScorePercent: 50,
        assignmentDetails: {
          submissionType: 'FILE_UPLOAD',
          maxScore: 100,
          rubric: 'Budget allocation (30%), Ad copy relevance (40%), Negative keyword strategy (30%)',
          dueDate: new Date(now.getTime() + 4 * 86400000)
        }
      }
    },
    { upsert: true, new: true }
  );

  // Assessment 4: Meta Ads Quiz (Currently Available)
  await AssessmentModel.findOneAndUpdate(
    { tenantId, slug: 'meta-ads-creative-strategy-quiz' },
    {
      $set: {
        title: 'Meta Ads & Creative Strategy Quiz',
        type: 'QUIZ',
        scope: 'BATCH_LINKED',
        courseId: dmCourseId,
        batchId: primaryBatchId,
        status: 'PUBLISHED',
        durationMinutes: 20,
        passingScorePercent: 80,
        maxAttempts: 2,
        description: 'Evaluation on Meta Advantage+ shopping campaigns, pixel events, and creative hooks.',
        createdBy: aaravId,
        questions: [
          {
            questionText: 'What is Meta Advantage+ Campaign primary purpose?',
            questionType: 'MCQ',
            options: [
              { text: 'Automated machine-learning driven targeting and budget allocation', isCorrect: true },
              { text: 'Manual bid management only', isCorrect: false }
            ],
            points: 10
          }
        ]
      }
    },
    { upsert: true, new: true }
  );

  // Aman's Submissions:
  // 1. Graded Quiz (9/10 = 90%)
  await AssessmentSubmissionModel.findOneAndUpdate(
    { tenantId, assessmentId: quiz1._id, userId: primaryStudent._id },
    {
      $set: {
        batchId: primaryBatchId,
        courseId: dmCourseId,
        type: 'QUIZ',
        attemptNumber: 1,
        status: 'GRADED',
        score: 9,
        maxScore: 10,
        scorePercentage: 90,
        passed: true,
        submittedAt: new Date(now.getTime() - 16 * 86400000),
        gradedAt: new Date(now.getTime() - 16 * 86400000),
        feedback: 'Excellent grasp of foundational marketing terminology.'
      }
    },
    { upsert: true, new: true }
  );

  // 2. Graded Assignment (88/100)
  await AssessmentSubmissionModel.findOneAndUpdate(
    { tenantId, assessmentId: assign1._id, userId: primaryStudent._id },
    {
      $set: {
        batchId: primaryBatchId,
        courseId: dmCourseId,
        type: 'ASSIGNMENT',
        attemptNumber: 1,
        status: 'GRADED',
        score: 88,
        maxScore: 100,
        scorePercentage: 88,
        passed: true,
        submittedAt: new Date(now.getTime() - 9 * 86400000),
        gradedAt: new Date(now.getTime() - 7 * 86400000),
        gradedBy: aaravId,
        feedback: 'Outstanding depth in keyword intent mapping and competitor gap identification! Keep this up.',
        assignmentSubmission: { linkUrl: 'https://docs.google.com/document/d/demo-seo-report' }
      }
    },
    { upsert: true, new: true }
  );

  // 3. Submitted Assignment (Awaiting Aarav's grading queue)
  await AssessmentSubmissionModel.findOneAndUpdate(
    { tenantId, assessmentId: assign2._id, userId: primaryStudent._id },
    {
      $set: {
        batchId: primaryBatchId,
        courseId: dmCourseId,
        type: 'ASSIGNMENT',
        attemptNumber: 1,
        status: 'SUBMITTED',
        score: 0,
        maxScore: 100,
        scorePercentage: 0,
        passed: false,
        submittedAt: new Date(now.getTime() - 4 * 3600000),
        assignmentSubmission: { submissionText: 'Attached Google Ads Campaign budget workbook and RSA asset groups.' }
      }
    },
    { upsert: true, new: true }
  );

  // Additional submissions from other students for Aarav's grading queue
  for (let i = 0; i < 8; i++) {
    const s = DEMO_USERS.students[i];
    const sId = userMap.get(s.email)!;
    const isGraded = i < 3;
    const sScore = isGraded ? 82 + i * 4 : 0;

    await AssessmentSubmissionModel.findOneAndUpdate(
      { tenantId, assessmentId: assign2._id, userId: sId },
      {
        $set: {
          batchId: primaryBatchId,
          courseId: dmCourseId,
          type: 'ASSIGNMENT',
          attemptNumber: 1,
          status: isGraded ? 'GRADED' : 'SUBMITTED', // 3 graded, 5 pending
          score: sScore,
          maxScore: 100,
          scorePercentage: isGraded ? sScore : 0,
          passed: isGraded,
          submittedAt: new Date(now.getTime() - (i + 1) * 86400000),
          gradedAt: isGraded ? new Date(now.getTime() - i * 86400000) : undefined,
          gradedBy: isGraded ? aaravId : undefined,
          feedback: isGraded ? 'Good campaign structure and keyword selection.' : undefined,
          assignmentSubmission: { submissionText: `Student submission from ${s.name}` }
        }
      },
      { upsert: true, new: true }
    );
  }
  console.log('✓ Seeded Assessments, Quizzes & Graded/Pending Submissions Queue');

  // ==========================================
  // 10. ATTENDANCE (18 Sessions for Aman)
  // ==========================================
  // Generate 18 past attendance sessions with distinct historical classes
  for (let sIdx = 1; sIdx <= 18; sIdx++) {
    const sessionDate = new Date(now.getTime() - (28 - sIdx) * 86400000);
    const histClassCode = `DM-HIST-${String(sIdx).padStart(3, '0')}`;

    const histClass = await ClassModel.findOneAndUpdate(
      { tenantId, classCode: histClassCode },
      {
        $set: {
          name: `Digital Marketing Practical Workshop #${sIdx}`,
          courseId: dmCourseId,
          batchId: primaryBatchId,
          instructorId: aaravId,
          roomId: mainRoomId,
          branchId: branchMap.get('MAIN'),
          startDate: sessionDate,
          endDate: new Date(sessionDate.getTime() + 2 * 3600000),
          scheduledStartAt: sessionDate,
          scheduledEndAt: new Date(sessionDate.getTime() + 2 * 3600000),
          timing: {
            startTime: '10:00',
            endTime: '12:00',
            timezone: DEMO_ORG.timezone
          },
          daysOfWeek: ['MON'],
          timezone: DEMO_ORG.timezone,
          mode: 'OFFLINE',
          capacity: 30,
          enrolledCount: enrolledStudentsRoster.length,
          status: 'COMPLETED',
          source: 'ONE_OFF',
          scheduleRevision: 1,
          showOnWebsite: false,
          enrolledStudents: enrolledStudentsRoster
        }
      },
      { upsert: true, new: true }
    );

    const attSession = await AttendanceSessionModel.findOneAndUpdate(
      { tenantId, classId: histClass._id },
      {
        $set: {
          batchId: primaryBatchId,
          courseId: dmCourseId,
          sessionDate,
          scheduledSnapshot: {
            name: `Digital Marketing Practical Workshop #${sIdx}`,
            mode: 'OFFLINE',
            startDate: sessionDate,
            startTime: '10:00',
            endTime: '12:00',
            timezone: DEMO_ORG.timezone,
            branch: 'Main Campus'
          },
          status: 'FINALIZED',
          openedAt: sessionDate,
          openedBy: aaravId,
          finalizedAt: new Date(sessionDate.getTime() + 2 * 3600000),
          finalizedBy: aaravId,
          expectedStudentCount: 16,
          markedStudentCount: 16
        }
      },
      { upsert: true, new: true }
    );

    // Aman: 15 Present, 2 Absent (sessions 4, 11), 1 Late (session 8)
    const amanStatus = sIdx === 4 || sIdx === 11 ? 'ABSENT' : sIdx === 8 ? 'LATE' : 'PRESENT';

    await AttendanceRecordModel.findOneAndUpdate(
      { tenantId, attendanceSessionId: attSession._id, studentId: primaryStudent._id },
      {
        $set: {
          classId: histClass._id,
          batchId: primaryBatchId,
          status: amanStatus,
          source: 'MANUAL',
          markedAt: sessionDate,
          markedBy: aaravId,
          correctionCount: 0
        }
      },
      { upsert: true, new: true }
    );

    // Other students
    for (let i = 0; i < 5; i++) {
      const s = DEMO_USERS.students[i];
      const sId = userMap.get(s.email)!;
      await AttendanceRecordModel.findOneAndUpdate(
        { tenantId, attendanceSessionId: attSession._id, studentId: sId },
        {
          $set: {
            classId: histClass._id,
            batchId: primaryBatchId,
            status: 'PRESENT',
            source: 'MANUAL',
            markedAt: sessionDate,
            markedBy: aaravId,
            correctionCount: 0
          }
        },
        { upsert: true, new: true }
      );
    }
  }

  // Attendance Evidence for Phase 22 Live Class
  await AttendanceEvidenceModel.findOneAndUpdate(
    { tenantId, classId: classIds[3], externalMeetingId: 'ext-DM-CLS-100' },
    {
      $set: {
        branchId: branchMap.get('MAIN'),
        provider: 'GOOGLE_MEET',
        participantExternalId: 'part_aman_01',
        displayName: 'Aman Verma',
        email: 'aman.verma@student.didm.edu',
        joinTime: new Date(now.getTime() - 24 * 3600000),
        leaveTime: new Date(now.getTime() - 22 * 3600000),
        durationMinutes: 120,
        resolvedStudentId: primaryStudent._id,
        resolutionStatus: 'RESOLVED',
        importedToAttendanceSession: true
      }
    },
    { upsert: true, new: true }
  );
  console.log('✓ Seeded 18 Finalized Attendance Sessions (Aman: 15 Present, 2 Absent, 1 Late = ~86%)');

  // ==========================================
  // 11. FINANCE, FEES & RECEIPTS
  // ==========================================
  const dmFee = await FeeStructureModel.findOneAndUpdate(
    { tenantId, courseId: dmCourseId },
    {
      $set: {
        name: 'Advanced Digital Marketing - Standard Tuition',
        currency: 'INR',
        totalAmountMinor: 7500000, // ₹75,000
        components: [
          { name: 'Tuition Fee', type: 'TUITION', amountMinor: 6500000, isRefundable: false },
          { name: 'Admission & Exam Fee', type: 'ADMISSION', amountMinor: 1000000, isRefundable: false }
        ],
        installmentTemplates: [
          { sequence: 1, label: 'Admission Booking', amountMinor: 2500000, dueDaysAfterAdmission: 0 },
          { sequence: 2, label: 'Installment 2', amountMinor: 2500000, dueDaysAfterAdmission: 30 },
          { sequence: 3, label: 'Installment 3', amountMinor: 2500000, dueDaysAfterAdmission: 60 }
        ],
        status: 'ACTIVE',
        createdBy: adminUser._id,
        updatedBy: adminUser._id
      }
    },
    { upsert: true, new: true }
  );

  // Aman's Fee Plan: ₹75,000 Total, ₹50,000 Paid, ₹25,000 Due
  const amanFeePlan = await StudentFeePlanModel.findOneAndUpdate(
    { tenantId, studentUserId: primaryStudent._id, feeStructureId: dmFee._id },
    {
      $set: {
        courseId: dmCourseId,
        batchId: primaryBatchId,
        branchId: branchMap.get('MAIN'),
        currency: 'INR',
        baseAmountMinor: 7500000,
        discountAmountMinor: 0,
        netPayableMinor: 7500000,
        paidAmountMinor: 5000000, // ₹50,000
        outstandingBalanceMinor: 2500000, // ₹25,000
        status: 'ACTIVE',
        feeStructureSnapshot: {
          name: dmFee.name,
          totalAmountMinor: 7500000,
          components: dmFee.components,
          capturedAt: new Date(now.getTime() - 30 * 86400000)
        },
        installments: [
          { sequence: 1, label: 'Admission Booking', dueDate: new Date(now.getTime() - 30 * 86400000), amountMinor: 2500000, paidAmountMinor: 2500000, status: 'PAID', paidAt: new Date(now.getTime() - 30 * 86400000) },
          { sequence: 2, label: 'Installment 2', dueDate: new Date(now.getTime() - 5 * 86400000), amountMinor: 2500000, paidAmountMinor: 2500000, status: 'PAID', paidAt: new Date(now.getTime() - 5 * 86400000) },
          { sequence: 3, label: 'Installment 3', dueDate: new Date(now.getTime() + 25 * 86400000), amountMinor: 2500000, paidAmountMinor: 0, status: 'UPCOMING' }
        ]
      }
    },
    { upsert: true, new: true }
  );

  // Payments for Aman
  const p1 = await PaymentModel.findOneAndUpdate(
    { tenantId, paymentNumber: 'PAY-2026-0001' },
    {
      $set: {
        studentUserId: primaryStudent._id,
        studentFeePlanId: amanFeePlan._id,
        amountMinor: 2500000,
        currency: 'INR',
        method: 'UPI',
        status: 'SUCCESS',
        transactionReference: 'TXN-2026-0001',
        receivedAt: new Date(now.getTime() - 30 * 86400000)
      }
    },
    { upsert: true, new: true }
  );

  const p2 = await PaymentModel.findOneAndUpdate(
    { tenantId, paymentNumber: 'PAY-2026-0002' },
    {
      $set: {
        studentUserId: primaryStudent._id,
        studentFeePlanId: amanFeePlan._id,
        amountMinor: 2500000,
        currency: 'INR',
        method: 'BANK_TRANSFER',
        status: 'SUCCESS',
        transactionReference: 'TXN-2026-0002',
        receivedAt: new Date(now.getTime() - 5 * 86400000)
      }
    },
    { upsert: true, new: true }
  );

  // Receipts for Aman
  await ReceiptModel.findOneAndUpdate(
    { tenantId, receiptNumber: 'RCPT-2026-0001' },
    {
      $set: {
        paymentId: p1._id,
        studentUserId: primaryStudent._id,
        studentFeePlanId: amanFeePlan._id,
        amountMinor: 2500000,
        currency: 'INR',
        paymentMethod: 'UPI',
        transactionReference: 'TXN-2026-0001',
        issuedAt: new Date(now.getTime() - 30 * 86400000),
        studentSnapshot: {
          fullName: primaryStudent.name,
          email: primaryStudent.email,
          phone: '9876543210',
          studentId: 'DIDM-2026-0001'
        },
        courseSnapshot: {
          courseId: dmCourseId.toString(),
          title: 'Advanced Digital Marketing Program',
          batchName: 'DM-2026-OCT-MORNING'
        },
        organizationSnapshot: {
          organizationName: 'DIDM Academy',
          address: 'Main Campus, New Delhi',
          contactPhone: '+91-11-40001234',
          contactEmail: 'info@didm.edu'
        },
        status: 'ISSUED',
        artifact: {
          status: 'READY',
          storageProvider: 'LOCAL',
          storageKey: 'receipts/RCPT-2026-0001.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 104857
        }
      }
    },
    { upsert: true, new: true }
  );

  await ReceiptModel.findOneAndUpdate(
    { tenantId, receiptNumber: 'RCPT-2026-0002' },
    {
      $set: {
        paymentId: p2._id,
        studentUserId: primaryStudent._id,
        studentFeePlanId: amanFeePlan._id,
        amountMinor: 2500000,
        currency: 'INR',
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'TXN-2026-0002',
        issuedAt: new Date(now.getTime() - 5 * 86400000),
        studentSnapshot: {
          fullName: primaryStudent.name,
          email: primaryStudent.email,
          phone: '9876543210',
          studentId: 'DIDM-2026-0001'
        },
        courseSnapshot: {
          courseId: dmCourseId.toString(),
          title: 'Advanced Digital Marketing Program',
          batchName: 'DM-2026-OCT-MORNING'
        },
        organizationSnapshot: {
          organizationName: 'DIDM Academy',
          address: 'Main Campus, New Delhi',
          contactPhone: '+91-11-40001234',
          contactEmail: 'info@didm.edu'
        },
        status: 'ISSUED',
        artifact: {
          status: 'READY',
          storageProvider: 'LOCAL',
          storageKey: 'receipts/RCPT-2026-0002.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 104857
        }
      }
    },
    { upsert: true, new: true }
  );
  console.log('✓ Seeded Fee Structure, Student Fee Plans, Payments & Official Receipts');

  // ==========================================
  // 12. CERTIFICATES
  // ==========================================
  // 1. Issued Certificate for Aman (Social Media Marketing Fundamentals)
  await CertificateModel.findOneAndUpdate(
    { tenantId, certificateNumber: 'DIDM-CERT-2026-0001' },
    {
      $set: {
        studentId: primaryStudent._id,
        courseId: smCourseId,
        enrollmentId: amanSmEnrollment._id,
        verificationCode: 'DIDM-SM-AMAN-2026',
        status: 'ISSUED',
        issuedAt: new Date(now.getTime() - 5 * 86400000),
        issuedBy: adminUser._id,
        eligibilitySnapshot: {
          enrollmentStatus: 'COMPLETED',
          progressPercent: 100,
          completedAt: new Date(now.getTime() - 5 * 86400000)
        },
        credentialSnapshot: {
          studentName: primaryStudent.name,
          courseTitle: 'Social Media Marketing Fundamentals',
          organizationName: 'DIDM Academy',
          completionDate: new Date(now.getTime() - 5 * 86400000),
          issueDate: new Date(now.getTime() - 5 * 86400000)
        },
        artifact: {
          status: 'READY',
          storageProvider: 'LOCAL',
          storageKey: 'certificates/DIDM-CERT-2026-0001.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 154320,
          retryCount: 0
        }
      }
    },
    { upsert: true, new: true }
  );

  // 2. Revoked Certificate for another student
  const s2Id = userMap.get('gaurav.kumar@student.didm.edu')!;
  const s2Enrollment = await EnrollmentModel.findOne({ tenantId, studentId: s2Id, courseId: smCourseId });
  if (s2Enrollment) {
    await CertificateModel.findOneAndUpdate(
      { tenantId, certificateNumber: 'DIDM-CERT-2026-0099' },
      {
        $set: {
          studentId: s2Id,
          courseId: smCourseId,
          enrollmentId: s2Enrollment._id,
          verificationCode: 'DIDM-REVOKED-0099',
          status: 'REVOKED',
          issuedAt: new Date(now.getTime() - 40 * 86400000),
          issuedBy: adminUser._id,
          revokedAt: new Date(now.getTime() - 10 * 86400000),
          revokedBy: adminUser._id,
          revocationReason: 'Academic integrity and project authenticity violation.',
          eligibilitySnapshot: {
            enrollmentStatus: 'COMPLETED',
            progressPercent: 100,
            completedAt: new Date(now.getTime() - 40 * 86400000)
          },
          credentialSnapshot: {
            studentName: 'Gaurav Kumar',
            courseTitle: 'Social Media Marketing Fundamentals',
            organizationName: 'DIDM Academy',
            completionDate: new Date(now.getTime() - 40 * 86400000),
            issueDate: new Date(now.getTime() - 40 * 86400000)
          },
          artifact: {
            status: 'READY',
            storageProvider: 'LOCAL',
            storageKey: 'certificates/DIDM-CERT-2026-0099.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 154320,
            retryCount: 0
          }
        }
      },
      { upsert: true, new: true }
    );
  }
  console.log('✓ Seeded Issued & Revoked Verified Certificates');

  // ==========================================
  // 13. NOTIFICATIONS & COMMUNICATIONS
  // ==========================================
  // A. Notifications for Aman
  const notifItems = [
    { type: 'student.activated', category: 'SYSTEM', title: 'Welcome to DIDM Academy!', body: 'Your onboarding is complete. Explore your enrolled courses and upcoming masterclasses.', read: true, daysAgo: 30 },
    { type: 'assessment.graded', category: 'ACADEMIC', title: 'SEO Keyword Research Graded', body: 'Instructor Aarav Sharma evaluated your submission with a score of 88/100.', read: true, daysAgo: 7 },
    { type: 'payment.success', category: 'FINANCE', title: 'Payment Receipt Issued (₹25,000)', body: 'Receipt #RCPT-2026-0002 generated successfully.', read: true, daysAgo: 5 },
    { type: 'certificate.issued', category: 'CERTIFICATE', title: 'Certificate Issued! 🎓', body: 'Congratulations! Your certificate for Social Media Marketing Fundamentals is now available.', read: true, daysAgo: 5 },
    { type: 'class.rescheduled', category: 'ACADEMIC', title: 'Upcoming Live Masterclass', body: 'Google Ads Campaign Setup starts in 2 hours. Click to join live interactive session.', read: false, daysAgo: 0 }
  ];

  for (let idx = 0; idx < notifItems.length; idx++) {
    const n = notifItems[idx];
    await NotificationModel.findOneAndUpdate(
      { tenantId, recipientUserId: primaryStudent._id, deduplicationKey: `demo_seed_notif_${idx}` },
      {
        $set: {
          type: n.type as any,
          category: n.category as any,
          title: n.title,
          body: n.body,
          sourceType: 'SEED',
          sourceId: 'demo_seed',
          occurrenceKey: `occ_${idx}`,
          readAt: n.read ? new Date(now.getTime() - n.daysAgo * 86400000 + 3600000) : null
        }
      },
      { upsert: true, new: true }
    );
  }

  // B. Announcements
  await CommunicationAnnouncementModel.findOneAndUpdate(
    { tenantId, title: 'Diwali Holiday Schedule & Live Class Reschedules' },
    {
      $set: {
        body: 'Please note the academy will observe Diwali break from next Thursday to Sunday. All live masterclasses scheduled during this period have been shifted to upcoming weekend slots.',
        publishedAt: new Date(now.getTime() - 2 * 86400000),
        status: 'PUBLISHED',
        senderUserId: adminUser._id,
        senderName: 'DIDM Admin',
        senderRole: 'TENANT_ADMIN',
        priority: 'HIGH',
        audienceType: 'ALL',
        channels: ['PORTAL'],
        attachments: [],
        revision: 1
      }
    },
    { upsert: true, new: true }
  );

  await CommunicationAnnouncementModel.findOneAndUpdate(
    { tenantId, title: 'Guest Lecture: Scaling DTC Brands with Generative AI' },
    {
      $set: {
        body: 'Join industry veteran guest speaker on Saturday 4 PM for an exclusive session on AI-driven creative testing and retention marketing.',
        publishedAt: new Date(now.getTime() - 1 * 86400000),
        status: 'PUBLISHED',
        senderUserId: aaravId,
        senderName: 'Aarav Sharma',
        senderRole: 'INSTRUCTOR',
        priority: 'NORMAL',
        audienceType: 'ALL',
        channels: ['PORTAL'],
        attachments: [],
        revision: 1
      }
    },
    { upsert: true, new: true }
  );

  // C. Conversations & Messages
  // Batch Discussion
  const batchConv = await CommunicationConversationModel.findOneAndUpdate(
    { tenantId, fingerprint: 'batch_dm_2026_oct_morning' },
    {
      $set: {
        type: 'STUDENT_INSTRUCTOR',
        title: 'DM-2026-OCT-MORNING Cohort Discussions',
        batchId: primaryBatchId,
        courseId: dmCourseId,
        participantUserIds: [primaryStudent._id, aaravId, userMap.get('ananya.patel@student.didm.edu')!],
        participants: [
          { userId: primaryStudent._id, name: primaryStudent.name, status: 'ACTIVE', joinedAt: new Date(now.getTime() - 30 * 86400000) },
          { userId: aaravId, name: 'Aarav Sharma', status: 'ACTIVE', joinedAt: new Date(now.getTime() - 30 * 86400000) },
          { userId: userMap.get('ananya.patel@student.didm.edu')!, name: 'Ananya Patel', status: 'ACTIVE', joinedAt: new Date(now.getTime() - 30 * 86400000) }
        ],
        lastMessageAt: new Date(now.getTime() - 1 * 3600000),
        lastMessagePreview: 'Thank you Sir! Looking forward to the bidding strategy walkthrough.',
        messageCount: 2,
        status: 'ACTIVE'
      }
    },
    { upsert: true, new: true }
  );

  await CommunicationMessageModel.findOneAndUpdate(
    { tenantId, conversationId: batchConv._id, sequenceNumber: 1 },
    {
      $set: {
        senderUserId: aaravId,
        senderName: 'Aarav Sharma',
        body: 'Welcome everyone! Please ensure you have reviewed the Google Ads RSA documentation prior to today’s session.',
        attachments: [],
        sentAt: new Date(now.getTime() - 3 * 3600000),
        isDeleted: false
      }
    },
    { upsert: true, new: true }
  );

  await CommunicationMessageModel.findOneAndUpdate(
    { tenantId, conversationId: batchConv._id, sequenceNumber: 2 },
    {
      $set: {
        senderUserId: primaryStudent._id,
        senderName: primaryStudent.name,
        body: 'Thank you Sir! Looking forward to the bidding strategy walkthrough.',
        attachments: [],
        sentAt: new Date(now.getTime() - 1 * 3600000),
        isDeleted: false
      }
    },
    { upsert: true, new: true }
  );

  // Direct 1-on-1 Conversation (Aman & Aarav)
  const directConv = await CommunicationConversationModel.findOneAndUpdate(
    { tenantId, fingerprint: 'direct_aman_aarav' },
    {
      $set: {
        type: 'DIRECT',
        title: 'Aman Verma & Aarav Sharma',
        participantUserIds: [primaryStudent._id, aaravId],
        participants: [
          { userId: primaryStudent._id, name: primaryStudent.name, status: 'ACTIVE', joinedAt: new Date(now.getTime() - 30 * 86400000) },
          { userId: aaravId, name: 'Aarav Sharma', status: 'ACTIVE', joinedAt: new Date(now.getTime() - 30 * 86400000) }
        ],
        lastMessageAt: new Date(now.getTime() - 30 * 60000),
        lastMessagePreview: 'Hello Aarav Sir, had a quick question regarding the Target CPA threshold setup...',
        messageCount: 1,
        status: 'ACTIVE'
      }
    },
    { upsert: true, new: true }
  );

  await CommunicationMessageModel.findOneAndUpdate(
    { tenantId, conversationId: directConv._id, sequenceNumber: 1 },
    {
      $set: {
        senderUserId: primaryStudent._id,
        senderName: primaryStudent.name,
        body: 'Hello Aarav Sir, had a quick question regarding the Target CPA threshold setup for smaller client budgets.',
        attachments: [],
        sentAt: new Date(now.getTime() - 30 * 60000),
        isDeleted: false
      }
    },
    { upsert: true, new: true }
  );
  console.log('✓ Seeded Notifications, Published Announcements & Message Conversations');

  // ==========================================
  // 14. CRM LEADS & ADMISSION PIPELINES
  // ==========================================
  for (let lIdx = 0; lIdx < DEMO_CRM_LEADS.length; lIdx++) {
    const leadData = DEMO_CRM_LEADS[lIdx];
    const courseId = courseMap.get(leadData.courseInterest);
    const branchId = branchMap.get(leadData.branchCode);
    const names = leadData.name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    const lead = await LeadModel.findOneAndUpdate(
      { tenantId, email: leadData.email },
      {
        $set: {
          leadCode: `LEAD-2026-${String(lIdx + 1).padStart(4, '0')}`,
          firstName,
          lastName,
          fullName: leadData.name,
          email: leadData.email,
          normalizedEmail: leadData.email.toLowerCase(),
          phone: leadData.phone,
          normalizedPhone: leadData.phone.replace(/[^0-9]/g, ''),
          source: leadData.source,
          stage: leadData.stage,
          qualificationScore: leadData.qualificationScore,
          notes: leadData.notes,
          courseInterestId: courseId,
          branchId,
          assignedTo: adminUser._id
        }
      },
      { upsert: true, new: true }
    );

    // Seed Activity & Follow-up
    await LeadActivityModel.findOneAndUpdate(
      { tenantId, leadId: lead._id, type: 'STAGE_CHANGED' },
      {
        $set: {
          actorId: adminUser._id,
          description: `Lead moved to ${leadData.stage}`,
          createdAt: new Date(now.getTime() - 5 * 86400000)
        }
      },
      { upsert: true, new: true }
    );

    if (leadData.stage === 'FOLLOW_UP' || leadData.stage === 'DEMO_SCHEDULED') {
      await LeadFollowUpModel.findOneAndUpdate(
        { tenantId, leadId: lead._id },
        {
          $set: {
            assignedTo: adminUser._id,
            scheduledAt: new Date(now.getTime() + 2 * 86400000),
            status: 'PENDING',
            notes: 'Follow up regarding batch start date and scholarship availability.'
          }
        },
        { upsert: true, new: true }
      );
    }
  }
  console.log(`✓ Seeded ${DEMO_CRM_LEADS.length} CRM Leads with Activity Timelines & Follow-ups`);

  // ==========================================
  // 15. AUTOMATIONS (Phase 21)
  // ==========================================
  const auto1 = await AutomationModel.findOneAndUpdate(
    { tenantId, name: 'Lead Created -> Instant CRM Task & Outreach' },
    {
      $set: {
        status: 'ACTIVE',
        version: 1,
        triggerType: 'LEAD_CREATED',
        conditions: { mode: 'ALL', items: [] },
        steps: [
          { stepId: 'step_1', type: 'ACTION', actionType: 'CREATE_CRM_TASK', inputs: { taskTitle: 'Call new lead within 15 minutes' } },
          { stepId: 'step_2', type: 'ACTION', actionType: 'SEND_NOTIFICATION', inputs: { template: 'LEAD_WELCOME' } }
        ],
        branchMode: 'ALL',
        branchIds: [],
        capabilitySnapshot: ['CRM', 'COMMUNICATION'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
        publishedAt: new Date(now.getTime() - 20 * 86400000)
      }
    },
    { upsert: true, new: true }
  );

  const auto2 = await AutomationModel.findOneAndUpdate(
    { tenantId, name: 'Payment Collected -> Generate Receipt & SMS' },
    {
      $set: {
        status: 'ACTIVE',
        version: 1,
        triggerType: 'PAYMENT_COLLECTED',
        conditions: { mode: 'ALL', items: [] },
        steps: [
          { stepId: 'step_1', type: 'ACTION', actionType: 'GENERATE_RECEIPT_PDF', inputs: { autoEmail: true } }
        ],
        branchMode: 'ALL',
        branchIds: [],
        capabilitySnapshot: ['FINANCE', 'NOTIFICATION'],
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
        publishedAt: new Date(now.getTime() - 20 * 86400000)
      }
    },
    { upsert: true, new: true }
  );

  // Execution History
  await AutomationExecutionModel.findOneAndUpdate(
    { tenantId, triggerEventId: 'evt_demo_lead_01', automationId: auto1._id, automationVersion: 1 },
    {
      $set: {
        triggerType: 'LEAD_CREATED',
        resourceType: 'Lead',
        resourceId: 'lead_demo_01',
        status: 'COMPLETED',
        currentStep: 2,
        correlationId: 'corr_demo_01',
        snapshot: {
          name: auto1.name,
          triggerType: 'LEAD_CREATED',
          conditions: { mode: 'ALL', items: [] },
          steps: auto1.steps,
          branchMode: 'ALL',
          branchIds: [],
          capabilitySnapshot: ['CRM', 'COMMUNICATION']
        },
        context: {},
        depth: 0,
        startedAt: new Date(now.getTime() - 2 * 3600000),
        completedAt: new Date(now.getTime() - 2 * 3600000 + 500)
      }
    },
    { upsert: true, new: true }
  );
  console.log('✓ Seeded Phase 21 Active Automations & Execution History');

  // ==========================================
  // 16. GOOGLE CLASSROOM & INTEGRATIONS (Phase 22)
  // ==========================================
  const gClassroomConn = await IntegrationConnectionModel.findOneAndUpdate(
    { tenantId, provider: 'GOOGLE_CLASSROOM' },
    {
      $set: {
        status: 'CONNECTED',
        scopeType: 'TENANT',
        externalAccountId: 'didm-classroom-dev@gmail.com',
        scopes: ['https://www.googleapis.com/auth/classroom.courses', 'https://www.googleapis.com/auth/classroom.rosters'],
        metadata: { isDemo: true, connectedDomain: 'didm.edu' }
      }
    },
    { upsert: true, new: true }
  );

  await IntegrationSyncRunModel.findOneAndUpdate(
    { tenantId, connectionId: gClassroomConn._id, scope: 'BATCH:DM-2026-OCT-MORNING' },
    {
      $set: {
        provider: 'GOOGLE_CLASSROOM',
        direction: 'BIDIRECTIONAL',
        status: 'COMPLETED',
        startedAt: new Date(now.getTime() - 4 * 3600000),
        completedAt: new Date(now.getTime() - 4 * 3600000 + 45000),
        counts: {
          teachersSynced: 1,
          studentsSynced: 16,
          courseworkSynced: 4,
          submissionsSynced: 16,
          gradesSynced: 12,
          conflictsDetected: 0,
          conflictsResolved: 0
        },
        correlationId: 'demo_sync_classroom_01',
        metadata: { syncedBatches: ['DM-2026-OCT-MORNING'] }
      }
    },
    { upsert: true, new: true }
  );
  console.log('✓ Seeded Phase 22 Google Classroom & Live Meeting Sync State (Zero external side effects)');

  console.log('\n======================================================');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY WITH ZERO DUPLICATES');
  console.log('======================================================');
  console.log('QA Login & Impersonation Credentials:');
  console.log('  Password for all accounts: DemoPass123!');
  console.log('  SuperAdmin:       superadmin@didm.edu');
  console.log('  Tenant Admin:     admin@didm.edu');
  console.log('  Primary Student:  aman.verma@student.didm.edu');
  console.log('  Primary Teacher:  aarav.sharma@didm.edu');
  console.log('======================================================\n');

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('\n❌ Seed failed with error:', err);
  process.exit(1);
});
