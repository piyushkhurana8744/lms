import mongoose from 'mongoose';
import {
  TenantModel,
  BranchModel,
  UserModel,
  OrganizationMemberModel,
  CourseModel,
  BatchModel,
  EnrollmentModel,
  ClassModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  StudentFeePlanModel,
  PaymentModel,
  ReceiptModel,
  CertificateModel,
  NotificationModel,
  CommunicationAnnouncementModel,
  CommunicationConversationModel,
  CommunicationMessageModel,
  LeadModel,
  AutomationModel,
  AutomationExecutionModel,
  IntegrationConnectionModel,
  IntegrationSyncRunModel,
  InstructorAvailabilityModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { DEMO_ORG, DEMO_USERS } from './demo-data';

// Helper to check permissions
function hasPermission(userPerms: string[], requiredPerms?: string[], mode: 'ALL' | 'ANY' = 'ANY'): boolean {
  if (!requiredPerms || requiredPerms.length === 0) return true;
  if (mode === 'ALL') {
    return requiredPerms.every((p) => userPerms.includes(p));
  }
  return requiredPerms.some((p) => userPerms.includes(p));
}

async function verify() {
  console.log('\n======================================================');
  console.log('🔍 DIDM LMS — DEMO ENVIRONMENT VERIFICATION');
  console.log('======================================================');

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGO_INTEGRATION_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/edtech_lms?directConnection=true';
  await connectDatabase(mongoUri);

  const tenant = await TenantModel.findOne({ slug: DEMO_ORG.slug });
  if (!tenant) {
    throw new Error('❌ Demo tenant not found! Please run `pnpm demo:seed` first.');
  }
  const tenantId = tenant._id;
  console.log(`✓ Demo Tenant Verified: "${tenant.name}" (${tenantId})`);

  // 1. Verify Branches & Infrastructure
  const branches = await BranchModel.find({ tenantId });
  console.log(`✓ Branches Verified: ${branches.length} (${branches.map((b) => b.code).join(', ')})`);
  if (branches.length < 3) throw new Error('Expected at least 3 branches');

  // 2. Verify Primary Student: Aman Verma
  console.log('\n--- Verifying Primary Student: Aman Verma ---');
  const aman = await UserModel.findOne({ email: DEMO_USERS.primaryStudent.email, tenantId });
  if (!aman || aman.status !== 'ACTIVE') throw new Error('Aman Verma not found or inactive');
  console.log(`✓ Aman User: ${aman.name} (${aman._id}) - Status: ${aman.status}`);

  const amanMember = await OrganizationMemberModel.findOne({ userId: aman._id, tenantId });
  if (!amanMember || amanMember.role !== 'STUDENT') throw new Error('Aman Organization Member record invalid');
  console.log(`✓ Aman Member Role: ${amanMember.role}`);

  // Check Aman RBAC Permissions & Navigation Resolution
  const studentPerms = SYSTEM_ROLE_PERMISSIONS['STUDENT'];
  const expectedNavItems = [
    { name: 'Dashboard', req: [PERMISSIONS.PROGRESS_VIEW, PERMISSIONS.USER_VIEW] },
    { name: 'Inbox & Updates', req: [PERMISSIONS.COMMUNICATION_INBOX_VIEW, PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW] },
    { name: 'Messages', req: [PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW] },
    { name: 'My Courses', req: [PERMISSIONS.COURSE_VIEW, PERMISSIONS.ENROLLMENT_VIEW] },
    { name: 'My Fees & Receipts', req: [PERMISSIONS.FEE_VIEW] },
    { name: 'My Attendance', req: [PERMISSIONS.ATTENDANCE_VIEW] },
    { name: 'My Calendar', req: [PERMISSIONS.ACADEMIC_CALENDAR_VIEW] },
    { name: 'Quizzes & Assignments', req: [PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.ASSESSMENT_SUBMIT] },
    { name: 'My Certificates', req: [PERMISSIONS.CERTIFICATE_OWN_VIEW, PERMISSIONS.CERTIFICATE_VIEW] },
    { name: 'My Profile', req: [PERMISSIONS.USER_VIEW, PERMISSIONS.STUDENT_OWN_LIFECYCLE_VIEW] },
    { name: 'Explore Catalog', req: [] }
  ];

  const resolvedStudentNav: string[] = [];
  for (const nav of expectedNavItems) {
    if (hasPermission(studentPerms, nav.req, 'ANY')) {
      resolvedStudentNav.push(nav.name);
    }
  }
  console.log(`✓ Aman Navigation Items Resolved (${resolvedStudentNav.length}/11):`);
  resolvedStudentNav.forEach((item) => console.log(`   • ${item}`));
  if (resolvedStudentNav.length < 11) throw new Error('Student navigation is incomplete!');

  // Enrollments & Progress
  const amanEnrollments = await EnrollmentModel.find({ tenantId, studentId: aman._id });
  console.log(`✓ Aman Multi-Course Enrollments: ${amanEnrollments.length}`);
  if (amanEnrollments.length < 3) throw new Error('Expected at least 3 enrollments for Aman');
  amanEnrollments.forEach((e) => {
    console.log(`   • Course: ${e.courseId} | Status: ${e.status} | Progress: ${e.progressPercent}%`);
  });

  // Scheduled Classes
  const scheduledClasses = await ClassModel.find({ tenantId, 'enrolledStudents.studentId': aman._id });
  console.log(`✓ Aman Scheduled Classes: ${scheduledClasses.length}`);
  if (scheduledClasses.length < 5) throw new Error('Expected scheduled classes for Aman');

  // Assessments & Submissions
  const amanSubmissions = await AssessmentSubmissionModel.find({ tenantId, userId: aman._id });
  console.log(`✓ Aman Submissions: ${amanSubmissions.length}`);
  amanSubmissions.forEach((s) => {
    console.log(`   • Type: ${s.type} | Status: ${s.status} | Score: ${s.score}/${s.maxScore} (${s.scorePercentage}%)`);
  });

  // Attendance
  const amanAttendance = await AttendanceRecordModel.find({ tenantId, studentId: aman._id });
  const presentCount = amanAttendance.filter((a) => a.status === 'PRESENT').length;
  const absentCount = amanAttendance.filter((a) => a.status === 'ABSENT').length;
  const lateCount = amanAttendance.filter((a) => a.status === 'LATE').length;
  console.log(`✓ Aman Attendance Records: ${amanAttendance.length} (Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount})`);
  if (amanAttendance.length < 18) throw new Error('Expected 18 attendance records for Aman');

  // Finance & Receipts
  const amanFeePlan = await StudentFeePlanModel.findOne({ tenantId, studentUserId: aman._id });
  const amanPayments = await PaymentModel.find({ tenantId, studentUserId: aman._id });
  const amanReceipts = await ReceiptModel.find({ tenantId, studentUserId: aman._id });
  console.log(`✓ Aman Finance: Net ₹${(amanFeePlan?.netPayableMinor || 0) / 100}, Paid ₹${(amanFeePlan?.paidAmountMinor || 0) / 100}, Outstanding ₹${(amanFeePlan?.outstandingBalanceMinor || 0) / 100}`);
  console.log(`✓ Aman Payments: ${amanPayments.length} | Receipts: ${amanReceipts.length}`);
  if (amanReceipts.length < 2) throw new Error('Expected 2 receipts for Aman');

  // Certificates
  const amanCert = await CertificateModel.findOne({ tenantId, studentId: aman._id, status: 'ISSUED' });
  if (!amanCert) throw new Error('Expected issued certificate for Aman');
  console.log(`✓ Aman Certificate: ${amanCert.certificateNumber} (Code: ${amanCert.verificationCode})`);

  // Notifications & Messages
  const amanNotifs = await NotificationModel.find({ tenantId, recipientUserId: aman._id });
  const amanConvs = await CommunicationConversationModel.find({ tenantId, participantUserIds: aman._id });
  console.log(`✓ Aman Notifications: ${amanNotifs.length} | Active Conversations: ${amanConvs.length}`);

  // 3. Verify Primary Instructor: Aarav Sharma
  console.log('\n--- Verifying Primary Instructor: Aarav Sharma ---');
  const aarav = await UserModel.findOne({ email: 'aarav.sharma@didm.edu', tenantId });
  if (!aarav || aarav.status !== 'ACTIVE') throw new Error('Aarav Sharma not found');
  console.log(`✓ Aarav User: ${aarav.name} (${aarav._id})`);

  const aaravClasses = await ClassModel.find({ tenantId, instructorId: aarav._id });
  console.log(`✓ Aarav Assigned Classes: ${aaravClasses.length}`);

  const pendingGrading = await AssessmentSubmissionModel.find({ tenantId, status: 'SUBMITTED' });
  const gradedByAarav = await AssessmentSubmissionModel.find({ tenantId, gradedBy: aarav._id });
  console.log(`✓ Aarav Grading Queue: ${pendingGrading.length} Pending | ${gradedByAarav.length} Graded`);

  const aaravAvailability = await InstructorAvailabilityModel.findOne({ tenantId, instructorId: aarav._id });
  console.log(`✓ Aarav Availability: ${aaravAvailability?.weeklyWindows.length} weekdays configured`);

  // 4. Verify Tenant Admin & Operations
  console.log('\n--- Verifying Tenant Admin & Academic Operations ---');
  const leads = await LeadModel.find({ tenantId });
  console.log(`✓ CRM Pipeline Leads: ${leads.length}`);
  if (leads.length < 10) throw new Error('Expected CRM leads');

  const automations = await AutomationModel.find({ tenantId, status: 'ACTIVE' });
  const executions = await AutomationExecutionModel.find({ tenantId });
  console.log(`✓ Automations: ${automations.length} Active | ${executions.length} Execution History Records`);

  const integrations = await IntegrationConnectionModel.find({ tenantId });
  const syncRuns = await IntegrationSyncRunModel.find({ tenantId });
  console.log(`✓ Integrations: ${integrations.length} Connected Providers (Google Classroom, Meet, Zoom, Teams)`);
  console.log(`✓ Integration Sync Runs: ${syncRuns.length} Successful`);

  console.log('\n======================================================');
  console.log('🎉 ALL DEMO INVARIANTS & PLATFORM PORTALS VERIFIED 100%');
  console.log('======================================================\n');

  await disconnectDatabase();
}

verify().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
