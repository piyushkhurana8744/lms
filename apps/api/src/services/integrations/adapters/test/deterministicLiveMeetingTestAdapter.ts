import {
  LiveMeetingProvider,
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingResult,
  ParticipantEvidenceItem,
  RecordingMetadataItem,
  TranscriptMetadataItem,
  HealthCheckResult
} from '../../contracts/liveMeetingProvider.contract';
import { IIntegrationConnectionDocument } from '@edtech/database';
import { IntegrationProvider, ILiveMeetingCapabilities } from '@edtech/types';
import { TokenManagerService } from '../../security/tokenManager.service';

export interface InjectedFailureConfig {
  errorType?: '429' | '503' | 'TIMEOUT' | 'AUTH_EXPIRED' | 'AMBIGUOUS_CREATE_CRASH' | 'NOT_FOUND';
  remainingCount?: number;
  delayMs?: number;
}

export class DeterministicLiveMeetingTestAdapter implements LiveMeetingProvider {
  public readonly provider: IntegrationProvider;
  public readonly capabilities: ILiveMeetingCapabilities;

  // In-memory provider store per instance/provider
  private createdMeetings = new Map<string, MeetingResult>();
  private meetingsByClassId = new Map<string, string>(); // classId -> externalMeetingId
  private injectedFailure: InjectedFailureConfig | null = null;
  private invocationCounts = new Map<string, number>();
  public participantEvidenceFixture: ParticipantEvidenceItem[] = [];
  public recordingFixture: RecordingMetadataItem[] = [];
  public transcriptFixture: TranscriptMetadataItem[] = [];

  constructor(
    provider: IntegrationProvider,
    customCapabilities?: Partial<ILiveMeetingCapabilities>
  ) {
    this.provider = provider;
    this.capabilities = {
      supportsUpdate: true,
      supportsCancel: true,
      supportsParticipants: true,
      supportsRecordings: true,
      supportsTranscripts: true,
      supportsWebhooks: true,
      ...customCapabilities
    };
  }

  public setInjectedFailure(config: InjectedFailureConfig | null) {
    this.injectedFailure = config;
  }

  public clearStore() {
    this.createdMeetings.clear();
    this.meetingsByClassId.clear();
    this.injectedFailure = null;
    this.invocationCounts.clear();
    this.participantEvidenceFixture = [];
  }

  public getDiagnostics() {
    return {
      createdMeetingCount: this.createdMeetings.size,
      classAssociationCount: this.meetingsByClassId.size,
      invocationCounts: Object.fromEntries(this.invocationCounts)
    };
  }

  private async checkInjectedFailure(operation: string, classId?: string) {
    this.invocationCounts.set(operation, (this.invocationCounts.get(operation) || 0) + 1);
    if (!this.injectedFailure || (this.injectedFailure.remainingCount !== undefined && this.injectedFailure.remainingCount <= 0)) {
      return;
    }

    if (this.injectedFailure.delayMs) await new Promise((resolve) => setTimeout(resolve, this.injectedFailure!.delayMs));

    if (this.injectedFailure.remainingCount !== undefined) {
      this.injectedFailure.remainingCount -= 1;
    }

    const { errorType } = this.injectedFailure;
    if (errorType === '429') {
      const err: any = new Error(`Provider rate limit exceeded (HTTP 429) for ${this.provider}`);
      err.status = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }
    if (errorType === '503') {
      const err: any = new Error(`Provider service unavailable (HTTP 503) for ${this.provider}`);
      err.status = 503;
      err.code = 'TEMPORARY_PROVIDER_FAILURE';
      throw err;
    }
    if (errorType === 'TIMEOUT') {
      const err: any = new Error(`Provider request timed out for ${this.provider}`);
      err.code = 'TIMEOUT';
      throw err;
    }
    if (errorType === 'AUTH_EXPIRED') {
      const err: any = new Error(`Invalid OAuth access token (HTTP 401) for ${this.provider}`);
      err.status = 401;
      err.code = 'AUTH_REQUIRED';
      throw err;
    }
    if (errorType === 'NOT_FOUND') {
      const err: any = new Error(`External meeting not found on ${this.provider}`);
      err.status = 404;
      err.code = 'RESOURCE_NOT_FOUND';
      throw err;
    }
    if (errorType === 'AMBIGUOUS_CREATE_CRASH') {
      // In ambiguous create crash: Provider creates meeting in its store, BUT crash happens before returning response to caller!
      if (operation === 'CREATE_MEETING' && classId) {
        const externalMeetingId = `ambiguous_${this.provider.toLowerCase()}_${classId}`;
        const joinUrl = `https://${this.provider.toLowerCase()}.test/join/${externalMeetingId}`;
        const result: MeetingResult = {
          externalMeetingId,
          joinUrl,
          hostUrl: `https://${this.provider.toLowerCase()}.test/host/${externalMeetingId}`,
          providerStatus: 'SCHEDULED',
          scheduledStart: new Date(),
          scheduledEnd: new Date(Date.now() + 3600000),
          timezone: 'UTC',
          providerVersion: '1'
        };
        this.createdMeetings.set(externalMeetingId, result);
        this.meetingsByClassId.set(classId, externalMeetingId);
      }
      const err: any = new Error(`Ambiguous worker crash during ${operation}`);
      err.code = 'AMBIGUOUS_CRASH';
      throw err;
    }
  }

