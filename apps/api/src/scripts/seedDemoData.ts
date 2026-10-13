import dotenv from 'dotenv';
import {
  connectDatabase,
  disconnectDatabase,
  UserModel,
  TenantModel,
  RoleModel,
  OrganizationMemberModel,
  CourseModel,
  CourseModuleModel,
  LessonModel,
  BatchModel,
  ClassModel,
  EnrollmentModel,
  LessonProgressModel,
  AssessmentModel,
  AssessmentSubmissionModel
} from '@edtech/database';
import { hashPassword } from '@edtech/utils';
import { SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';

dotenv.config();

async function seedDemoData() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/edtech_lms';
  console.log('🚀 [Demo Seeder] Initializing DIDM LMS Demo Dataset...');

  await connectDatabase(mongoUri);

  // 1. Create or Find DIDM Tenant
  let tenant = await TenantModel.findOne({ slug: 'didm' });
  if (!tenant) {
    tenant = await TenantModel.create({
      name: 'DIDM Delhi Central',
      slug: 'didm',
      planId: 'ENTERPRISE',
      status: 'ACTIVE',
      branding: {
        companyName: 'DIDM Digital Institute',
        primaryColor: '#BE1E2E',
        secondaryColor: '#FFFFFF',
        showPlatformBranding: true
      }
    });
    console.log(`✅ [Tenant] Created Tenant: ${tenant.name} (${tenant.slug})`);
  }

  // 2. Ensure Core System Roles exist
  const systemRoles = [
    {
      tenantId: tenant._id,
      name: 'Super Admin',
      slug: 'super-admin',
      permissions: SYSTEM_ROLE_PERMISSIONS.SUPER_ADMIN,
      isSystemRole: true
    },
    {
      tenantId: tenant._id,
      name: 'Tenant Admin',
      slug: 'tenant_admin',
      permissions: SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN,
      isSystemRole: true
    },
    {
      tenantId: tenant._id,
      name: 'Instructor',
      slug: 'instructor',
      permissions: SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR,
      isSystemRole: true
    },
    {
      tenantId: tenant._id,
      name: 'Student',
      slug: 'student',
      permissions: SYSTEM_ROLE_PERMISSIONS.STUDENT,
      isSystemRole: true
    }
  ];

  const roleMap: Record<string, any> = {};
  for (const r of systemRoles) {
    let role = await RoleModel.findOneAndUpdate(
      { tenantId: tenant._id, slug: r.slug },
      { $set: { permissions: r.permissions, isSystemRole: true, name: r.name } },
      { upsert: true, new: true }
    );
    roleMap[r.slug] = role._id;
  }

  // 3. Create Demo Users
  const defaultPassword = 'Password123!';
  const defaultPasswordHash = await hashPassword(defaultPassword);

  const demoUsers = [
    {
      name: 'Platform SuperAdmin',
      email: 'superadmin@didm.in',
      isSuperAdmin: true,
      roles: [roleMap['super-admin']],
      tenantId: null,
      allowedTenantIds: [tenant._id]
    },
    {
      name: 'Vikas Sharma (Admin)',
      email: 'admin@didm.in',
      isSuperAdmin: false,
      roles: [roleMap['tenant_admin']],
      tenantId: tenant._id,
      allowedTenantIds: [tenant._id]
    },
    {
      name: 'Rahul Sharma (Master Trainer)',
      email: 'trainer@didm.in',
      isSuperAdmin: false,
      roles: [roleMap['instructor']],
      tenantId: tenant._id,
      allowedTenantIds: [tenant._id]
    },
    {
      name: 'Aman Verma (Student)',
      email: 'student@didm.in',
      isSuperAdmin: false,
      roles: [roleMap['student']],
      tenantId: tenant._id,
      allowedTenantIds: [tenant._id]
    }
  ];

  const userMap: Record<string, any> = {};

  for (const u of demoUsers) {
    let user = await UserModel.findOne({ email: u.email });
    if (user) {
      user.name = u.name;
      user.roles = u.roles;
      user.isSuperAdmin = u.isSuperAdmin;
      user.tenantId = u.tenantId;
      user.allowedTenantIds = u.allowedTenantIds as any;
      await user.save();
    } else {
      user = await UserModel.create({
        ...u,
        passwordHash: defaultPasswordHash,
        status: 'ACTIVE',
        emailVerified: true
      });
    }
    userMap[u.email] = user;
    console.log(`👤 [User] ${u.name} (${u.email}) ready.`);
  }

  // 4. Create Organization Memberships
  await OrganizationMemberModel.findOneAndUpdate(
    { tenantId: tenant._id, userId: userMap['admin@didm.in']._id },
    {
      tenantId: tenant._id,
      userId: userMap['admin@didm.in']._id,
      role: 'TENANT_ADMIN',
      status: 'ACTIVE',
      employeeDetails: { designation: 'Center Director & Lead Admin', department: 'Management' }
    },
    { upsert: true }
  );

  await OrganizationMemberModel.findOneAndUpdate(
    { tenantId: tenant._id, userId: userMap['trainer@didm.in']._id },
    {
      tenantId: tenant._id,
      userId: userMap['trainer@didm.in']._id,
      role: 'INSTRUCTOR',
      status: 'ACTIVE',
      employeeDetails: {
        designation: 'Senior Lead Trainer (Performance Marketing & SEO)',
        department: 'Academics',
        experienceYears: 8
      }
    },
    { upsert: true }
  );

  await OrganizationMemberModel.findOneAndUpdate(
    { tenantId: tenant._id, userId: userMap['student@didm.in']._id },
    {
      tenantId: tenant._id,
      userId: userMap['student@didm.in']._id,
      role: 'STUDENT',
      status: 'ACTIVE'
    },
    { upsert: true }
  );

  // 5. Create Course & Modules & Lessons
  let course = await CourseModel.findOne({ tenantId: tenant._id, slug: 'master-digital-marketing' });
  if (!course) {
    course = await CourseModel.create({
      tenantId: tenant._id,
      title: 'Master in Digital Marketing & AI Strategy (2026 Edition)',
      slug: 'master-digital-marketing',
      shortDescription: 'Comprehensive hands-on digital marketing mastery with live practical campaigns.',
      description: 'Master Search Engine Optimization, Google Ads, Meta Ads Manager, AI Content Generation, and Performance Funnels with real-world case studies.',
      level: 'ALL_LEVELS',
      language: 'English/Hindi',
      durationMinutes: 7200,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      publishedAt: new Date(),
      createdBy: userMap['trainer@didm.in']._id
    });
    console.log(`📚 [Course] Created Course: ${course.title}`);
  }

  // Modules
  let module1 = await CourseModuleModel.findOne({ courseId: course._id, order: 1 });
  if (!module1) {
    module1 = await CourseModuleModel.create({
      tenantId: tenant._id,
      courseId: course._id,
      title: 'Module 1: Foundations of Search & High-ROI SEO',
      description: 'Keyword research, on-page optimization, and technical SEO architecture.',
      order: 1,
      status: 'ACTIVE'
    });
  }

  let module2 = await CourseModuleModel.findOne({ courseId: course._id, order: 2 });
  if (!module2) {
    module2 = await CourseModuleModel.create({
      tenantId: tenant._id,
      courseId: course._id,
      title: 'Module 2: Google Search & Performance Max Ads',
      description: 'Campaign setup, bidding strategies, ad copy writing, and conversion tracking.',
      order: 2,
      status: 'ACTIVE'
    });
  }

  // Lessons for Module 1
  const lesson1_1 = await LessonModel.findOneAndUpdate(
    { courseId: course._id, moduleId: module1._id, order: 1 },
    {
      tenantId: tenant._id,
      courseId: course._id,
      moduleId: module1._id,
      title: 'Introduction to SEO Architecture & Crawlers',
      description: 'Understand how search engine spiders index content.',
      type: 'VIDEO',
      order: 1,
      status: 'ACTIVE',
      isPreview: true,
      estimatedDurationMinutes: 25,
      content: {
        url: 'https://www.youtube.com/watch?v=DvwS7cV9GmQ',
        provider: 'YOUTUBE',
        durationSeconds: 1500
      }
    },
    { upsert: true, new: true }
  );

  const lesson1_2 = await LessonModel.findOneAndUpdate(
    { courseId: course._id, moduleId: module1._id, order: 2 },
    {
      tenantId: tenant._id,
      courseId: course._id,
      moduleId: module1._id,
      title: 'Advanced Keyword Intent Mapping & Competitor GAP Analysis',
      description: 'Step-by-step keyword clustering and search intent analysis.',
      type: 'TEXT',
      order: 2,
      status: 'ACTIVE',
      isPreview: false,
      estimatedDurationMinutes: 20,
      content: {
        bodyHtml: '<h3>Keyword Mapping Framework</h3><p>Learn the 4 core buckets: Informational, Navigational, Commercial, and Transactional search queries.</p>'
      }
    },
    { upsert: true, new: true }
  );

  // 6. Create Batch assigned to Trainer
  let batch = await BatchModel.findOne({ tenantId: tenant._id, batchCode: 'DM-2026-A' });
  if (!batch) {
    batch = await BatchModel.create({
      tenantId: tenant._id,
      name: 'Batch DM-2026-A: Morning Performance Cohort',
      batchCode: 'DM-2026-A',
      courseId: course._id,
      instructorId: userMap['trainer@didm.in']._id,
      mode: 'HYBRID',
      status: 'ONGOING',
      startDate: new Date(),
      timing: {
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        timezone: 'Asia/Kolkata'
      },
      daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
      maxSeats: 35,
      enrolledCount: 1,
      showOnWebsite: true,
      zoomDetails: {
        meetingUrl: 'https://meet.google.com/didm-dm-cohort',
        meetingId: 'didm-dm-cohort',
        passcode: 'DIDM2026',
        instructions: 'Please join 5 minutes early with your camera enabled.'
      }
    });
    console.log(`🎓 [Batch] Created Batch: ${batch.name} assigned to Trainer Rahul Sharma`);
  }

  // 7. Create Live Class for Today
  const today = new Date();
  const classSession = await ClassModel.findOneAndUpdate(
    { tenantId: tenant._id, batchId: batch._id },
    {
      tenantId: tenant._id,
      name: 'Live Session 4: Practical Campaign Setup & Conversion Tracking',
      classCode: 'CLS-ONL-001',
      batchId: batch._id,
      courseId: course._id,
      mode: 'ONLINE',
      capacity: 35,
      enrolledCount: 1,
      enrolledStudents: [
        {
          studentId: userMap['student@didm.in']._id,
          studentName: 'Aman Verma (Student)',
          studentEmail: 'student@didm.in',
          enrolledAt: today,
          status: 'ENROLLED'
        }
      ],
      startDate: today,
      timing: {
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        timezone: 'Asia/Kolkata'
      },
      zoomDetails: {
        meetingUrl: 'https://meet.google.com/didm-dm-cohort',
        meetingId: 'didm-dm-cohort',
        passcode: 'DIDM2026',
        instructions: 'Please join 5 minutes early with your camera enabled.'
      },
      showOnWebsite: true,
      status: 'SCHEDULED'
    },
    { upsert: true, new: true }
  );

  // 8. Enroll Student Aman Verma
  const enrollment = await EnrollmentModel.findOneAndUpdate(
    { tenantId: tenant._id, studentId: userMap['student@didm.in']._id, courseId: course._id },
    {
      tenantId: tenant._id,
      studentId: userMap['student@didm.in']._id,
      courseId: course._id,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progressPercent: 50,
      completedLessons: 1,
      totalLessons: 2,
      lastLessonId: lesson1_1._id
    },
    { upsert: true, new: true }
  );

  await LessonProgressModel.findOneAndUpdate(
    { tenantId: tenant._id, studentId: userMap['student@didm.in']._id, lessonId: lesson1_1._id },
    {
      tenantId: tenant._id,
      studentId: userMap['student@didm.in']._id,
      courseId: course._id,
      moduleId: module1._id,
      lessonId: lesson1_1._id,
      status: 'COMPLETED',
      completedAt: new Date(),
      lastPositionSeconds: 1500
    },
    { upsert: true }
  );

  // 9. Seed Demo Assessments (Independent & Course-linked Quizzes + Assignments)
  const quiz1 = await AssessmentModel.findOneAndUpdate(
    { tenantId: tenant._id, slug: 'digital-marketing-mastery-quiz-2026' },
    {
      tenantId: tenant._id,
      type: 'QUIZ',
      scope: 'INDEPENDENT',
      title: 'Digital Marketing Mastery Entrance Assessment 2026',
      slug: 'digital-marketing-mastery-quiz-2026',
      description: 'Test your foundational knowledge in SEO, PPC, Analytics, and Social Media Marketing. Standalone skill test with instant certification score.',
      instructions: 'You have 15 minutes to answer 5 multiple-choice questions. Passing score is 60%.',
      showOnWebsite: true,
      status: 'PUBLISHED',
      durationMinutes: 15,
      passingScorePercent: 60,
      maxAttempts: 3,
      createdBy: userMap['trainer@didm.in']._id,
      questions: [
        {
          questionText: 'Which HTTP status code signifies a permanent redirect important for preserving SEO link juice?',
          questionType: 'MULTIPLE_CHOICE',
          points: 20,
          options: [
            { text: '301 Moved Permanently', isCorrect: true },
            { text: '302 Found / Temporary Redirect', isCorrect: false },
            { text: '404 Not Found', isCorrect: false },
            { text: '500 Internal Server Error', isCorrect: false }
          ]
        },
        {
          questionText: 'In Google Ads, what key metric calculates Ad Rank during real-time auctions?',
          questionType: 'MULTIPLE_CHOICE',
          points: 20,
          options: [
            { text: 'Max CPC Bid multiplied by Quality Score', isCorrect: true },
            { text: 'Total Account Spend per month', isCorrect: false },
            { text: 'Number of Keywords in Ad Group', isCorrect: false },
            { text: 'Website Hosting Server Speed alone', isCorrect: false }
          ]
        },
        {
          questionText: 'Which attribution model gives 100% credit to the first touchpoint in a user journey?',
          questionType: 'MULTIPLE_CHOICE',
          points: 20,
          options: [
            { text: 'First Click Attribution', isCorrect: true },
            { text: 'Last Non-Direct Click', isCorrect: false },
            { text: 'Linear Attribution', isCorrect: false },
            { text: 'Time Decay Attribution', isCorrect: false }
          ]
        },
        {
          questionText: 'What is the primary benefit of deploying Meta Conversions API (CAPI) alongside the Meta Pixel?',
          questionType: 'MULTIPLE_CHOICE',
          points: 20,
          options: [
            { text: 'Server-side event tracking resilient to browser ad-blockers and iOS privacy restrictions', isCorrect: true },
            { text: 'Free automated ad copy generation', isCorrect: false },
            { text: 'Eliminating the need for a marketing budget', isCorrect: false },
            { text: 'Instantly verifying Facebook page blue badge', isCorrect: false }
          ]
        },
        {
          questionText: 'Which metric measures the return on ad spend calculated as (Revenue from Ads / Ad Spend) * 100?',
          questionType: 'MULTIPLE_CHOICE',
          points: 20,
          options: [
            { text: 'ROAS (Return on Ad Spend)', isCorrect: true },
            { text: 'CTR (Click-Through Rate)', isCorrect: false },
            { text: 'CPM (Cost Per Mille)', isCorrect: false },
            { text: 'CAC (Customer Acquisition Cost)', isCorrect: false }
          ]
        }
      ]
    },
    { upsert: true, new: true }
  );

  const quiz2 = await AssessmentModel.findOneAndUpdate(
    { tenantId: tenant._id, slug: 'meta-ads-campaign-assessment' },
    {
      tenantId: tenant._id,
      type: 'QUIZ',
      scope: 'COURSE_LINKED',
      courseId: course._id,
      batchId: batch._id,
      title: 'Meta Ads & Audience Targeting Checkpoint Quiz',
      slug: 'meta-ads-campaign-assessment',
      description: 'Course-linked milestone quiz for Master in Digital Marketing cohort.',
      instructions: 'Review custom audiences, lookalikes, and bidding strategies before attempting.',
      showOnWebsite: true,
      status: 'PUBLISHED',
      durationMinutes: 10,
      passingScorePercent: 70,
      maxAttempts: 2,
      createdBy: userMap['trainer@didm.in']._id,
      questions: [
        {
          questionText: 'What is a Custom Audience built from?',
          questionType: 'MULTIPLE_CHOICE',
          points: 50,
          options: [
            { text: 'First-party customer lists, website visitors, or app users', isCorrect: true },
            { text: 'Randomly generated phone directories', isCorrect: false },
            { text: 'Competitor private subscriber lists', isCorrect: false }
          ]
        },
        {
          questionText: 'Which Advantage+ campaign type uses machine learning to dynamically test headlines and creatives?',
          questionType: 'MULTIPLE_CHOICE',
          points: 50,
          options: [
            { text: 'Advantage+ Shopping / Creative Campaigns', isCorrect: true },
            { text: 'Manual Boost Post on mobile', isCorrect: false },
            { text: 'Organic Story polls', isCorrect: false }
          ]
        }
      ]
    },
    { upsert: true, new: true }
  );

  const assignment1 = await AssessmentModel.findOneAndUpdate(
    { tenantId: tenant._id, slug: 'growth-marketing-capstone-project' },
    {
      tenantId: tenant._id,
      type: 'ASSIGNMENT',
      scope: 'COURSE_LINKED',
      courseId: course._id,
      batchId: batch._id,
      title: 'Capstone Project: 360° Multi-Channel Growth Strategy & Budget Plan',
      slug: 'growth-marketing-capstone-project',
      description: 'Comprehensive practical assignment where you formulate a $10,000/month digital acquisition roadmap including SEO keyword cluster, Meta ads funnel, and Google search campaign setup.',
      instructions: 'Submit a PDF report or a Google Slides/Doc link showcasing your funnel diagram, projected CPA, and creative matrix.',
      showOnWebsite: false,
      status: 'PUBLISHED',
      createdBy: userMap['trainer@didm.in']._id,
      assignmentDetails: {
        maxScore: 100,
        submissionType: 'FILE_UPLOAD',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        rubric: '1. Audience Persona & Research (25 pts)\n2. Funnel Architecture & Budget (35 pts)\n3. Ad Copy & Creatives (25 pts)\n4. KPI & Attribution Framework (15 pts)'
      }
    },
    { upsert: true, new: true }
  );

  console.log(`📝 [Assessments] Seeded Demo Quizzes & Capstone Assignment successfully.`);

  console.log('\n======================================================');
  console.log('🎉 [SUCCESS] DIDM LMS Demo Dataset Initialized!');
  console.log('======================================================');
  console.log('🔑 TEST ACCOUNTS (Password for all accounts: Password123!)');
  console.log('------------------------------------------------------');
  console.log('1. SuperAdmin (Platform): superadmin@didm.in');
  console.log('2. Tenant Admin:         admin@didm.in');
  console.log('3. Trainer / Instructor: trainer@didm.in  (Assigned to Batch DM-2026-A)');
  console.log('4. Student / Learner:    student@didm.in  (Enrolled in Course & Batch)');
  console.log('======================================================\n');

  await disconnectDatabase();
  process.exit(0);
}

seedDemoData().catch((err) => {
  console.error('❌ [Seed Script Error]', err);
  process.exit(1);
});
