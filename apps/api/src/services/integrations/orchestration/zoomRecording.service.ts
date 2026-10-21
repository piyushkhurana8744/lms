import { Types } from 'mongoose';
import {
  ClassModel, EnrollmentModel, ExternalMeetingModel, IntegrationConnectionModel,
  IntegrationOperationModel, LiveClassRecordingModel, ILiveClassRecordingDocument
} from '@edtech/database';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../errors/appError';
import { BranchAccessService, BranchActor } from '../../branchAccess.service';
import { AuditService } from '../../audit.service';
import { IntegrationProviderRegistry } from '../registry/providerRegistry.service';
import { ZoomAdapter } from '../adapters/zoom.adapter';

const MAX_SYNC_ATTEMPTS = 12;
const RETRY_MS = [60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000, 20 * 60_000, 30 * 60_000];

export class ZoomRecordingService {
  static async assertClassAccess(tenantId: string, classId: string, actor: BranchActor, manage = false) {
    const cls = await ClassModel.findOne({ _id: classId, tenantId });
    if (!cls) throw new NotFoundError('Class not found');
    if (cls.branchId) await BranchAccessService.assertBranchAccess(tenantId, actor, cls.branchId.toString(), { requireActive: true });
    const isInstructor = cls.instructorId?.toString() === actor.userId;
    const isAdmin = actor.isSuperAdmin || actor.roles?.includes('TENANT_ADMIN');
    if (manage && !isInstructor && !isAdmin) throw new ForbiddenError('Only the assigned instructor or an administrator may manage this recording');
    if (!manage && !isInstructor && !isAdmin) {
      const enrollment = await EnrollmentModel.findOne({ tenantId, studentId: actor.userId, courseId: cls.courseId, status: 'ACTIVE' });
      if (!enrollment) throw new ForbiddenError('You are not enrolled in this course/class');
    }
    return cls;
  }

