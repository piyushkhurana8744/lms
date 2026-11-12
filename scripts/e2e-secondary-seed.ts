import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase, TenantModel, BranchModel, UserModel, OrganizationMemberModel, CourseModel, BatchModel, EnrollmentModel, ClassModel, AttendanceSessionModel, AttendanceRecordModel, AssessmentModel, AssessmentSubmissionModel, PaymentModel, NotificationModel } from '@edtech/database';
import { hashPassword } from '@edtech/utils';

if (process.env.NODE_ENV !== 'test' || process.env.WAVE05_E2E_OWNED !== '1') throw new Error('Secondary E2E seed requires the owned test orchestrator');
const uri = process.env.MONGO_URI || '';
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/edtech_lms_e2e_[a-z0-9_]+\?replicaSet=/i.test(uri)) throw new Error('Refusing non-owned MongoDB URI');

async function seed() {
  await connectDatabase(uri);
  const tenantId = new mongoose.Types.ObjectId('700000000000000000000001');
  const branchId = new mongoose.Types.ObjectId('700000000000000000000002');
  const adminId = new mongoose.Types.ObjectId('700000000000000000000003');
  const instructorId = new mongoose.Types.ObjectId('700000000000000000000004');
  const studentId = new mongoose.Types.ObjectId('700000000000000000000005');
  const courseId = new mongoose.Types.ObjectId('700000000000000000000006');
  const batchId = new mongoose.Types.ObjectId('700000000000000000000007');
  const classId = new mongoose.Types.ObjectId('700000000000000000000008');
  const assessmentId = new mongoose.Types.ObjectId('700000000000000000000009');
  const passwordHash = await hashPassword(process.env.E2E_DEMO_PASSWORD || 'Wave05LocalOnly!');
  await TenantModel.collection.updateOne({ _id: tenantId }, { $set: { name: 'Wave 0.5 Isolation Tenant', slug: 'wave05-isolation', status: 'ACTIVE' } }, { upsert: true });
  await BranchModel.collection.updateOne({ _id: branchId }, { $set: { tenantId, code: 'ISO', slug: 'isolation', name: 'Isolation Branch', status: 'ACTIVE', timezone: 'Asia/Kolkata', isPrimary: true, revision: 0 } }, { upsert: true });
  for (const [id, name, email, role] of [[adminId,'Isolation Admin','admin@isolation.invalid','TENANT_ADMIN'],[instructorId,'Isolation Instructor','instructor@isolation.invalid','INSTRUCTOR'],[studentId,'Isolation Student','student@isolation.invalid','STUDENT']] as const) {
    await UserModel.collection.updateOne({ _id: id }, { $set: { tenantId, allowedTenantIds: [tenantId], name, email, passwordHash, status: 'ACTIVE', emailVerified: true, isSuperAdmin: false } }, { upsert: true });
    await OrganizationMemberModel.collection.updateOne({ tenantId, userId: id }, { $set: { role, status: 'ACTIVE', branchAccessMode: role === 'TENANT_ADMIN' ? 'ALL' : 'SELECTED', branchIds: [branchId], joinedAt: new Date() } }, { upsert: true });
  }
  await CourseModel.collection.updateOne({ _id: courseId }, { $set: { tenantId, title: 'Isolation Safety Course', slug: 'isolation-safety', status: 'PUBLISHED' } }, { upsert: true });
  await BatchModel.collection.updateOne({ _id: batchId }, { $set: { tenantId, branchId, courseId, instructorId, name: 'Isolation Batch', batchCode: 'ISO-1', mode: 'ONLINE', status: 'ONGOING', startDate: new Date(), maxSeats: 10, enrolledCount: 1, timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' }, daysOfWeek: ['MONDAY'], showOnWebsite: false } }, { upsert: true });
  await EnrollmentModel.collection.updateOne({ tenantId, studentId, courseId }, { $set: { status: 'ACTIVE', batchId, enrolledAt: new Date(), progressPercent: 10, completedLessons: 0, totalLessons: 1 } }, { upsert: true });
  await ClassModel.collection.updateOne({ _id: classId }, { $set: { tenantId, branchId, courseId, batchId, instructorId, name: 'Isolation Class', classCode: 'ISO-C1', mode: 'ONLINE', status: 'SCHEDULED', startDate: new Date(Date.now()+86400000), timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' }, enrolledStudents: [{ studentId, status: 'ENROLLED', enrolledAt: new Date() }] } }, { upsert: true });
  const sessionId = new mongoose.Types.ObjectId('70000000000000000000000a');
  await AttendanceSessionModel.collection.updateOne({ _id: sessionId }, { $set: { tenantId, classId, batchId, courseId, sessionDate: new Date(), status: 'FINALIZED', openedBy: adminId, expectedStudentCount: 1, markedStudentCount: 1 } }, { upsert: true });
  await AttendanceRecordModel.collection.updateOne({ tenantId, attendanceSessionId: sessionId, studentId }, { $set: { classId, batchId, status: 'PRESENT', source: 'MANUAL', correctionCount: 0 } }, { upsert: true });
  await AssessmentModel.collection.updateOne({ _id: assessmentId }, { $set: { tenantId, courseId, batchId, title: 'Isolation Quiz', slug: 'isolation-quiz', type: 'QUIZ', status: 'PUBLISHED', totalMarks: 10 } }, { upsert: true });
  await AssessmentSubmissionModel.collection.updateOne({ tenantId, assessmentId, userId: studentId }, { $set: { type: 'QUIZ', status: 'SUBMITTED', submittedAt: new Date(), maxScore: 10 } }, { upsert: true });
  await PaymentModel.collection.updateOne({ tenantId, idempotencyKey: 'wave05-isolation-payment' }, { $set: { studentUserId: studentId, amountMinor: 1000, currency: 'INR', status: 'SUCCESS', method: 'CASH', collectedBy: adminId } }, { upsert: true });
  await NotificationModel.collection.updateOne({ tenantId, recipientUserId: studentId, deduplicationKey: 'wave05-isolation-notification' }, { $set: { type: 'system', category: 'SYSTEM', title: 'Isolation notice', body: 'Synthetic Wave 0.5 data', sourceType: 'System', sourceId: 'wave05', occurrenceKey: '1', readAt: null } }, { upsert: true });
  await disconnectDatabase();
}
seed().catch(async error => { console.error('Secondary E2E seed failed:', error instanceof Error ? error.message : 'unknown'); await disconnectDatabase().catch(()=>undefined); process.exit(1); });
