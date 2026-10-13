import { Types } from 'mongoose';
import {
  StudentLifecycleModel,
  StudentLifecycleEventModel,
  StudentSequenceModel,
  UserModel,
  OrganizationMemberModel,
  EnrollmentModel,
  BatchModel,
  ClassModel,
  StudentFeePlanModel,
  CertificateModel,
  CourseModel,
  AdmissionModel,
  BranchModel,
  NotificationIntentModel,
  IStudentLifecycleDocument,
  StudentLifecycleStatus,
  runInTransaction
} from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import {
  ActivateStudentSchema,
  TransferStudentBatchSchema,
  HoldStudentSchema,
  ResumeStudentSchema,
  WithdrawStudentSchema,
  DropStudentSchema,
  CompleteStudentSchema,
  ReactivateStudentSchema,
  StudentDirectoryQuerySchema
} from '@edtech/validation';
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from '../errors/appError';
import { AuditService } from './audit.service';
import { AttendanceService } from './attendance.service';
import { BranchAccessService } from './branchAccess.service';
import { DomainEventService } from './domainEvent.service';
import { z } from 'zod';

export interface StudentLifecycleActor {
  userId: string;
  roles: string[];
  isSuperAdmin?: boolean;
}

export class StudentLifecycleService {
  private static tenant() {
    const id = getWorkspaceContext().currentTenantId;
    if (!id) throw new BadRequestError('Tenant context required');
    return id;
  }

