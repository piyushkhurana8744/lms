import mongoose from 'mongoose';
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
import { DEMO_ORG } from './demo-data';

// ==========================================
// SAFETY CHECK — PREVENT RUNNING IN PROD
// ==========================================
if (process.env.NODE_ENV === 'production') {
  console.error('\n🚨 FATAL ERROR: Demo reset cannot run in a production environment!');
  process.exit(1);
}

async function reset() {
  console.log('\n======================================================');
  console.log('🧹 DIDM LMS — DEMO ENVIRONMENT RESET');
  console.log('======================================================');

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGO_INTEGRATION_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/edtech_lms?directConnection=true';
  await connectDatabase(mongoUri);

  const demoTenant = await TenantModel.findOne({ slug: DEMO_ORG.slug });
  if (!demoTenant) {
    console.log('ℹ️ No existing demo tenant found (slug: didm-demo). Nothing to reset.');
    await disconnectDatabase();
    return;
  }

  const tenantId = demoTenant._id;
  console.log(`Found demo tenant: ${demoTenant.name} (${tenantId})`);

  // Target purge of all demo data
  const purgeModels = [
    BranchModel,
    AcademicRoomModel,
    RoleModel,
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
    InstructorAvailabilityModel
  ];

  for (const model of purgeModels) {
    const res = await model.deleteMany({ tenantId });
    if (res.deletedCount > 0) {
      console.log(`  - Deleted ${res.deletedCount} records from ${model.collection.name}`);
    }
  }

  // Delete demo tenant users & global superadmin created for demo
  const userRes = await UserModel.deleteMany({
    $or: [
      { tenantId },
      { email: { $regex: /@(student\.)?didm\.edu$/i } }
    ]
  });
  console.log(`  - Deleted ${userRes.deletedCount} demo users`);

  // Delete Demo Tenant
  await TenantModel.deleteOne({ _id: tenantId });
  console.log(`✓ Deleted demo tenant "${demoTenant.name}" (${tenantId})`);

  console.log('\n======================================================');
  console.log('✅ DEMO ENVIRONMENT RESET COMPLETED');
  console.log('======================================================\n');

  await disconnectDatabase();
}

reset().catch((err) => {
  console.error('\n❌ Reset failed with error:', err);
  process.exit(1);
});
