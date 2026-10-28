import crypto from 'crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import {
  BatchModel,
  BranchModel,
  CourseModel,
  CRMExternalLinkModel,
  CRMWebhookEventModel,
  EnrollmentModel,
  OrganizationMemberModel,
  StudentLifecycleModel,
  TenantModel,
  UserModel,
  runInTransaction
} from '@edtech/database';
import { hashPassword, tenantContextStorage } from '@edtech/utils';
import { BadRequestError, ConflictError, UnauthorizedError } from '../errors/appError';
import { EnrollmentService } from './enrollment.service';
import { StudentLifecycleService } from './studentLifecycle.service';

const envelopeSchema = z.object({
  eventId: z.string().trim().min(8).max(200),
  eventType: z.enum(['batch.upserted', 'student.transfer_requested', 'student.batch_transferred']),
  tenantId: z.string().refine(Types.ObjectId.isValid),
  orgNumber: z.string().trim().min(1).max(100),
  occurredAt: z.coerce.date(),
  data: z.record(z.any())
});

const batchSchema = z.object({
  externalBatchId: z.string().min(1),
  externalBranchId: z.string().min(1),
  externalCourseId: z.string().min(1),
  lmsBranchId: z.string().refine(Types.ObjectId.isValid),
  lmsCourseId: z.string().refine(Types.ObjectId.isValid),
  name: z.string().trim().min(2).max(200),
  batchCode: z.string().trim().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  daysOfWeek: z.array(z.string()).default([]),
  mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']),
  maxSeats: z.coerce.number().int().positive().default(30),
  classroom: z.string().optional()
});

const studentSchema = z.object({
  externalAdmissionId: z.string().min(1),
  externalBatchId: z.string().min(1),
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
  admissionNumber: z.string().trim().optional()
});