  /**
   * Concurrency-safe atomic student number generator (STU-YYYY-NNNNNN)
   */
  static async generateStudentNumber(tenantId: string, session?: any): Promise<string> {
    const year = new Date().getFullYear();
    const doc = await StudentSequenceModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), year },
      { $inc: { value: 1 } },
      { upsert: true, new: true, session, setDefaultsOnInsert: true }
    );
    const seq = String(doc.value).padStart(6, '0');
    return `STU-${year}-${seq}`;
  }

  /**
   * Initializes canonical lifecycle aggregate upon admission conversion or manual setup.
   */
  static async initializeLifecycle(
    params: {
      tenantId: string;
      studentUserId: string | Types.ObjectId;
      admissionId?: string | Types.ObjectId;
      currentEnrollmentId: string | Types.ObjectId;
      courseId?: string | Types.ObjectId;
      currentBatchId?: string | Types.ObjectId;
      currentBranchId?: string | Types.ObjectId;
      createdBy?: string | Types.ObjectId;
    },
    session?: any
  ): Promise<IStudentLifecycleDocument> {
    const tenantId = params.tenantId;
    const studentUserId = new Types.ObjectId(params.studentUserId);
    const currentEnrollmentId = new Types.ObjectId(params.currentEnrollmentId);

    // Check for existing lifecycle aggregate for this exact tenant + student + enrollment + episode
    const existing = await StudentLifecycleModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      studentUserId,
      currentEnrollmentId,
      lifecycleEpisode: 1
    }).session(session || null);

    if (existing) {
      return existing;
    }

    let resolvedCourseId = params.courseId ? new Types.ObjectId(params.courseId) : undefined;
    if (!resolvedCourseId) {
      const enr = await EnrollmentModel.findById(currentEnrollmentId).session(session || null).lean();
      if (enr?.courseId) {
        resolvedCourseId = new Types.ObjectId(enr.courseId);
      }
    }

    const studentNumber = await this.generateStudentNumber(tenantId, session);

    const [lifecycle] = await StudentLifecycleModel.create(
      [
        {
          tenantId: new Types.ObjectId(tenantId),
          studentUserId,
          studentNumber,
          admissionId: params.admissionId ? new Types.ObjectId(params.admissionId) : undefined,
          currentEnrollmentId,
          courseId: resolvedCourseId,
          currentBatchId: params.currentBatchId ? new Types.ObjectId(params.currentBatchId) : undefined,
          currentBranchId: params.currentBranchId ? new Types.ObjectId(params.currentBranchId) : undefined,
          currentStatus: 'PENDING_ACTIVATION',
          lifecycleEpisode: 1,
          revision: 0
        }
      ],
      { session: session || null }
    );

    if (params.currentBranchId) {
      await StudentLifecycleEventModel.create([{
        tenantId: new Types.ObjectId(tenantId), lifecycleId: lifecycle._id, studentUserId,
        eventType: 'BRANCH_ASSIGNED', toBranchId: new Types.ObjectId(params.currentBranchId),
        effectiveAt: lifecycle.createdAt || new Date(), performedBy: params.createdBy ? new Types.ObjectId(params.createdBy) : undefined
      }], { session: session || null });
    }

    return lifecycle;
  }

  static async getBranchAt(lifecycleId: string, instant: Date): Promise<string | undefined> {
    const tenantId = this.tenant();
    const event = await StudentLifecycleEventModel.findOne({
      tenantId, lifecycleId, eventType: { $in: ['BRANCH_ASSIGNED', 'BRANCH_TRANSFERRED'] }, effectiveAt: { $lte: instant }
    }).sort({ effectiveAt: -1, createdAt: -1 }).select('toBranchId').lean();
    return event?.toBranchId?.toString();
  }

  static async transferBranch(lifecycleId: string, raw: unknown, actor: StudentLifecycleActor): Promise<any> {
    const tenantId = this.tenant();
    const payload = z.object({
      destinationBranchId: z.string().refine(Types.ObjectId.isValid), destinationBatchId: z.string().refine(Types.ObjectId.isValid).optional(),
      effectiveAt: z.coerce.date().default(() => new Date()), reason: z.string().trim().min(2).max(500), expectedRevision: z.number().int().nonnegative(),
      idempotencyKey: z.string().trim().min(8).max(100).optional()
    }).parse(raw);
    await BranchAccessService.assertBranchAccess(tenantId, actor, payload.destinationBranchId, { requireActive: true });
    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({ _id: lifecycleId, tenantId }).session(session);
      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');
      const replay = payload.idempotencyKey ? await StudentLifecycleEventModel.findOne({ tenantId, lifecycleId, eventType: 'BRANCH_TRANSFERRED', 'metadata.idempotencyKey': payload.idempotencyKey }).session(session) : null;
      if (replay) return this.dto(lifecycle);
      if (lifecycle.revision !== payload.expectedRevision) throw new ConflictError('Student lifecycle revision conflict');
      if (!['ACTIVE', 'ON_HOLD'].includes(lifecycle.currentStatus)) throw new ConflictError(`Cannot transfer student in status: ${lifecycle.currentStatus}`);
      const fromBranchId = lifecycle.currentBranchId;
      const toBranchId = new Types.ObjectId(payload.destinationBranchId);
      if (fromBranchId?.equals(toBranchId)) return this.dto(lifecycle);
      if (fromBranchId) await BranchAccessService.assertBranchAccess(tenantId, actor, fromBranchId.toString());
      let toBatchId = lifecycle.currentBatchId;
      if (payload.destinationBatchId) {
        const batch = await BatchModel.findOne({ _id: payload.destinationBatchId, tenantId, branchId: toBranchId, courseId: lifecycle.courseId, status: { $in: ['UPCOMING', 'ONGOING'] } }).session(session);
        if (!batch) throw new BadRequestError('Destination batch is not active, branch-compatible, or course-compatible');
        toBatchId = batch._id;
      } else if (toBatchId) {
        const currentBatch = await BatchModel.findOne({ _id: toBatchId, tenantId }).session(session).lean();
        if (currentBatch?.branchId && !currentBatch.branchId.equals(toBranchId)) throw new BadRequestError('A destination batch in the destination branch is required');
      }
      const fromBatchId = lifecycle.currentBatchId;
      lifecycle.currentBranchId = toBranchId; lifecycle.currentBatchId = toBatchId; lifecycle.revision += 1;
      await lifecycle.save({ session });
      await StudentLifecycleEventModel.create([{ tenantId: new Types.ObjectId(tenantId), lifecycleId: lifecycle._id, studentUserId: lifecycle.studentUserId,
        eventType: 'BRANCH_TRANSFERRED', fromBranchId, toBranchId, fromBatchId, toBatchId, effectiveAt: payload.effectiveAt,
        reason: payload.reason, performedBy: new Types.ObjectId(actor.userId), metadata: { idempotencyKey: payload.idempotencyKey } }], { session });
      await DomainEventService.publish({ tenantId, eventId: `student.branch_transferred:${lifecycle._id}:${lifecycle.revision}`, eventType: 'student.branch_transferred',
        occurredAt: payload.effectiveAt, actorId: actor.userId, resourceType: 'StudentLifecycle', resourceId: lifecycle._id.toString(), branchId: toBranchId.toString(),
        correlationId: payload.idempotencyKey || `student-branch-transfer:${lifecycle._id}:${lifecycle.revision}`, depth: 0, payloadVersion: 1,
        payload: { studentId: lifecycle.studentUserId.toString(), fromBranchId: fromBranchId?.toString(), toBranchId: toBranchId.toString(), fromBatchId: fromBatchId?.toString(), toBatchId: toBatchId?.toString() } }, session);
      await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'STUDENT_BRANCH_TRANSFERRED', resource: 'StudentLifecycle', resourceId: lifecycle.id,
        metadata: { fromBranchId: fromBranchId?.toString(), toBranchId: toBranchId.toString(), fromBatchId: fromBatchId?.toString(), toBatchId: toBatchId?.toString(), idempotencyKey: payload.idempotencyKey }, session });
      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: PENDING_ACTIVATION -> ACTIVE
   */
  static async activateStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = ActivateStudentSchema.parse(raw || {});

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) {
        throw new NotFoundError('Student lifecycle not found');
      }

      // Concurrency check if expectedRevision provided
      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      // Idempotency: If already ACTIVE, return current state
      if (lifecycle.currentStatus === 'ACTIVE') {
        return this.dto(lifecycle);
      }

      if (lifecycle.currentStatus !== 'PENDING_ACTIVATION') {
        throw new ConflictError(`Cannot activate student in state: ${lifecycle.currentStatus}`);
      }

      // Verify Student User and OrganizationMember
      const [user, member, enrollment] = await Promise.all([
        UserModel.findOne({ _id: lifecycle.studentUserId, tenantId, status: 'ACTIVE' }).session(session),
        OrganizationMemberModel.findOne({ tenantId, userId: lifecycle.studentUserId, role: 'STUDENT', status: 'ACTIVE' }).session(session),
        EnrollmentModel.findOne({ _id: lifecycle.currentEnrollmentId, tenantId, status: { $ne: 'CANCELLED' } }).session(session)
      ]);

      if (!user) throw new NotFoundError('Active student user identity not found');
      if (!member) throw new NotFoundError('Active student organization member identity not found');
      if (!enrollment) throw new NotFoundError('Canonical student enrollment not found');

      const batchIdToAssign = payload.batchId
        ? new Types.ObjectId(payload.batchId)
        : lifecycle.currentBatchId;

      if (batchIdToAssign) {
        const batch = await BatchModel.findOne({
          _id: batchIdToAssign,
          tenantId,
          courseId: enrollment.courseId,
          status: { $in: ['UPCOMING', 'ONGOING'] }
        }).session(session);

        if (!batch) {
          throw new BadRequestError('Assigned batch is not compatible with enrolled course or is not active');
        }
        lifecycle.currentBatchId = batch._id;
      }

      const now = new Date();
      lifecycle.currentStatus = 'ACTIVE';
      lifecycle.activatedAt = now;
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Create append-only lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'ACTIVATED',
            effectiveAt: now,
            reason: payload.notes || 'Academic onboarding activation',
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              batchId: lifecycle.currentBatchId?.toString(),
              enrollmentId: lifecycle.currentEnrollmentId.toString()
            }
          }
        ],
        { session }
      );

      // Resolve course title for notification
      const course = await CourseModel.findById(enrollment.courseId).session(session).lean();

      // Enqueue durable notification intent
      const dedupeKey = `student.activated:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.activated',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {
              courseTitle: course?.title || 'Course'
            },
            status: 'PENDING',
            availableAt: now,
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_ACTIVATED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        metadata: { studentUserId: lifecycle.studentUserId.toString() },
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Same-course Batch Transfer:
   * Moves student from Batch A to Batch B while preserving all historical attendance, finance, progress.
   */
  static async transferStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = TransferStudentBatchSchema.parse(raw || {});
    const effectiveAt = payload.effectiveAt || new Date();

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) {
        throw new NotFoundError('Student lifecycle not found');
      }

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      if (!['ACTIVE', 'ON_HOLD'].includes(lifecycle.currentStatus)) {
        throw new ConflictError(`Cannot transfer student in status: ${lifecycle.currentStatus}`);
      }

      const toBatchId = new Types.ObjectId(payload.toBatchId);
      const fromBatchId = lifecycle.currentBatchId;

      // Idempotency: if already in destination batch
      if (fromBatchId && fromBatchId.equals(toBatchId)) {
        return this.dto(lifecycle);
      }

      // Verify canonical enrollment
      const enrollment = await EnrollmentModel.findOne({
        _id: lifecycle.currentEnrollmentId,
        tenantId
      }).session(session);

      if (!enrollment) {
        throw new NotFoundError('Canonical student enrollment not found');
      }

      // Verify destination batch exists, belongs to same tenant, and matches same course
      const toBatch = await BatchModel.findOne({
        _id: toBatchId,
        tenantId,
        status: { $in: ['UPCOMING', 'ONGOING'] }
      }).session(session);

      if (!toBatch) {
        throw new NotFoundError('Destination batch not found or not active');
      }

      if (!toBatch.courseId || !toBatch.courseId.equals(enrollment.courseId)) {
        throw new BadRequestError('Cross-course transfer is not supported via batch transfer. Course changes require a distinct admission and enrollment context.');
      }

      // Update future classes membership:
      // Remove or mark inactive future class roster enrollments from old batch (if any)
      if (fromBatchId) {
        await ClassModel.updateMany(
          {
            tenantId,
            batchId: fromBatchId,
            startDate: { $gt: effectiveAt },
            status: { $ne: 'CANCELLED' }
          },
          {
            $pull: { enrolledStudents: { studentId: lifecycle.studentUserId } }
          },
          { session }
        );
      }

      lifecycle.currentBatchId = toBatchId;
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append immutable lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'TRANSFERRED',
            fromBatchId,
            toBatchId,
            effectiveAt,
            reason: payload.reason,
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              previousBatchId: fromBatchId?.toString(),
              newBatchId: toBatchId.toString(),
              notes: payload.notes
            }
          }
        ],
        { session }
      );

      // Enqueue notification intent
      const dedupeKey = `student.batch_transferred:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.batch_transferred',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {
              batchName: toBatch.name
            },
            status: 'PENDING',
            availableAt: new Date(),
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_TRANSFERRED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        metadata: {
          fromBatchId: fromBatchId?.toString(),
          toBatchId: toBatchId.toString(),
          reason: payload.reason
        },
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: ACTIVE -> ON_HOLD
   */
  static async placeOnHold(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = HoldStudentSchema.parse(raw || {});
    const effectiveFrom = payload.effectiveFrom || new Date();

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      // Idempotency: if already ON_HOLD
      if (lifecycle.currentStatus === 'ON_HOLD') {
        return this.dto(lifecycle);
      }

      if (lifecycle.currentStatus !== 'ACTIVE') {
        throw new ConflictError(`Cannot place student on hold from status: ${lifecycle.currentStatus}`);
      }

      const holdId = new Types.ObjectId();
      lifecycle.currentStatus = 'ON_HOLD';
      lifecycle.currentHold = {
        holdId,
        effectiveFrom,
        expectedResumeDate: payload.expectedResumeDate,
        reason: payload.reason,
        notes: payload.notes,
        placedBy: new Types.ObjectId(actor.userId)
      };
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'HOLD_STARTED',
            effectiveAt: effectiveFrom,
            reason: payload.reason,
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              holdId: holdId.toString(),
              expectedResumeDate: payload.expectedResumeDate?.toISOString(),
              notes: payload.notes
            }
          }
        ],
        { session }
      );

      // Notification intent
      const dedupeKey = `student.hold_started:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.hold_started',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {
              reason: payload.reason
            },
            status: 'PENDING',
            availableAt: new Date(),
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_HOLD_STARTED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        metadata: { reason: payload.reason },
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: ON_HOLD -> ACTIVE
   */
  static async resumeStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = ResumeStudentSchema.parse(raw || {});
    const effectiveAt = payload.effectiveAt || new Date();

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      // Idempotency: if already ACTIVE
      if (lifecycle.currentStatus === 'ACTIVE') {
        return this.dto(lifecycle);
      }

      if (lifecycle.currentStatus !== 'ON_HOLD') {
        throw new ConflictError(`Cannot resume student from status: ${lifecycle.currentStatus}`);
      }

      // Archive current hold into holdHistory
      if (lifecycle.currentHold) {
        lifecycle.holdHistory.push({
          holdId: lifecycle.currentHold.holdId,
          effectiveFrom: lifecycle.currentHold.effectiveFrom,
          expectedResumeDate: lifecycle.currentHold.expectedResumeDate,
          resumedAt: effectiveAt,
          reason: lifecycle.currentHold.reason,
          notes: lifecycle.currentHold.notes,
          placedBy: lifecycle.currentHold.placedBy
        });
      }

      lifecycle.currentHold = undefined;
      lifecycle.currentStatus = 'ACTIVE';
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'HOLD_ENDED',
            effectiveAt,
            reason: payload.notes || 'Academic hold resumed',
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              notes: payload.notes
            }
          }
        ],
        { session }
      );

      // Notification intent
      const dedupeKey = `student.resumed:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.resumed',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {},
            status: 'PENDING',
            availableAt: new Date(),
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_RESUMED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: ACTIVE | ON_HOLD -> WITHDRAWN
   */
  static async withdrawStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = WithdrawStudentSchema.parse(raw || {});
    const effectiveAt = payload.effectiveAt || new Date();

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      // Idempotency: if already WITHDRAWN
      if (lifecycle.currentStatus === 'WITHDRAWN') {
        return this.dto(lifecycle);
      }

      if (!['ACTIVE', 'ON_HOLD', 'PENDING_ACTIVATION'].includes(lifecycle.currentStatus)) {
        throw new ConflictError(`Cannot withdraw student from status: ${lifecycle.currentStatus}`);
      }

      lifecycle.currentStatus = 'WITHDRAWN';
      lifecycle.withdrawnAt = effectiveAt;
      lifecycle.withdrawalReason = payload.reason;
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'WITHDRAWN',
            effectiveAt,
            reason: payload.reason,
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              notes: payload.notes
            }
          }
        ],
        { session }
      );

      const enrollment = await EnrollmentModel.findById(lifecycle.currentEnrollmentId).session(session).lean();
      const course = enrollment ? await CourseModel.findById(enrollment.courseId).session(session).lean() : null;

      // Notification intent
      const dedupeKey = `student.withdrawn:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.withdrawn',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {
              courseTitle: course?.title || 'Course'
            },
            status: 'PENDING',
            availableAt: new Date(),
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_WITHDRAWN',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        metadata: { reason: payload.reason },
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: ACTIVE | ON_HOLD -> DROPPED
   */
  static async dropStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = DropStudentSchema.parse(raw || {});
    const effectiveAt = payload.effectiveAt || new Date();

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      // Idempotency: if already DROPPED
      if (lifecycle.currentStatus === 'DROPPED') {
        return this.dto(lifecycle);
      }

      if (!['ACTIVE', 'ON_HOLD', 'PENDING_ACTIVATION'].includes(lifecycle.currentStatus)) {
        throw new ConflictError(`Cannot drop student from status: ${lifecycle.currentStatus}`);
      }

      lifecycle.currentStatus = 'DROPPED';
      lifecycle.droppedAt = effectiveAt;
      lifecycle.droppedReason = payload.reason;
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'DROPPED',
            effectiveAt,
            reason: payload.reason,
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              notes: payload.notes
            }
          }
        ],
        { session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_DROPPED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        metadata: { reason: payload.reason },
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: ACTIVE -> COMPLETED
   * Server-authoritative validation checking canonical Phase 9 course completion evidence.
   */
  static async completeStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = CompleteStudentSchema.parse(raw || {});

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      // Idempotency: if already COMPLETED
      if (lifecycle.currentStatus === 'COMPLETED') {
        return this.dto(lifecycle);
      }

      if (lifecycle.currentStatus !== 'ACTIVE') {
        throw new ConflictError(`Cannot complete student from status: ${lifecycle.currentStatus}`);
      }

      // Check Phase 9 Canonical Course Completion
      const enrollment = await EnrollmentModel.findOne({
        _id: lifecycle.currentEnrollmentId,
        tenantId
      }).session(session);

      if (!enrollment) {
        throw new NotFoundError('Canonical enrollment not found');
      }

      if (enrollment.status !== 'COMPLETED' || enrollment.progressPercent < 100) {
        throw new BadRequestError('Cannot complete student lifecycle: Course enrollment requirements not completed (100% progress required)');
      }

      const completedAt = enrollment.completedAt || new Date();
      lifecycle.currentStatus = 'COMPLETED';
      lifecycle.completedAt = completedAt;
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'COMPLETED',
            effectiveAt: completedAt,
            reason: payload.notes || 'Curriculum requirements satisfied',
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              enrollmentId: enrollment._id.toString(),
              progressPercent: enrollment.progressPercent
            }
          }
        ],
        { session }
      );

      const course = await CourseModel.findById(enrollment.courseId).session(session).lean();

      // Notification intent
      const dedupeKey = `student.completed:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.completed',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {
              courseTitle: course?.title || 'Course'
            },
            status: 'PENDING',
            availableAt: new Date(),
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_COMPLETED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Transition: WITHDRAWN | DROPPED -> REACTIVATED (Episode Increment)
   * Note: COMPLETED is terminal and cannot be reactivated into the same course context.
   */
  static async reactivateStudent(
    lifecycleId: string,
    raw: unknown,
    actor: StudentLifecycleActor
  ): Promise<any> {
    const tenantId = this.tenant();
    const payload = ReactivateStudentSchema.parse(raw || {});

    return runInTransaction(async (session) => {
      const lifecycle = await StudentLifecycleModel.findOne({
        _id: lifecycleId,
        tenantId
      }).session(session);

      if (!lifecycle) throw new NotFoundError('Student lifecycle not found');

      if (payload.expectedRevision !== undefined && lifecycle.revision !== payload.expectedRevision) {
        throw new ConflictError('Student lifecycle revision conflict');
      }

      if (lifecycle.currentStatus === 'COMPLETED') {
        throw new ConflictError('Completed academic lifecycle is terminal. Students enrolling in new courses must use a new admission and enrollment context.');
      }

      if (!['WITHDRAWN', 'DROPPED'].includes(lifecycle.currentStatus)) {
        throw new ConflictError(`Cannot reactivate student from status: ${lifecycle.currentStatus}`);
      }

      const now = new Date();
      const previousStatus = lifecycle.currentStatus;
      const previousEpisode = lifecycle.lifecycleEpisode;

      if (payload.batchId) {
        const enrollment = await EnrollmentModel.findOne({
          _id: lifecycle.currentEnrollmentId,
          tenantId
        }).session(session);
        if (!enrollment) throw new NotFoundError('Canonical student enrollment not found');

        const batch = await BatchModel.findOne({
          _id: payload.batchId,
          tenantId,
          courseId: enrollment.courseId,
          status: { $in: ['UPCOMING', 'ONGOING'] }
        }).session(session);
        if (!batch) {
          throw new BadRequestError('Readmission batch is not compatible with enrolled course or is not active');
        }
      }

      lifecycle.currentStatus = 'ACTIVE';
      lifecycle.lifecycleEpisode = previousEpisode + 1;
      lifecycle.withdrawnAt = undefined;
      lifecycle.withdrawalReason = undefined;
      lifecycle.droppedAt = undefined;
      lifecycle.droppedReason = undefined;
      if (payload.batchId) {
        lifecycle.currentBatchId = new Types.ObjectId(payload.batchId);
      }
      lifecycle.revision += 1;
      await lifecycle.save({ session });

      // Append lifecycle event
      await StudentLifecycleEventModel.create(
        [
          {
            tenantId: new Types.ObjectId(tenantId),
            lifecycleId: lifecycle._id,
            studentUserId: lifecycle.studentUserId,
            eventType: 'REACTIVATED',
            effectiveAt: now,
            reason: payload.reason,
            performedBy: new Types.ObjectId(actor.userId),
            metadata: {
              previousStatus,
              previousEpisode,
              newEpisode: lifecycle.lifecycleEpisode,
              notes: payload.notes
            }
          }
        ],
        { session }
      );

      // Notification intent
      const dedupeKey = `student.reactivated:${lifecycle._id}:${lifecycle.revision}:${lifecycle.studentUserId}`;
      await NotificationIntentModel.updateOne(
        { eventId: dedupeKey },
        {
          $setOnInsert: {
            tenantId: new Types.ObjectId(tenantId),
            eventId: dedupeKey,
            type: 'student.reactivated',
            recipientUserId: lifecycle.studentUserId,
            sourceType: 'StudentLifecycle',
            sourceId: lifecycle._id.toString(),
            occurrenceKey: String(lifecycle.revision),
            data: {},
            status: 'PENDING',
            availableAt: now,
            attemptCount: 0
          }
        },
        { upsert: true, session }
      );

      await AuditService.logEvent({
        actorId: actor.userId,
        tenantId,
        action: 'STUDENT_REACTIVATED',
        resource: 'StudentLifecycle',
        resourceId: lifecycle._id.toString(),
        metadata: { reason: payload.reason, episode: lifecycle.lifecycleEpisode },
        session
      });

      return this.dto(lifecycle);
    });
  }

  /**
   * Effective-dated academic eligibility evaluator:
   * Determines whether student was ACTIVE and academically expected to participate at a given instant.
   */
  static async isStudentAcademicallyActiveAt(
    studentUserId: string | Types.ObjectId,
    instant: Date = new Date(),
    courseId?: string | Types.ObjectId,
    batchId?: string | Types.ObjectId
  ): Promise<boolean> {
    const tenantId = this.tenant();
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      studentUserId: new Types.ObjectId(studentUserId)
    };
    if (courseId) query.courseId = new Types.ObjectId(courseId);

    const lifecycles = await StudentLifecycleModel.find(query).lean();
    if (!lifecycles.length) {
      return true; // Fallback for legacy data without initialized lifecycle
    }

    // Rebuild standing at the requested instant from append-only events. This
    // preserves historical inactive gaps after a later readmission/reactivation.
    for (const lc of lifecycles) {
      const events = await StudentLifecycleEventModel.find({
        tenantId: new Types.ObjectId(tenantId),
        lifecycleId: lc._id,
        effectiveAt: { $lte: instant }
      })
        .sort({ effectiveAt: 1, createdAt: 1 })
        .select('eventType fromBatchId toBatchId')
        .lean();

      if (events.length) {
        let active = false;
        let assignedBatch: string | undefined;
        for (const event of events) {
          if (['ACTIVATED', 'HOLD_ENDED', 'REACTIVATED'].includes(event.eventType)) active = true;
          if (['HOLD_STARTED', 'WITHDRAWN', 'DROPPED', 'COMPLETED'].includes(event.eventType)) active = false;
          if (['BATCH_ASSIGNED', 'TRANSFERRED'].includes(event.eventType) && event.toBatchId) assignedBatch=event.toBatchId.toString();
        }
        if (active && (!batchId || assignedBatch === batchId.toString())) return true;
        continue;
      }

      // Compatibility for lifecycle records created before event logging.
      if (!lc.activatedAt || instant < new Date(lc.activatedAt)) continue;
      if (lc.completedAt && instant >= new Date(lc.completedAt)) continue;
      if (lc.withdrawnAt && instant >= new Date(lc.withdrawnAt)) continue;
      if (lc.droppedAt && instant >= new Date(lc.droppedAt)) continue;
      const holds = [...(lc.holdHistory || []), ...(lc.currentHold ? [lc.currentHold] : [])];
      const inHold = holds.some((hold: any) => {
        const starts = instant >= new Date(hold.effectiveFrom);
        const notEnded = !hold.resumedAt || instant < new Date(hold.resumedAt);
        return starts && notEnded;
      });
      if (!inHold && (!batchId || lc.currentBatchId?.toString()===batchId.toString())) return true;
    }

    return false;
  }

  /**
   * Composed Student Academic Profile DTO:
   * Aggregates Identity, Lifecycle, Academic, Attendance, Finance, Certificates, and Upcoming Classes safely.
   */
  static async getAcademicProfile(
    studentUserId: string,
    studentLifecycleId?: string
  ): Promise<any> {
    const tenantId = this.tenant();

    const [user, member] = await Promise.all([
      UserModel.findOne({ _id: studentUserId, tenantId }).select('name email phone status avatarUrl createdAt').lean(),
      OrganizationMemberModel.findOne({ tenantId, userId: studentUserId, role: 'STUDENT' }).lean()
    ]);

    if (!user) {
      throw new NotFoundError('Student user profile not found');
    }

    // Fetch student lifecycle(s)
    let lifecycle: any = null;
    if (studentLifecycleId) {
      lifecycle = await StudentLifecycleModel.findOne({ _id: studentLifecycleId, tenantId, studentUserId })
        .populate('currentBatchId', 'name batchCode mode startDate endDate timing')
        .populate('currentEnrollmentId')
        .lean();
    } else {
      lifecycle = await StudentLifecycleModel.findOne({ tenantId, studentUserId })
        .sort({ updatedAt: -1 })
        .populate('currentBatchId', 'name batchCode mode startDate endDate timing')
        .populate('currentEnrollmentId')
        .lean();
    }

    // Fetch primary enrollment
    let enrollment: any = null;
    let course: any = null;
    if (lifecycle?.currentEnrollmentId) {
      enrollment = lifecycle.currentEnrollmentId;
      if (enrollment.courseId) {
        course = await CourseModel.findById(enrollment.courseId).select('title slug thumbnailUrl durationMinutes level').lean();
      }
    } else {
      enrollment = await EnrollmentModel.findOne({ tenantId, studentId: studentUserId, status: { $ne: 'CANCELLED' } })
        .populate('courseId', 'title slug thumbnailUrl durationMinutes level')
        .sort({ updatedAt: -1 })
        .lean();
      if (enrollment?.courseId) {
        course = enrollment.courseId;
      }
    }

    // Compose attendance summary from Phase 12
    let attendanceSummary: any = null;
    try {
      attendanceSummary = await AttendanceService.studentSummary(studentUserId);
    } catch {
      attendanceSummary = null;
    }

    // Compose safe finance summary from Phase 11
    let financeSummary: any = null;
    const feePlan = await StudentFeePlanModel.findOne({ tenantId, studentUserId, status: { $in: ['ACTIVE', 'FULLY_PAID'] } }).lean();
    if (feePlan) {
      financeSummary = {
        id: feePlan._id.toString(),
        currency: feePlan.currency,
        baseAmountMinor: feePlan.baseAmountMinor,
        discountAmountMinor: feePlan.discountAmountMinor,
        netPayableMinor: feePlan.netPayableMinor,
        paidAmountMinor: feePlan.paidAmountMinor,
        outstandingBalanceMinor: feePlan.outstandingBalanceMinor,
        status: feePlan.status,
        hasOverdue: (feePlan.installments || []).some((i) => i.status === 'OVERDUE')
      };
    }

    // Compose credentials from Phase 13
    const certificates = await CertificateModel.find({ tenantId, recipientUserId: studentUserId, status: 'ISSUED' })
      .select('certificateNumber courseTitle issuedAt verificationCode')
      .lean();

    // Compose upcoming classes
    const upcomingClasses = await ClassModel.find({
      tenantId,
      status: { $in: ['SCHEDULED', 'ACTIVE'] },
      $or: [
        { 'enrolledStudents.studentId': new Types.ObjectId(studentUserId), 'enrolledStudents.status': 'ENROLLED' },
        ...(lifecycle?.currentBatchId ? [{ batchId: lifecycle.currentBatchId }] : [])
      ],
      startDate: { $gte: new Date(Date.now() - 3600000) }
    })
      .sort({ startDate: 1 })
      .limit(5)
      .populate('instructorId', 'name')
      .populate('batchId', 'name')
      .select('name classCode startDate timing mode zoomDetails.meetingUrl status')
      .lean();

    return {
      identity: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        memberStatus: member?.status || user.status,
        joinedAt: member?.joinedAt || user.createdAt
      },
      lifecycle: lifecycle
        ? {
            id: lifecycle._id.toString(),
            studentNumber: lifecycle.studentNumber,
            currentStatus: lifecycle.currentStatus,
            lifecycleEpisode: lifecycle.lifecycleEpisode,
            activatedAt: lifecycle.activatedAt,
            completedAt: lifecycle.completedAt,
            withdrawnAt: lifecycle.withdrawnAt,
            withdrawalReason: lifecycle.withdrawalReason,
            droppedAt: lifecycle.droppedAt,
            droppedReason: lifecycle.droppedReason,
            currentHold: lifecycle.currentHold
              ? {
                  effectiveFrom: lifecycle.currentHold.effectiveFrom,
                  expectedResumeDate: lifecycle.currentHold.expectedResumeDate,
                  reason: lifecycle.currentHold.reason
                }
              : null,
            revision: lifecycle.revision
          }
        : null,
      academic: {
        enrollmentId: enrollment?._id?.toString(),
        course: course
          ? {
              id: course._id.toString(),
              title: course.title,
              slug: course.slug,
              thumbnailUrl: course.thumbnailUrl
            }
          : null,
        batch: lifecycle?.currentBatchId
          ? {
              id: (lifecycle.currentBatchId as any)._id?.toString() || lifecycle.currentBatchId.toString(),
              name: (lifecycle.currentBatchId as any).name || 'Assigned Cohort',
              batchCode: (lifecycle.currentBatchId as any).batchCode,
              mode: (lifecycle.currentBatchId as any).mode
            }
          : null,
        progressPercent: enrollment?.progressPercent || 0,
        completedLessons: enrollment?.completedLessons || 0,
        totalLessons: enrollment?.totalLessons || 0,
        enrollmentStatus: enrollment?.status || 'ACTIVE',
        enrolledAt: enrollment?.enrolledAt,
        completedAt: enrollment?.completedAt
      },
      attendance: attendanceSummary,
      finance: financeSummary,
      credentials: certificates.map((c: any) => ({
        id: c._id.toString(),
        certificateNumber: c.certificateNumber,
        courseTitle: c.courseTitle,
        issuedAt: c.issuedAt,
        verificationCode: c.verificationCode
      })),
      upcomingClasses: upcomingClasses.map((cls: any) => ({
        id: cls._id.toString(),
        name: cls.name,
        classCode: cls.classCode,
        startDate: cls.startDate,
        timing: cls.timing,
        mode: cls.mode,
        meetingUrl: cls.zoomDetails?.meetingUrl,
        instructorName: cls.instructorId?.name,
        batchName: cls.batchId?.name
      }))
    };
  }

  /**
   * Get Student Lifecycle Timeline:
   * Returns immutable chronological history of all lifecycle transitions.
   */
  static async getTimeline(studentUserId: string, isStudentSelf = false): Promise<any[]> {
    const tenantId = this.tenant();

    const events = await StudentLifecycleEventModel.find({
      tenantId,
      studentUserId
    })
      .sort({ effectiveAt: -1, createdAt: -1 })
      .populate('performedBy', 'name email')
      .populate('fromBatchId', 'name batchCode')
      .populate('toBatchId', 'name batchCode')
      .lean();

    return events.map((event: any) => ({
      id: event._id.toString(),
      lifecycleId: event.lifecycleId.toString(),
      eventType: event.eventType,
      effectiveAt: event.effectiveAt,
      reason: event.reason,
      fromBatch: event.fromBatchId ? { id: event.fromBatchId._id.toString(), name: event.fromBatchId.name } : undefined,
      toBatch: event.toBatchId ? { id: event.toBatchId._id.toString(), name: event.toBatchId.name } : undefined,
      performedBy: isStudentSelf ? undefined : (event.performedBy ? { name: event.performedBy.name, email: event.performedBy.email } : undefined),
      metadata: event.metadata,
      createdAt: event.createdAt
    }));
  }

  /**
   * List Students / Admin Student Directory
   */
  static async listStudents(rawQuery: unknown): Promise<any> {
    const tenantId = this.tenant();
    const query = StudentDirectoryQuerySchema.parse(rawQuery || {});

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (query.status && query.status !== 'ALL') {
      filter.currentStatus = query.status;
    }

    if (query.batchId) {
      filter.currentBatchId = new Types.ObjectId(query.batchId);
    }

    if (query.courseId) {
      const enrollments = await EnrollmentModel.find({ tenantId, courseId: query.courseId }).select('_id').lean();
      filter.currentEnrollmentId = { $in: enrollments.map((e) => e._id) };
    }

    // Search by studentNumber or user name/email/phone
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const matchingUsers = await UserModel.find({
        tenantId,
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } }
        ]
      }).select('_id').lean();

      filter.$or = [
        { studentNumber: { $regex: term, $options: 'i' } },
        { studentUserId: { $in: matchingUsers.map((u) => u._id) } }
      ];
    }

    const sortMap: Record<string, any> = {
      createdAt: { createdAt: query.sortOrder === 'asc' ? 1 : -1 },
      updatedAt: { updatedAt: query.sortOrder === 'asc' ? 1 : -1 },
      activatedAt: { activatedAt: query.sortOrder === 'asc' ? 1 : -1 },
      studentNumber: { studentNumber: query.sortOrder === 'asc' ? 1 : -1 },
      status: { currentStatus: query.sortOrder === 'asc' ? 1 : -1 }
    };

    const sort = sortMap[query.sortBy || 'createdAt'] || { createdAt: -1 };

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [lifecycles, total] = await Promise.all([
      StudentLifecycleModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('studentUserId', 'name email phone avatarUrl status')
        .populate('currentBatchId', 'name batchCode mode')
        .populate({
          path: 'currentEnrollmentId',
          populate: { path: 'courseId', select: 'title slug' }
        })
        .lean(),
      StudentLifecycleModel.countDocuments(filter)
    ]);

    const data = lifecycles.map((lc: any) => {
      const user = lc.studentUserId;
      const enrollment = lc.currentEnrollmentId;
      const course = enrollment?.courseId;
      const batch = lc.currentBatchId;

      return {
        id: lc._id.toString(),
        studentNumber: lc.studentNumber,
        student: user
          ? {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              phone: user.phone,
              avatarUrl: user.avatarUrl,
              status: user.status
            }
          : null,
        currentStatus: lc.currentStatus,
        lifecycleEpisode: lc.lifecycleEpisode,
        course: course ? { id: course._id.toString(), title: course.title, slug: course.slug } : null,
        batch: batch ? { id: batch._id.toString(), name: batch.name, batchCode: batch.batchCode, mode: batch.mode } : null,
        progressPercent: enrollment?.progressPercent || 0,
        activatedAt: lc.activatedAt,
        completedAt: lc.completedAt,
        withdrawnAt: lc.withdrawnAt,
        currentHold: lc.currentHold ? { effectiveFrom: lc.currentHold.effectiveFrom, reason: lc.currentHold.reason } : null,
        revision: lc.revision,
        createdAt: lc.createdAt,
        updatedAt: lc.updatedAt
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single lifecycle document by ID
   */
  static async getLifecycleById(lifecycleId: string): Promise<any> {
    const tenantId = this.tenant();
    const lifecycle = await StudentLifecycleModel.findOne({ _id: lifecycleId, tenantId })
      .populate('studentUserId', 'name email phone avatarUrl status')
      .populate('currentBatchId', 'name batchCode mode startDate endDate')
      .populate({
        path: 'currentEnrollmentId',
        populate: { path: 'courseId', select: 'title slug' }
      })
      .lean();

    if (!lifecycle) throw new NotFoundError('Student lifecycle not found');
    return this.dto(lifecycle);
  }

  private static dto(doc: any): any {
    return {
      id: doc._id.toString(),
      studentUserId: doc.studentUserId?._id?.toString() || doc.studentUserId?.toString(),
      studentNumber: doc.studentNumber,
      admissionId: doc.admissionId?.toString(),
      currentEnrollmentId: doc.currentEnrollmentId?._id?.toString() || doc.currentEnrollmentId?.toString(),
      currentBatchId: doc.currentBatchId?._id?.toString() || doc.currentBatchId?.toString(),
      currentBranchId: doc.currentBranchId?._id?.toString() || doc.currentBranchId?.toString(),
      currentStatus: doc.currentStatus,
      lifecycleEpisode: doc.lifecycleEpisode,
      activatedAt: doc.activatedAt,
      completedAt: doc.completedAt,
      withdrawnAt: doc.withdrawnAt,
      withdrawalReason: doc.withdrawalReason,
      droppedAt: doc.droppedAt,
      droppedReason: doc.droppedReason,
      currentHold: doc.currentHold && doc.currentHold.holdId
        ? {
            holdId: doc.currentHold.holdId?.toString(),
            effectiveFrom: doc.currentHold.effectiveFrom,
            expectedResumeDate: doc.currentHold.expectedResumeDate,
            reason: doc.currentHold.reason,
            notes: doc.currentHold.notes
          }
        : null,
      holdHistory: (doc.holdHistory || []).map((h: any) => ({
        holdId: h.holdId?.toString(),
        effectiveFrom: h.effectiveFrom,
        expectedResumeDate: h.expectedResumeDate,
        resumedAt: h.resumedAt,
        reason: h.reason,
        notes: h.notes
      })),
      revision: doc.revision,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
