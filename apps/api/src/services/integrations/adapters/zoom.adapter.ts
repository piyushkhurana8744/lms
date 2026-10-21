import { LiveMeetingProvider, CreateMeetingInput, UpdateMeetingInput, MeetingResult, ParticipantEvidenceItem, RecordingMetadataItem, TranscriptMetadataItem, HealthCheckResult } from '../contracts/liveMeetingProvider.contract';
import { IIntegrationConnectionDocument } from '@edtech/database';
import { IntegrationProvider, ILiveMeetingCapabilities } from '@edtech/types';
import { TokenManagerService } from '../security/tokenManager.service';
import { AppError } from '../../../errors/appError';
import crypto from 'crypto';

type ZoomErrorCategory = 'AUTH_REQUIRED' | 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'RESOURCE_NOT_FOUND' | 'INVALID_REQUEST' | 'TEMPORARY_PROVIDER_FAILURE';

function safeZoomMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\b(?:access|refresh|authorization)[_-]?token\b\s*[:=]\s*\S+/gi, '[credential redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 300);
}

function zoomFailure(status: number, body: any, operation: string, retryAfter?: string | null): AppError {
  const zoomCode = typeof body?.code === 'number' || typeof body?.code === 'string' ? String(body.code) : undefined;
  const upstreamMessage = safeZoomMessage(body?.message || body?.reason || body?.error_description);
  const correlationId = crypto.randomUUID();
  let category: ZoomErrorCategory = status >= 500 ? 'TEMPORARY_PROVIDER_FAILURE' : 'INVALID_REQUEST';
  let clientStatus = status >= 500 ? 503 : 400;
  let message = upstreamMessage ? `Zoom rejected the ${operation}: ${upstreamMessage}` : `Zoom rejected the ${operation}`;

  if (status === 401 || ['124', '401'].includes(zoomCode || '')) {
    category = 'AUTH_REQUIRED'; clientStatus = 401; message = 'Zoom authorization is invalid or expired. Reconnect Zoom and try again.';
  } else if (status === 403 || ['200', '4711'].includes(zoomCode || '')) {
    category = 'PERMISSION_DENIED'; clientStatus = 403; message = upstreamMessage ? `Zoom denied the ${operation}: ${upstreamMessage}` : 'The connected Zoom account lacks the required permission or scope.';
  } else if (status === 404) {
    category = 'RESOURCE_NOT_FOUND'; clientStatus = 404; message = 'The Zoom meeting could not be found.';
  } else if (status === 429) {
    category = 'RATE_LIMITED'; clientStatus = 429; message = 'Zoom rate-limited this request. Try again after the indicated delay.';
  }

  const error = new AppError(message, clientStatus, category, {
    provider: 'ZOOM', operation, upstreamStatus: status, zoomCode, correlationId,
    retryable: category === 'RATE_LIMITED' || category === 'TEMPORARY_PROVIDER_FAILURE',
    ...(retryAfter ? { retryAfter } : {})
  });
  Object.assign(error, { category, status: status, upstreamStatus: status, zoomCode, correlationId, retryAfter });
  return error;
}