  static async initializeForMeeting(tenantId: string, classId: string, enabled: boolean) {
    const [cls, meeting] = await Promise.all([
      ClassModel.findOne({ _id: classId, tenantId }),
      ExternalMeetingModel.findOne({ tenantId, classId, provider: 'ZOOM' })
    ]);
    if (!cls || !meeting || !cls.instructorId) return null;
    return LiveClassRecordingModel.findOneAndUpdate(
      { tenantId, provider: 'ZOOM', providerMeetingId: meeting.externalMeetingId },
      { $setOnInsert: {
        tenantId: new Types.ObjectId(tenantId), branchId: cls.branchId || null, courseId: cls.courseId || null,
        batchId: cls.batchId || null, classId: cls._id, instructorId: cls.instructorId,
        externalMeetingId: meeting._id, connectionId: meeting.connectionId, provider: 'ZOOM',
        providerMeetingId: meeting.externalMeetingId, deliveryMode: 'PROVIDER_HOSTED', files: [], attempts: 0
      }, $set: { state: enabled ? 'NOT_STARTED' : 'NOT_ENABLED' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  static async signalMeetingEnded(connectionId: string, providerMeetingId: string, completedAt = new Date()) {
    const meeting = await ExternalMeetingModel.findOne({ connectionId, provider: 'ZOOM', externalMeetingId: providerMeetingId }).setOptions({ bypassTenantFilter: true });
    if (!meeting) return null;
    const recording = await LiveClassRecordingModel.findOneAndUpdate(
      { tenantId: meeting.tenantId, provider: 'ZOOM', providerMeetingId, state: { $ne: 'NOT_ENABLED' } },
      { $set: { meetingEndedAt: completedAt, state: 'AWAITING_PROCESSING', nextRetryAt: new Date(Date.now() + 60_000) }, $inc: { stateVersion: 1 } },
      { new: true }
    ).setOptions({ bypassTenantFilter: true });
    if (recording) await this.enqueueSync(recording, 'meeting-ended');
    return recording;
  }

  static async signalRecordingCompleted(connectionId: string, providerMeetingId: string, providerMeetingUuid?: string, completedAt = new Date()) {
    const meeting = await ExternalMeetingModel.findOne({ connectionId, provider: 'ZOOM', externalMeetingId: providerMeetingId }).setOptions({ bypassTenantFilter: true });
    if (!meeting) return null;
    const recording = await LiveClassRecordingModel.findOneAndUpdate(
      { tenantId: meeting.tenantId, provider: 'ZOOM', providerMeetingId, state: { $ne: 'NOT_ENABLED' } },
      { $set: { providerMeetingUuid, providerCompletedAt: completedAt, state: 'PROCESSING', nextRetryAt: new Date() }, $inc: { stateVersion: 1 } },
      { new: true }
    ).setOptions({ bypassTenantFilter: true });
    if (recording) await this.enqueueSync(recording, 'recording.completed');
    return recording;
  }

  static async enqueueSync(recording: ILiveClassRecordingDocument, reason: string) {
    const slot = Math.floor(Date.now() / 60_000);
    return IntegrationOperationModel.findOneAndUpdate(
      { idempotencyKey: `SYNC_RECORDING:${recording._id}:${recording.stateVersion}:${slot}` },
      { $setOnInsert: {
        tenantId: recording.tenantId, provider: 'ZOOM', connectionId: recording.connectionId,
        operationType: 'SYNC_RECORDING', canonicalResourceType: 'LiveClassRecording',
        canonicalResourceId: recording._id.toString(), status: 'PENDING', attempts: 0,
        payload: { reason }, correlationId: `zoom-recording-${recording._id}-${slot}`
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).setOptions({ bypassTenantFilter: true });
  }

  static async sync(recordingId: string) {
    const recording = await LiveClassRecordingModel.findById(recordingId).setOptions({ bypassTenantFilter: true });
    if (!recording) throw new NotFoundError('Recording synchronization target not found');
    const connection = await IntegrationConnectionModel.findOne({ _id: recording.connectionId, tenantId: recording.tenantId }).setOptions({ bypassTenantFilter: true });
    if (!connection || connection.status !== 'CONNECTED') return this.fail(recording, 'ZOOM_RECONNECT_REQUIRED', 'Reconnect the Zoom host account.', false);
    const adapter = IntegrationProviderRegistry.getLiveMeetingProvider('ZOOM') as ZoomAdapter;
    if (typeof adapter.getRecordingManifest !== 'function') throw new ConflictError('Zoom recording synchronization is unavailable');
    recording.state = 'PROCESSING'; recording.lastAttemptAt = new Date(); recording.attempts += 1; recording.stateVersion += 1;
    await recording.save();
    try {
      const manifest = await adapter.getRecordingManifest(connection, recording.providerMeetingUuid || recording.providerMeetingId);
      const files = (manifest.recording_files || []).filter((file: any) => file?.id && ['MP4','M4A','TRANSCRIPT','CC','CHAT'].includes(String(file.file_type || '').toUpperCase()));
      if (!files.length || !files.some((file: any) => String(file.status).toLowerCase() === 'completed')) {
        return this.fail(recording, 'ZOOM_RECORDING_PROCESSING', 'Zoom is still processing the recording.', true);
      }
      recording.files = files.map((file: any) => ({
        providerFileId: String(file.id), fileType: String(file.file_type || 'UNKNOWN'), mimeType: file.file_extension ? undefined : file.content_type,
        sizeBytes: Number(file.file_size || 0), status: String(file.status || ''),
        recordingStart: file.recording_start ? new Date(file.recording_start) : undefined,
        recordingEnd: file.recording_end ? new Date(file.recording_end) : undefined,
        playUrl: file.play_url, downloadUrl: file.download_url
      }));
      recording.providerMeetingUuid = manifest.uuid || recording.providerMeetingUuid;
      recording.state = 'AVAILABLE_AT_PROVIDER'; recording.availableAt = new Date(); recording.nextRetryAt = undefined;
      recording.safeFailureCode = undefined; recording.safeFailureMessage = undefined; recording.stateVersion += 1;
      await recording.save();
      await AuditService.logEvent({ actorId: recording.instructorId.toString(), tenantId: recording.tenantId.toString(), action: 'ZOOM_RECORDING_AVAILABLE', resource: 'LiveClassRecording', resourceId: recording._id.toString(), metadata: { classId: recording.classId.toString(), fileCount: recording.files.length, deliveryMode: recording.deliveryMode } });
      return recording;
    } catch (error: any) {
      const permanent = ['AUTH_REQUIRED','PERMISSION_DENIED','INVALID_REQUEST'].includes(String(error?.category || ''));
      return this.fail(recording, String(error?.category || 'ZOOM_SYNC_FAILED'), permanent ? 'Zoom authorization or recording permission must be corrected.' : 'Zoom recording synchronization will be retried.', !permanent);
    }
  }

  private static async fail(recording: ILiveClassRecordingDocument, code: string, message: string, retryable: boolean) {
    const canRetry = retryable && recording.attempts < MAX_SYNC_ATTEMPTS;
    recording.state = canRetry ? 'FAILED_RETRYABLE' : 'FAILED_PERMANENT';
    recording.safeFailureCode = code; recording.safeFailureMessage = message; recording.stateVersion += 1;
    recording.nextRetryAt = canRetry ? new Date(Date.now() + RETRY_MS[Math.min(recording.attempts, RETRY_MS.length - 1)]) : undefined;
    await recording.save();
    return recording;
  }

  static async listForClass(tenantId: string, classId: string, actor: BranchActor) {
    await this.assertClassAccess(tenantId, classId, actor);
    const rows = await LiveClassRecordingModel.find({ tenantId, classId }).sort({ createdAt: -1 }).lean();
    return rows.map((row: any) => ({
      id: row._id.toString(), classId: row.classId.toString(), state: row.state, deliveryMode: row.deliveryMode,
      availableAt: row.availableAt, attempts: row.attempts, errorCode: row.safeFailureCode,
      errorMessage: row.safeFailureMessage, files: (row.files || []).map((file: any) => ({
        id: file.providerFileId, fileType: file.fileType, mimeType: file.mimeType, sizeBytes: file.sizeBytes,
        status: file.status, recordingStart: file.recordingStart, recordingEnd: file.recordingEnd,
        playable: Boolean(file.playUrl || file.storageKey)
      }))
    }));
  }

  static async listLibrary(tenantId: string, actor: BranchActor) {
    const isAdmin = actor.isSuperAdmin || actor.roles?.includes('TENANT_ADMIN');
    const classQuery: any = { tenantId };
    if (!isAdmin && actor.roles?.includes('INSTRUCTOR')) classQuery.instructorId = actor.userId;
    else if (!isAdmin) {
      const enrollments = await EnrollmentModel.find({ tenantId, studentId: actor.userId, status: 'ACTIVE' }).select('courseId').lean();
      classQuery.courseId = { $in: enrollments.map((item: any) => item.courseId) };
    }
    const classes = await ClassModel.find(classQuery).select('_id name courseId instructorId scheduledStartAt startDate branchId').lean();
    const byId = new Map(classes.map((item: any) => [item._id.toString(), item]));
    const recordings = await LiveClassRecordingModel.find({ tenantId, classId: { $in: classes.map((item: any) => item._id) } }).sort({ availableAt: -1, createdAt: -1 }).lean();
    return recordings.map((row: any) => {
      const cls: any = byId.get(row.classId.toString());
      return {
        id: row._id.toString(), classId: row.classId.toString(), classTitle: cls?.name || 'Recorded class',
        courseId: cls?.courseId?.toString(), instructorId: cls?.instructorId?.toString(),
        sessionDate: cls?.scheduledStartAt || cls?.startDate, state: row.state, availableAt: row.availableAt,
        files: (row.files || []).map((file: any) => ({ id: file.providerFileId, fileType: file.fileType, sizeBytes: file.sizeBytes, playable: Boolean(file.playUrl || file.storageKey) }))
      };
    });
  }

  static async playback(tenantId: string, recordingId: string, fileId: string, actor: BranchActor) {
    const recording = await LiveClassRecordingModel.findOne({ _id: recordingId, tenantId });
    if (!recording) throw new NotFoundError('Recording not found');
    await this.assertClassAccess(tenantId, recording.classId.toString(), actor);
    if (!['AVAILABLE_AT_PROVIDER','AVAILABLE_IN_LMS'].includes(recording.state)) throw new ConflictError('Recording is not available for playback');
    const file = recording.files.find((item) => item.providerFileId === fileId);
    if (!file?.playUrl) throw new NotFoundError('Playable recording file not found');
    const target = new URL(file.playUrl);
    if (target.protocol !== 'https:' || !/(^|\.)zoom\.us$/i.test(target.hostname)) throw new BadRequestError('Unsafe recording playback target');
    await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'ZOOM_RECORDING_PLAYED', resource: 'LiveClassRecording', resourceId: recording._id.toString(), metadata: { classId: recording.classId.toString(), providerFileId: fileId } });
    return target.toString();
  }

  static async retry(tenantId: string, classId: string, actor: BranchActor) {
    await this.assertClassAccess(tenantId, classId, actor, true);
    const recording = await LiveClassRecordingModel.findOne({ tenantId, classId }).sort({ createdAt: -1 });
    if (!recording) throw new NotFoundError('Recording not found');
    recording.state = 'FAILED_RETRYABLE'; recording.nextRetryAt = new Date(); recording.stateVersion += 1; await recording.save();
    await this.enqueueSync(recording, 'authorized-manual-retry');
    return { id: recording._id.toString(), state: recording.state };
  }
}