export class CRMIntegrationService {
  static verifySignature(rawBody: string, timestamp: string, signature: string): void {
    const secret = process.env.CRM_WEBHOOK_SECRET || '';
    if (!secret) throw new Error('CRM_WEBHOOK_SECRET is not configured');
    if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp) * 1000) > 5 * 60 * 1000) {
      throw new UnauthorizedError('Expired or invalid CRM webhook timestamp');
    }
    const expected = `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new UnauthorizedError('Invalid CRM webhook signature');
    }
  }

  static async handle(rawEnvelope: unknown): Promise<Record<string, any>> {
    const envelope = envelopeSchema.parse(rawEnvelope);
    const tenant = await TenantModel.findOne({ _id: envelope.tenantId, status: 'ACTIVE' }).setOptions({ bypassTenantFilter: true }).lean();
    if (!tenant) throw new BadRequestError('CRM integration tenant is unavailable');

    const prior = await CRMWebhookEventModel.findOne({ eventId: envelope.eventId }).setOptions({ bypassTenantFilter: true });
    if (prior?.status === 'PROCESSED') return { ...prior.result, deduplicated: true };
    if (prior?.status === 'PROCESSING' && Date.now() - prior.updatedAt.getTime() < 60_000) throw new ConflictError('CRM event is already processing');

    const event = prior || await CRMWebhookEventModel.create({
      tenantId: new Types.ObjectId(envelope.tenantId), orgNumber: envelope.orgNumber,
      eventId: envelope.eventId, eventType: envelope.eventType, status: 'PROCESSING', payload: envelope.data
    });
    event.status = 'PROCESSING'; event.error = undefined; await event.save();

    try {
      const result = await tenantContextStorage.run({
        currentTenantId: envelope.tenantId,
        currentUserId: 'crm-integration',
        isPlatformContext: false,
        allowedTenantIds: [envelope.tenantId]
      }, async () => {
        if (envelope.eventType === 'batch.upserted') return this.upsertBatch(envelope.tenantId, envelope.orgNumber, envelope.data);
        if (envelope.eventType === 'student.transfer_requested') return this.transferStudent(envelope.tenantId, envelope.orgNumber, envelope.data);
        return this.transferBatch(envelope.tenantId, envelope.orgNumber, envelope.data);
      });
      event.status = 'PROCESSED'; event.result = result; event.processedAt = new Date(); await event.save();
      return result;
    } catch (error: any) {
      event.status = 'FAILED'; event.error = String(error?.message || error).slice(0, 2000); await event.save();
      throw error;
    }
  }

  private static async upsertBatch(tenantId: string, orgNumber: string, raw: unknown) {
    const data = batchSchema.parse(raw);
    const [branch, course] = await Promise.all([
      BranchModel.findOne({ _id: data.lmsBranchId, tenantId, status: 'ACTIVE' }),
      CourseModel.findOne({ _id: data.lmsCourseId, tenantId })
    ]);
    if (!branch) throw new BadRequestError('Mapped LMS branch is invalid or inactive');
    if (!course) throw new BadRequestError('Mapped LMS course is invalid');

    const link = await CRMExternalLinkModel.findOne({ tenantId, orgNumber, resourceType: 'BATCH', externalId: data.externalBatchId });
    let batch = link ? await BatchModel.findOne({ _id: link.canonicalId, tenantId }) : null;
    const values = {
      tenantId: new Types.ObjectId(tenantId), name: data.name, batchCode: data.batchCode.toUpperCase(),
      branchId: branch._id, courseId: course._id, mode: data.mode, status: data.status,
      startDate: data.startDate, endDate: data.endDate,
      timing: { startTime: data.startTime, endTime: data.endTime, timezone: branch.timezone || 'Asia/Kolkata' },
      daysOfWeek: data.daysOfWeek, maxSeats: data.maxSeats, showOnWebsite: false,
      classroomDetails: { branch: branch.name, roomNumber: data.classroom }
    };
    if (batch) { batch.set(values); await batch.save(); }
    else {
      batch = await BatchModel.findOne({ tenantId, batchCode: data.batchCode.toUpperCase() }) || await BatchModel.create({ ...values, enrolledCount: 0 });
    }
    await Promise.all([
      this.link(tenantId, orgNumber, 'BATCH', data.externalBatchId, batch._id.toString()),
      this.link(tenantId, orgNumber, 'BRANCH', data.externalBranchId, branch._id.toString()),
      this.link(tenantId, orgNumber, 'COURSE', data.externalCourseId, course._id.toString())
    ]);
    return { resourceType: 'BATCH', externalId: data.externalBatchId, lmsBatchId: batch._id.toString(), status: 'SYNCED' };
  }

  private static async transferStudent(tenantId: string, orgNumber: string, raw: unknown) {
    const data = studentSchema.parse(raw);
    const existingLink = await CRMExternalLinkModel.findOne({ tenantId, orgNumber, resourceType: 'ADMISSION', externalId: data.externalAdmissionId });
    if (existingLink) return { resourceType: 'ADMISSION', externalId: data.externalAdmissionId, lmsStudentId: existingLink.canonicalId, status: 'SYNCED' };
    const batchLink = await CRMExternalLinkModel.findOne({ tenantId, orgNumber, resourceType: 'BATCH', externalId: data.externalBatchId });
    if (!batchLink) throw new BadRequestError('CRM batch has not been synced to LMS');
    const batch = await BatchModel.findOne({ _id: batchLink.canonicalId, tenantId, status: { $in: ['UPCOMING', 'ONGOING'] } });
    if (!batch?.courseId || !batch.branchId) throw new BadRequestError('Mapped LMS batch is not active or lacks course/branch');

    const passwordHash = await hashPassword(crypto.randomBytes(24).toString('base64url'));
    const result = await runInTransaction(async (session) => {
      let user = await UserModel.findOne({ tenantId, email: data.email }).session(session);
      if (!user) [user] = await UserModel.create([{ tenantId: new Types.ObjectId(tenantId), allowedTenantIds: [new Types.ObjectId(tenantId)], name: data.name, email: data.email, phone: data.phone, passwordHash, status: 'ACTIVE', emailVerified: false, isSuperAdmin: false, roles: [] }], { session });
      else { user.name = data.name; if (data.phone) user.phone = data.phone; if (!user.allowedTenantIds.some(id => id.equals(tenantId))) user.allowedTenantIds.push(new Types.ObjectId(tenantId)); await user.save({ session }); }
      const member = await OrganizationMemberModel.findOneAndUpdate(
        { tenantId, userId: user._id },
        { $set: { role: 'STUDENT', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [batch.branchId] }, $setOnInsert: { joinedAt: new Date() } },
        { upsert: true, new: true, session, setDefaultsOnInsert: true }
      );
      const enrollment: any = await EnrollmentService.enrollStudent(user._id.toString(), batch.courseId!.toString(), session);
      const lifecycle = await StudentLifecycleService.initializeLifecycle({ tenantId, studentUserId: user._id, currentEnrollmentId: enrollment._id, courseId: batch.courseId, currentBatchId: batch._id, currentBranchId: batch.branchId, createdBy: user._id }, session);
      lifecycle.organizationMemberId = member._id; await lifecycle.save({ session });
      return { userId: user._id.toString(), lifecycleId: lifecycle._id.toString() };
    });
    const lifecycle = await StudentLifecycleModel.findById(result.lifecycleId);
    if (lifecycle?.currentStatus === 'PENDING_ACTIVATION') await StudentLifecycleService.activateStudent(result.lifecycleId, { batchId: batch._id.toString(), notes: `Transferred from CRM admission ${data.admissionNumber || data.externalAdmissionId}` }, { userId: result.userId, roles: ['STUDENT'] });
    await this.link(tenantId, orgNumber, 'ADMISSION', data.externalAdmissionId, result.userId, { lifecycleId: result.lifecycleId, batchId: batch._id.toString() });
    await BatchModel.updateOne({ _id: batch._id, tenantId }, { $inc: { enrolledCount: 1 } });
    return { resourceType: 'ADMISSION', externalId: data.externalAdmissionId, lmsStudentId: result.userId, lifecycleId: result.lifecycleId, status: 'SYNCED' };
  }

  private static async transferBatch(tenantId: string, orgNumber: string, raw: unknown) {
    const data = z.object({ externalAdmissionId: z.string().min(1), externalBatchId: z.string().min(1) }).parse(raw);
    const [studentLink, batchLink] = await Promise.all([
      CRMExternalLinkModel.findOne({ tenantId, orgNumber, resourceType: 'ADMISSION', externalId: data.externalAdmissionId }),
      CRMExternalLinkModel.findOne({ tenantId, orgNumber, resourceType: 'BATCH', externalId: data.externalBatchId })
    ]);
    if (!studentLink || !batchLink) throw new BadRequestError('Student or destination batch is not synced');
    const lifecycle = await StudentLifecycleModel.findOne({ tenantId, studentUserId: studentLink.canonicalId, isTerminal: false });
    if (!lifecycle) throw new BadRequestError('Active LMS student lifecycle not found');
    const result = await StudentLifecycleService.transferStudent(lifecycle._id.toString(), { toBatchId: batchLink.canonicalId, reason: 'CRM batch transfer', expectedRevision: lifecycle.revision }, { userId: studentLink.canonicalId, roles: ['STUDENT'] });
    return { resourceType: 'ADMISSION', externalId: data.externalAdmissionId, lmsStudentId: studentLink.canonicalId, lifecycle: result, status: 'SYNCED' };
  }

  private static async link(tenantId: string, orgNumber: string, resourceType: any, externalId: string, canonicalId: string, metadata: Record<string, any> = {}) {
    return CRMExternalLinkModel.findOneAndUpdate(
      { tenantId, orgNumber, resourceType, externalId },
      { $set: { canonicalId, metadata } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