export class ZoomAdapter implements LiveMeetingProvider {
  readonly provider: IntegrationProvider = 'ZOOM';
  readonly capabilities: ILiveMeetingCapabilities = { supportsUpdate: true, supportsCancel: true, supportsParticipants: true, supportsRecordings: true, supportsTranscripts: false, supportsWebhooks: true };
  private async token(c: IIntegrationConnectionDocument) { return TokenManagerService.getValidAccessToken(c, async (refreshToken, creds) => { if (!creds.clientId || !creds.clientSecret) throw new Error('Zoom OAuth client configuration is missing'); const response = await fetch('https://zoom.us/oauth/token', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }) }); const d: any = await response.json().catch(() => ({})); if (!response.ok || !d.access_token) throw zoomFailure(response.status, d, 'token refresh', response.headers.get('retry-after')); return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresInSeconds: d.expires_in || 3600 }; }); }
  private async request<T>(c: IIntegrationConnectionDocument, path: string, init: RequestInit = {}): Promise<T> { const token = await this.token(c); const response = await fetch(`https://api.zoom.us/v2${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) } }); if (!response.ok) { const body = await response.json().catch(() => ({})); const method = String(init.method || 'GET').toUpperCase(); const operation = method === 'POST' ? 'meeting creation' : method === 'PATCH' ? 'meeting update' : method === 'DELETE' ? 'meeting deletion' : 'Zoom request'; throw zoomFailure(response.status, body, operation, response.headers.get('retry-after')); } if (response.status === 204) return undefined as T; return response.json() as Promise<T>; }
  private result(d: any, fallback?: UpdateMeetingInput): MeetingResult { const start = new Date(d.start_time || fallback?.startTime || Date.now()); const end = new Date(start.getTime() + Number(d.duration || 60) * 60000); return { externalMeetingId: String(d.id || d.uuid), joinUrl: d.join_url, hostUrl: d.start_url, password: d.password, providerStatus: d.status === 'started' ? 'IN_PROGRESS' : d.status === 'finished' ? 'COMPLETED' : 'SCHEDULED', scheduledStart: start, scheduledEnd: end, timezone: d.timezone || fallback?.timezone || 'UTC', providerVersion: String(d.settings?.meeting_authentication ? 2 : 1), metadata: { uuid: d.uuid, topic: d.topic } }; }
  async createMeeting(c: IIntegrationConnectionDocument, i: CreateMeetingInput): Promise<MeetingResult> { const minutes = Math.max(1, Math.ceil((i.endTime.getTime() - i.startTime.getTime()) / 60000)); const d = await this.request<any>(c, '/users/me/meetings', { method: 'POST', body: JSON.stringify({ topic: i.topic, agenda: i.agenda, type: 2, start_time: i.startTime.toISOString(), duration: minutes, timezone: i.timezone, password: i.password, settings: { join_before_host: false, waiting_room: true, auto_recording: i.autoRecord ? 'cloud' : 'none' } }) }); return this.result(d); }
  async getMeeting(c: IIntegrationConnectionDocument, id: string): Promise<MeetingResult | null> { try { return this.result(await this.request(c, `/meetings/${encodeURIComponent(id)}`)); } catch (e: any) { if (e.status === 404) return null; throw e; } }
  async updateMeeting(c: IIntegrationConnectionDocument, id: string, i: UpdateMeetingInput): Promise<MeetingResult> { const body: any = { topic: i.topic, agenda: i.agenda, start_time: i.startTime?.toISOString(), timezone: i.timezone, password: i.password }; if (i.startTime && i.endTime) body.duration = Math.max(1, Math.ceil((i.endTime.getTime() - i.startTime.getTime()) / 60000)); Object.keys(body).forEach(k => body[k] === undefined && delete body[k]); await this.request(c, `/meetings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }); const updated = await this.getMeeting(c, id); if (!updated) throw new Error('Zoom meeting disappeared after update'); return updated; }
  async cancelMeeting(c: IIntegrationConnectionDocument, id: string) { await this.request(c, `/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' }); return true; }
  async getJoinInformation(c: IIntegrationConnectionDocument, id: string, role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN') { const meeting = await this.getMeeting(c, id); if (!meeting) throw new Error('Zoom meeting not found'); return { joinUrl: meeting.joinUrl, hostUrl: role === 'STUDENT' ? undefined : meeting.hostUrl }; }
  async getParticipants(c: IIntegrationConnectionDocument, id: string): Promise<ParticipantEvidenceItem[]> { const d = await this.request<any>(c, `/report/meetings/${encodeURIComponent(id)}/participants?page_size=300`); return (d.participants || []).map((p: any) => ({ participantExternalId: p.id || p.user_id || p.email, displayName: p.name || p.user_name, email: p.user_email || p.email, joinTime: new Date(p.join_time), leaveTime: p.leave_time ? new Date(p.leave_time) : undefined, durationMinutes: Math.ceil(Number(p.duration || 0) / 60) })); }
  async getRecordings(c: IIntegrationConnectionDocument, id: string): Promise<RecordingMetadataItem[]> { const d = await this.request<any>(c, `/meetings/${encodeURIComponent(id)}/recordings`); return (d.recording_files || []).map((f: any) => ({ recordingId: f.id, startTime: new Date(f.recording_start), endTime: new Date(f.recording_end), durationMinutes: Math.ceil((new Date(f.recording_end).getTime() - new Date(f.recording_start).getTime()) / 60000), playUrl: f.play_url, downloadUrl: f.download_url, fileSizeBytes: f.file_size, recordingStatus: f.status === 'completed' ? 'COMPLETED' : 'PROCESSING' })); }
  async getRecordingManifest(c: IIntegrationConnectionDocument, id: string): Promise<any> {
    return this.request<any>(c, `/meetings/${encodeURIComponent(id)}/recordings`);
  }
  async getRecordingCapability(c: IIntegrationConnectionDocument): Promise<{ state: string; message: string }> {
    const recordingScopes = ['recording:read', 'recording:read:admin', 'cloud_recording:read:list_recording_files', 'cloud_recording:read:list_recording_files:admin'];
    if (!c.scopes.some((scope) => recordingScopes.includes(scope) || scope.startsWith('cloud_recording:read:list_recording_files:'))) {
      return { state: 'MISSING_SCOPES', message: 'Reconnect Zoom and grant cloud recording read access.' };
    }
    try {
      const settings = await this.request<any>(c, '/users/me/settings');
      const enabled = Boolean(settings?.recording?.cloud_recording);
      return enabled
        ? { state: 'READY', message: 'Zoom cloud recording is enabled for this host.' }
        : { state: 'DISABLED_BY_POLICY', message: 'Enable Cloud recording in the Zoom host account settings.' };
    } catch (error: any) {
      if (error?.category === 'PERMISSION_DENIED') return { state: 'MISSING_SCOPES', message: 'Zoom did not permit reading host recording settings.' };
      return { state: 'UNKNOWN', message: 'Zoom recording capability could not be verified temporarily.' };
    }
  }
  async getTranscripts(): Promise<TranscriptMetadataItem[]> { return []; }
  async healthCheck(c: IIntegrationConnectionDocument): Promise<HealthCheckResult> { const start = Date.now(); try { const d = await this.request<any>(c, '/users/me'); return { healthy: true, message: 'Zoom API reachable', externalAccountId: d.id || c.externalAccountId, scopes: c.scopes, latencyMs: Date.now() - start }; } catch (e: any) { return { healthy: false, message: e.message, latencyMs: Date.now() - start }; } }
}
