import {
  IntegrationProvider,
  ILiveMeetingCapabilities,
  ExternalMeetingStatus,
  IExternalMeetingDTO
} from '@edtech/types';
import { IIntegrationConnectionDocument } from '@edtech/database';

export interface CreateMeetingInput {
  tenantId: string;
  branchId?: string | null;
  classId: string;
  topic: string;
  agenda?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  organizerUserId: string;
  organizerEmail?: string;
  password?: string;
  autoRecord?: boolean;
  idempotencyKey?: string;
}

export interface UpdateMeetingInput {
  topic?: string;
  agenda?: string;
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  password?: string;
}

export interface MeetingResult {
  externalMeetingId: string;
  externalCalendarEventId?: string;
  joinUrl: string;
  hostUrl?: string;
  password?: string;
  providerStatus: ExternalMeetingStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  providerVersion?: string;
  metadata?: Record<string, any>;
}

export interface ParticipantEvidenceItem {
  participantExternalId: string;
  displayName: string;
  email?: string;
  joinTime: Date;
  leaveTime?: Date;
  durationMinutes: number;
}

export interface RecordingMetadataItem {
  recordingId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  playUrl?: string;
  downloadUrl?: string;
  fileSizeBytes?: number;
  recordingStatus: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface TranscriptMetadataItem {
  transcriptId: string;
  language: string;
  transcriptUrl?: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  externalAccountId?: string;
  scopes?: string[];
  latencyMs?: number;
}

export interface LiveMeetingProvider {
  readonly provider: IntegrationProvider;
  readonly capabilities: ILiveMeetingCapabilities;

  createMeeting(
    connection: IIntegrationConnectionDocument,
    input: CreateMeetingInput
  ): Promise<MeetingResult>;

  getMeeting(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<MeetingResult | null>;

  updateMeeting(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string,
    input: UpdateMeetingInput
  ): Promise<MeetingResult>;

  cancelMeeting(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string,
    reason?: string
  ): Promise<boolean>;

  getJoinInformation(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string,
    role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
  ): Promise<{ joinUrl: string; hostUrl?: string }>;

  getParticipants(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<ParticipantEvidenceItem[]>;

  getRecordings(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<RecordingMetadataItem[]>;

  getTranscripts(
    connection: IIntegrationConnectionDocument,
    externalMeetingId: string
  ): Promise<TranscriptMetadataItem[]>;

  healthCheck(
    connection: IIntegrationConnectionDocument
  ): Promise<HealthCheckResult>;
}