  public async createMeeting(
    connection: IIntegrationConnectionDocument,
    input: CreateMeetingInput
  ): Promise<MeetingResult> {
    // If ambiguous create had already created meeting for this class on provider side, return it without duplicate creation!
    if (this.meetingsByClassId.has(input.classId)) {
      const existingId = this.meetingsByClassId.get(input.classId)!;
      const existing = this.createdMeetings.get(existingId);
      if (existing) {
        return existing;
      }
    }

    await this.checkInjectedFailure('CREATE_MEETING', input.classId);

    const externalMeetingId = `${this.provider.toLowerCase()}_mtg_${input.classId}_${Date.now()}`;
    const joinUrl = `https://${this.provider.toLowerCase()}.test/join/${externalMeetingId}`;
    const hostUrl = `https://${this.provider.toLowerCase()}.test/host/${externalMeetingId}`;

    const result: MeetingResult = {
      externalMeetingId,
      joinUrl,
      hostUrl,
      providerStatus: 'SCHEDULED',
      scheduledStart: input.startTime,
      scheduledEnd: input.endTime,
      timezone: input.timezone || 'UTC',
      providerVersion: '1',
      metadata: {
        topic: input.topic,
        agenda: input.agenda,
        organizerUserId: input.organizerUserId
      }
    };

    this.createdMeetings.set(externalMeetingId, result);
    this.meetingsByClassId.set(input.classId, externalMeetingId);
    return result;
  }

  public async getMeeting(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<MeetingResult | null> {
    await this.checkInjectedFailure('GET_MEETING');
    return this.createdMeetings.get(externalMeetingId) || null;
  }

  public async updateMeeting(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string,
    input: UpdateMeetingInput
  ): Promise<MeetingResult> {
    await this.checkInjectedFailure('UPDATE_MEETING');
    const existing = this.createdMeetings.get(externalMeetingId);
    if (!existing) {
      const updated: MeetingResult = {
        externalMeetingId,
        joinUrl: `https://${this.provider.toLowerCase()}.test/join/${externalMeetingId}`,
        providerStatus: 'SCHEDULED',
        scheduledStart: input.startTime || new Date(),
        scheduledEnd: input.endTime || new Date(Date.now() + 3600000),
        timezone: input.timezone || 'UTC',
        providerVersion: '2'
      };
      this.createdMeetings.set(externalMeetingId, updated);
      return updated;
    }

    const updated: MeetingResult = {
      ...existing,
      scheduledStart: input.startTime || existing.scheduledStart,
      scheduledEnd: input.endTime || existing.scheduledEnd,
      timezone: input.timezone || existing.timezone,
      providerVersion: String(Number(existing.providerVersion || 1) + 1)
    };
    this.createdMeetings.set(externalMeetingId, updated);
    return updated;
  }

  public async cancelMeeting(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string,
    reason?: string
  ): Promise<boolean> {
    await this.checkInjectedFailure('CANCEL_MEETING');
    const existing = this.createdMeetings.get(externalMeetingId);
    if (existing) {
      existing.providerStatus = 'CANCELLED';
      this.createdMeetings.set(externalMeetingId, existing);
    }
    return true;
  }

  public async getJoinInformation(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string,
    role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  ): Promise<{ joinUrl: string; hostUrl?: string }> {
    const existing = this.createdMeetings.get(externalMeetingId);
    const joinUrl = existing?.joinUrl || `https://${this.provider.toLowerCase()}.test/join/${externalMeetingId}`;
    const hostUrl = existing?.hostUrl || `https://${this.provider.toLowerCase()}.test/host/${externalMeetingId}`;

    return {
      joinUrl,
      hostUrl: role === 'STUDENT' ? undefined : hostUrl
    };
  }

  public async getParticipants(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<ParticipantEvidenceItem[]> {
    await this.checkInjectedFailure('GET_PARTICIPANTS');
    return this.participantEvidenceFixture;
  }

  public async getRecordings(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<RecordingMetadataItem[]> {
    await this.checkInjectedFailure('GET_RECORDINGS');
    return this.recordingFixture;
  }

  public async getTranscripts(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<TranscriptMetadataItem[]> {
    await this.checkInjectedFailure('GET_TRANSCRIPTS');
    return this.transcriptFixture;
  }

  public async healthCheck(
    connection: IIntegrationConnectionDocument
  ): Promise<HealthCheckResult> {
    if (this.injectedFailure?.errorType === 'AUTH_EXPIRED') {
      return {
        healthy: false,
        message: 'Invalid credentials',
        latencyMs: 10
      };
    }
    return {
      healthy: true,
      message: `${this.provider} test adapter operational`,
      externalAccountId: connection.externalAccountId || 'test_account_id',
      scopes: connection.scopes,
      latencyMs: 5
    };
  }
}
