import { Types } from 'mongoose';
import {
  ClassModel,
  BatchModel,
  EnrollmentModel,
  UserModel,
  ExternalMeetingModel,
  IExternalMeetingDocument,
  IntegrationConnectionModel,
  AttendanceEvidenceModel,
  IAttendanceEvidenceDocument,
  LiveMeetingAssociationHistoryModel
} from '@edtech/database';
import {
  IntegrationProvider,
  IExternalMeetingDTO,
  IJoinInformationDTO,
  IAttendanceEvidenceDTO
} from '@edtech/types';
import {
  RecordingMetadataItem,
  TranscriptMetadataItem
} from '../contracts/liveMeetingProvider.contract';
import {
  CreateClassMeetingSchema,
  RescheduleClassMeetingSchema,
  ImportAttendanceEvidenceSchema
} from '@edtech/validation';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../../../errors/appError';
import { BranchAccessService, BranchActor } from '../../branchAccess.service';
import { AuditService } from '../../audit.service';
import { IntegrationProviderRegistry } from '../registry/providerRegistry.service';
import { IntegrationOperationService } from './integrationOperation.service';
import { DomainEventService } from '../../domainEvent.service';
import crypto from 'crypto';

export class LiveClassOrchestratorService {
  public static toDTO(doc: IExternalMeetingDocument): IExternalMeetingDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      branchId: doc.branchId ? doc.branchId.toString() : null,
      classId: doc.classId.toString(),
      provider: doc.provider,
      connectionId: doc.connectionId.toString(),
      organizerUserId: doc.organizerUserId.toString(),
      externalMeetingId: doc.externalMeetingId,
      externalCalendarEventId: doc.externalCalendarEventId || undefined,
      joinUrl: doc.joinUrl,
      providerStatus: doc.providerStatus,
      scheduledStart: doc.scheduledStart,
      scheduledEnd: doc.scheduledEnd,
      timezone: doc.timezone,
      syncStatus: doc.syncStatus,
      lastSyncedAt: doc.lastSyncedAt,
      providerVersion: doc.providerVersion || undefined,
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  public static toEvidenceDTO(doc: IAttendanceEvidenceDocument): IAttendanceEvidenceDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      branchId: doc.branchId ? doc.branchId.toString() : null,
      classId: doc.classId.toString(),
      provider: doc.provider,
      externalMeetingId: doc.externalMeetingId,
      participantExternalId: doc.participantExternalId,
      displayName: doc.displayName,
      email: doc.email || undefined,
      joinTime: doc.joinTime,
      leaveTime: doc.leaveTime || undefined,
      durationMinutes: doc.durationMinutes,
      resolvedStudentId: doc.resolvedStudentId ? doc.resolvedStudentId.toString() : null,
      resolutionStatus: doc.resolutionStatus,
      importedToAttendanceSession: doc.importedToAttendanceSession,
      createdAt: doc.createdAt
    };
  }

  /**
   * Creates a live meeting for a canonical Class.
   */
  public static async createMeetingForClass(
    tenantId: string,
    classId: string,
    rawInput: unknown,
    actor: BranchActor
  ): Promise<IExternalMeetingDTO> {
    const input = CreateClassMeetingSchema.parse(rawInput);

    // 1. Fetch canonical Class
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) {
      throw new NotFoundError('Canonical Class not found');
    }

    if (cls.status === 'CANCELLED') {
      throw new ConflictError('Cannot create a meeting for a cancelled class');
    }

    const branchId = cls.branchId?.toString();
    if (branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, {
        requireActive: true
      });
    }
    if (actor.roles?.includes('INSTRUCTOR') && cls.instructorId?.toString() !== actor.userId) {
      throw new ForbiddenError('Only the assigned instructor may manage this class meeting');
    }

    // 2. Fetch or resolve Provider Connection
    let connection = null;
    if (input.connectionId) {
      connection = await IntegrationConnectionModel.findOne({
        _id: input.connectionId,
        tenantId,
        provider: input.provider,
        status: 'CONNECTED'
      });
      if (connection?.scopeType === 'USER' && connection.userId?.toString() !== actor.userId && !actor.isSuperAdmin) {
        throw new ForbiddenError('You cannot create a meeting with another user\'s provider connection');
      }
      if (connection?.scopeType === 'BRANCH' && connection.branchId) {
        await BranchAccessService.assertBranchAccess(tenantId, actor, connection.branchId.toString(), { requireActive: true });
      }
    } else {
      // Find tenant or branch default connection for provider
      connection = await IntegrationConnectionModel.findOne({
        tenantId,
        provider: input.provider,
        status: 'CONNECTED',
        $or: [
          { scopeType: 'TENANT' },
          ...(branchId ? [{ scopeType: 'BRANCH', branchId }] : []),
          { scopeType: 'USER', userId: actor.userId }
        ]
      }).sort({ scopeType: -1 });
    }

    if (!connection) {
      throw new BadRequestError(
        `No active connection found for provider ${input.provider}. Please configure connection first.`
      );
    }

    const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider(input.provider);
    const priorAssociation = await ExternalMeetingModel.findOne({ tenantId, classId: cls._id });

    // 3. Execute with durable idempotency
    const idempotencyKey = `CREATE_MEETING:${cls._id}:${input.provider}`;

    const meetingResult = await IntegrationOperationService.executeWithIdempotency({
      tenantId,
      provider: input.provider,
      connectionId: connection._id.toString(),
      operationType: 'CREATE_MEETING',
      canonicalResourceType: 'Class',
      canonicalResourceId: cls._id.toString(),
      idempotencyKey,
      payload: {
        topic: input.topic || cls.name,
        agenda: input.agenda,
        startAt: cls.scheduledStartAt || cls.startDate,
        endAt: cls.scheduledEndAt || cls.endDate,
        timezone: cls.timezone || 'UTC'
      },
      fn: async () => {
        const result = await providerAdapter.createMeeting(connection, {
          tenantId,
          branchId,
          classId: cls._id.toString(),
          topic: input.topic || cls.name,
          agenda: input.agenda,
          startTime: cls.scheduledStartAt || cls.startDate || new Date(),
          endTime: cls.scheduledEndAt || cls.endDate || new Date(),
          timezone: cls.timezone || 'UTC',
          organizerUserId: actor.userId,
          password: input.password
        });
        return { result, externalResourceId: result.externalMeetingId };
      }
    });

    if (priorAssociation && priorAssociation.provider !== input.provider && priorAssociation.providerStatus !== 'CANCELLED') {
      const priorConnection = await IntegrationConnectionModel.findOne({ _id: priorAssociation.connectionId, tenantId });
      if (priorConnection) {
        try { await IntegrationProviderRegistry.getLiveMeetingProvider(priorAssociation.provider).cancelMeeting(priorConnection, priorAssociation.externalMeetingId, 'Provider switched'); }
        catch { /* canonical switch remains authoritative; failed retirement is auditable below */ }
      }
      await LiveMeetingAssociationHistoryModel.updateMany(
        { tenantId, classId: cls._id, status: 'ACTIVE' },
        { $set: { status: 'RETIRED', retiredAt: new Date(), retirementReason: `SWITCHED_TO_${input.provider}` } }
      );
    }

    // 4. Update / Upsert ExternalMeeting mapping
    // A deterministic mapping id keeps the one-class/one-active-association invariant
    // even during startup windows before Mongo has finished reconciling indexes.
    const mappingId = new Types.ObjectId(crypto.createHash('sha256').update(`${tenantId}:${cls._id}`).digest('hex').slice(0, 24));
    let externalMeeting: IExternalMeetingDocument | null;
    try {
      externalMeeting = await ExternalMeetingModel.findOneAndUpdate(
        { _id: mappingId, tenantId: new Types.ObjectId(tenantId), classId: cls._id },
        {
        $set: {
          branchId: cls.branchId,
          provider: input.provider,
          connectionId: connection._id,
          organizerUserId: new Types.ObjectId(actor.userId),
          externalMeetingId: meetingResult.externalMeetingId,
          externalCalendarEventId: meetingResult.externalCalendarEventId || null,
          joinUrl: meetingResult.joinUrl,
          hostUrl: meetingResult.hostUrl || meetingResult.joinUrl,
          providerStatus: meetingResult.providerStatus,
          scheduledStart: cls.scheduledStartAt || cls.startDate,
          scheduledEnd: cls.scheduledEndAt || cls.endDate,
          timezone: cls.timezone || 'UTC',
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          providerVersion: meetingResult.providerVersion || '1',
          metadata: meetingResult.metadata || {}
        }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      externalMeeting = await ExternalMeetingModel.findOne({ _id: mappingId, tenantId, classId: cls._id });
    }
    if (!externalMeeting) throw new Error('Failed to persist external meeting mapping');

    const historyIdentity = {
      tenantId: new Types.ObjectId(tenantId), classId: cls._id,
      provider: input.provider, externalMeetingId: meetingResult.externalMeetingId
    };
    try {
      await LiveMeetingAssociationHistoryModel.findOneAndUpdate(
        historyIdentity,
        { $setOnInsert: { connectionId: connection._id, joinUrl: meetingResult.joinUrl, actorId: new Types.ObjectId(actor.userId), activatedAt: new Date() }, $set: { status: 'ACTIVE', retiredAt: null, retirementReason: null } },
        { upsert: true, new: true }
      );
    } catch (error: any) {
      // Concurrent identical creates can both observe no row before the unique
      // partial index elects one ACTIVE winner. Only accept the exact identity.
      if (error?.code !== 11000 || !(await LiveMeetingAssociationHistoryModel.findOne(historyIdentity))) throw error;
    }

    // Emit event for Automation
    try {
      await DomainEventService.publish({
        eventId: `class.external_meeting_ready:${cls._id}:${Date.now()}`,
        eventType: 'class.external_meeting_ready',
        tenantId,
        occurredAt: new Date(),
        actorId: actor.userId,
        resourceType: 'Class',
        resourceId: cls._id.toString(),
        branchId: branchId || undefined,
        correlationId: `corr_${Date.now()}`,
        depth: 0,
        payloadVersion: 1,
        payload: {
          classId: cls._id.toString(),
          provider: input.provider,
          joinUrl: meetingResult.joinUrl
        }
      });
    } catch {
      // Non-blocking
    }

    await AuditService.logEvent({
      actorId: actor.userId,
      tenantId,
      action: 'LIVE_CLASS_MEETING_CREATED',
      resource: 'ExternalMeeting',
      resourceId: externalMeeting._id.toString(),
      metadata: { classId, provider: input.provider, externalMeetingId: meetingResult.externalMeetingId }
    });

    return this.toDTO(externalMeeting);
  }

  /**
   * Reschedules an existing meeting when the canonical Class is rescheduled.
   */
  public static async rescheduleMeetingForClass(
    tenantId: string,
    classId: string,
    actor: BranchActor
  ): Promise<IExternalMeetingDTO | null> {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Canonical Class not found');
    const branchId = cls.branchId?.toString();
    if (branchId) await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, { requireActive: true });
    if (actor.roles?.includes('INSTRUCTOR') && cls.instructorId?.toString() !== actor.userId) {
      throw new ForbiddenError('Only the assigned instructor may manage this class meeting');
    }

    const externalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId });
    if (!externalMeeting) {
      return null;
    }

    const connection = await IntegrationConnectionModel.findOne({
      _id: externalMeeting.connectionId,
      tenantId
    });

    if (!connection) {
      externalMeeting.syncStatus = 'FAILED';
      await externalMeeting.save();
      return this.toDTO(externalMeeting);
    }

    const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider(externalMeeting.provider);
    const revision = cls.scheduleRevision || 1;
    const idempotencyKey = `RESCHEDULE_MEETING:${cls._id}:${revision}`;

    try {
      if (!providerAdapter.capabilities.supportsUpdate) {
        // Google Meet spaces have no scheduled start/end. DIDM remains the
        // schedule authority and the existing space/join URI is preserved.
        externalMeeting.scheduledStart = cls.scheduledStartAt || cls.startDate || new Date();
        externalMeeting.scheduledEnd = cls.scheduledEndAt || cls.endDate || new Date();
        externalMeeting.timezone = cls.timezone || 'UTC';
        externalMeeting.syncStatus = 'SYNCED';
        externalMeeting.lastSyncedAt = new Date();
        externalMeeting.metadata = { ...(externalMeeting.metadata || {}), rescheduleSemantics: 'CANONICAL_ONLY_PROVIDER_SPACE_UNCHANGED' };
        await externalMeeting.save();
        return this.toDTO(externalMeeting);
      }
      const updatedResult = await IntegrationOperationService.executeWithIdempotency({
        tenantId,
        provider: externalMeeting.provider,
        connectionId: connection._id.toString(),
        operationType: 'RESCHEDULE_MEETING',
        canonicalResourceType: 'Class',
        canonicalResourceId: cls._id.toString(),
        idempotencyKey,
        payload: {
          startAt: cls.scheduledStartAt || cls.startDate,
          endAt: cls.scheduledEndAt || cls.endDate,
          timezone: cls.timezone || 'UTC'
        },
        fn: async () => {
          const result = await providerAdapter.updateMeeting(connection, externalMeeting.externalMeetingId, {
            startTime: cls.scheduledStartAt || cls.startDate || new Date(),
            endTime: cls.scheduledEndAt || cls.endDate || new Date(),
            timezone: cls.timezone || 'UTC'
          });
          return { result, externalResourceId: externalMeeting.externalMeetingId };
        }
      });

      externalMeeting.scheduledStart = cls.scheduledStartAt || cls.startDate || new Date();
      externalMeeting.scheduledEnd = cls.scheduledEndAt || cls.endDate || new Date();
      externalMeeting.timezone = cls.timezone || 'UTC';
      externalMeeting.syncStatus = 'SYNCED';
      externalMeeting.lastSyncedAt = new Date();
      externalMeeting.providerVersion = updatedResult.providerVersion || '2';
      await externalMeeting.save();

      return this.toDTO(externalMeeting);
    } catch (err: any) {
      externalMeeting.syncStatus = 'FAILED';
      await externalMeeting.save();
      throw err;
    }
  }

  /**
   * Cancels external meeting when canonical Class is cancelled.
   */
  public static async cancelMeetingForClass(
    tenantId: string,
    classId: string,
    reason?: string,
    actor?: BranchActor
  ): Promise<boolean> {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Canonical Class not found');
    const branchId = cls.branchId?.toString();
    if (branchId && actor) await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, { requireActive: true });
    if (actor?.roles?.includes('INSTRUCTOR') && cls.instructorId?.toString() !== actor.userId) {
      throw new ForbiddenError('Only the assigned instructor may manage this class meeting');
    }
    const externalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId });
    if (!externalMeeting) return true;

    const connection = await IntegrationConnectionModel.findOne({
      _id: externalMeeting.connectionId,
      tenantId
    });

    if (connection) {
      try {
        const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider(externalMeeting.provider);
        const idempotencyKey = `CANCEL_MEETING:${classId}:${Date.now()}`;

        await IntegrationOperationService.executeWithIdempotency({
          tenantId,
          provider: externalMeeting.provider,
          connectionId: connection._id.toString(),
          operationType: 'CANCEL_MEETING',
          canonicalResourceType: 'Class',
          canonicalResourceId: classId,
          idempotencyKey,
          payload: { reason },
          fn: async () => {
            const success = await providerAdapter.cancelMeeting(connection, externalMeeting.externalMeetingId, reason);
            return { result: success, externalResourceId: externalMeeting.externalMeetingId };
          }
        });
      } catch {
        // Tolerant to provider offline during cancellation
      }
    }

    externalMeeting.providerStatus = 'CANCELLED';
    externalMeeting.syncStatus = 'SYNCED';
    await externalMeeting.save();
    return true;
  }

  /**
   * Validates actor authorization and returns join information.
   * Cancelled class is NEVER joinable!
   * Students only see joinUrl without host secrets.
   */
  public static async getAuthorizedJoinInfo(
    tenantId: string,
    classId: string,
    actor: BranchActor
  ): Promise<IJoinInformationDTO> {
    // 1. Fetch Class
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) {
      throw new NotFoundError('Class not found');
    }

    if (cls.status === 'CANCELLED') {
      throw new ForbiddenError('This live class has been cancelled and cannot be joined.');
    }

    const branchId = cls.branchId?.toString();
    if (branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, {
        requireActive: true
      });
    }

    // 2. Fetch User & Status
    const user = await UserModel.findOne({ _id: actor.userId, tenantId });
    if (!user || user.status !== 'ACTIVE') {
      throw new ForbiddenError('User account is not active');
    }

    const isInstructor = cls.instructorId?.toString() === actor.userId;
    const isSuperOrTenantAdmin = actor.isSuperAdmin || (actor.roles && actor.roles.includes('TENANT_ADMIN'));

    if (!isInstructor && !isSuperOrTenantAdmin) {
      // Must be an active enrolled student
      const enrollment = await EnrollmentModel.findOne({
        tenantId,
        studentId: actor.userId,
        courseId: cls.courseId,
        status: 'ACTIVE'
      });

      if (!enrollment) {
        throw new ForbiddenError('You are not enrolled in this course/class');
      }
    }

    // 3. Fetch ExternalMeeting
    const externalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId });
    if (!externalMeeting) {
      throw new NotFoundError('No live meeting is scheduled for this class');
    }

    const connection = await IntegrationConnectionModel.findOne({
      _id: externalMeeting.connectionId,
      tenantId
    });
    if (!connection || connection.status !== 'CONNECTED') {
      const state = connection?.status || 'DISCONNECTED';
      throw new ConflictError(`Live meeting provider is unavailable: ${state}`);
    }

    const isHost = isInstructor || isSuperOrTenantAdmin;

    return {
      classId: cls._id.toString(),
      provider: externalMeeting.provider,
      joinUrl: externalMeeting.joinUrl,
      startUrl: isHost ? externalMeeting.hostUrl || externalMeeting.joinUrl : undefined,
      isHost: Boolean(isHost),
      scheduledStart: externalMeeting.scheduledStart,
      scheduledEnd: externalMeeting.scheduledEnd,
      status: externalMeeting.providerStatus,
      syncStatus: externalMeeting.syncStatus
    };
  }

  public static async listMeetingHistory(tenantId: string, classId: string, actor: BranchActor) {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Class not found');
    if (cls.branchId) await BranchAccessService.assertBranchAccess(tenantId, actor, cls.branchId.toString(), { requireActive: true });
    const assigned = cls.instructorId?.toString() === actor.userId;
    if (!assigned && !actor.isSuperAdmin && !actor.roles?.includes('TENANT_ADMIN')) throw new ForbiddenError('Only the assigned instructor or an administrator may view meeting history');
    return LiveMeetingAssociationHistoryModel.find({ tenantId, classId }).sort({ activatedAt: -1 }).lean();
  }

  /**
   * Retrieves participant evidence from meeting provider and imports into AttendanceEvidence.
   */
  public static async syncAttendanceEvidence(
    tenantId: string,
    classId: string,
    actor: BranchActor,
    rawOptions?: unknown
  ): Promise<IAttendanceEvidenceDTO[]> {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Class not found');

    const branchId = cls.branchId?.toString();
    if (branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, {
        requireActive: true
      });
    }

    const externalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId });
    if (!externalMeeting) {
      throw new NotFoundError('No external meeting found for this class');
    }

    const connection = await IntegrationConnectionModel.findOne({
      _id: externalMeeting.connectionId,
      tenantId
    });
    if (!connection) throw new BadRequestError('Connection unavailable');

    const providerAdapter = IntegrationProviderRegistry.getLiveMeetingProvider(externalMeeting.provider);
    const participants = await providerAdapter.getParticipants(connection, externalMeeting.externalMeetingId);

    // Fetch enrolled students for identity resolution
    const enrollments = await EnrollmentModel.find({
      tenantId,
      courseId: cls.courseId,
      status: { $in: ['ACTIVE', 'COMPLETED'] }
    }).select('studentId');

    const studentIds = enrollments.map((e) => e.studentId);
    const students = await UserModel.find({ _id: { $in: studentIds }, tenantId }).lean();
    const studentEmailMap = new Map(students.map((s) => [s.email.toLowerCase(), s._id]));
    const studentNameMap = new Map(students.map((s) => [s.name.toLowerCase().trim(), s._id]));

    const results: IAttendanceEvidenceDocument[] = [];

    for (const p of participants) {
      let resolvedStudentId: Types.ObjectId | null = null;
      let resolutionStatus: 'RESOLVED' | 'UNRESOLVED' | 'CONFLICT' = 'UNRESOLVED';

      if (p.email) {
        if (studentEmailMap.has(p.email.toLowerCase())) {
          resolvedStudentId = studentEmailMap.get(p.email.toLowerCase())!;
          resolutionStatus = 'RESOLVED';
        } else {
          resolvedStudentId = null;
          resolutionStatus = 'UNRESOLVED';
        }
      } else if (p.displayName && studentNameMap.has(p.displayName.toLowerCase().trim())) {
        resolvedStudentId = studentNameMap.get(p.displayName.toLowerCase().trim())!;
        resolutionStatus = 'RESOLVED';
      }

      const doc = await AttendanceEvidenceModel.findOneAndUpdate(
        {
          tenantId,
          classId: cls._id,
          participantExternalId: p.participantExternalId,
          joinTime: p.joinTime
        },
        {
          $set: {
            branchId: cls.branchId,
            provider: externalMeeting.provider,
            externalMeetingId: externalMeeting.externalMeetingId,
            displayName: p.displayName,
            email: p.email,
            leaveTime: p.leaveTime || null,
            durationMinutes: p.durationMinutes,
            resolvedStudentId,
            resolutionStatus
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push(doc);
    }

    return results.map((d) => this.toEvidenceDTO(d));
  }

  public static async getRecordings(
    tenantId: string,
    classId: string,
    actor: BranchActor
  ): Promise<RecordingMetadataItem[]> {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Class not found');

    const externalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId });
    if (!externalMeeting) return [];

    const connection = await IntegrationConnectionModel.findOne({
      _id: externalMeeting.connectionId,
      tenantId
    });
    if (!connection) return [];

    const adapter = IntegrationProviderRegistry.getLiveMeetingProvider(externalMeeting.provider);
    return adapter.getRecordings(connection, externalMeeting.externalMeetingId);
  }

  public static async getTranscripts(
    tenantId: string,
    classId: string,
    actor: BranchActor
  ): Promise<TranscriptMetadataItem[]> {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Class not found');

    const externalMeeting = await ExternalMeetingModel.findOne({ tenantId, classId });
    if (!externalMeeting) return [];

    const connection = await IntegrationConnectionModel.findOne({
      _id: externalMeeting.connectionId,
      tenantId
    });
    if (!connection) return [];

    const adapter = IntegrationProviderRegistry.getLiveMeetingProvider(externalMeeting.provider);
    return adapter.getTranscripts(connection, externalMeeting.externalMeetingId);
  }
}
