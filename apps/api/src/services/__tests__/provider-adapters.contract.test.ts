import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { GoogleMeetAdapter } from '../integrations/adapters/googleMeet.adapter';
import { MicrosoftTeamsAdapter } from '../integrations/adapters/microsoftTeams.adapter';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';
import { ProviderOAuthConfigService } from '../integrations/security/providerOAuthConfig.service';

const connection = (provider: any) => ({
  _id: new Types.ObjectId(), provider, status: 'CONNECTED', scopes: [],
  expiresAt: new Date(Date.now() + 3600000),
  encryptedCredentials: SecretEncryptionService.encryptSecret(JSON.stringify({ accessToken: 'contract-access-token', refreshToken: 'refresh', clientId: 'client', clientSecret: 'secret' }))
} as any);
const response = (body: any, status = 200, headers: Record<string, string> = {}) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

afterEach(() => vi.restoreAllMocks());

describe('official provider adapter HTTP contracts', () => {
  it('always exposes all providers and truthfully reports deployment setup requirements without secrets', () => {
    const keys = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'ZOOM_OAUTH_CLIENT_ID', 'ZOOM_OAUTH_CLIENT_SECRET', 'MICROSOFT_OAUTH_CLIENT_ID', 'MICROSOFT_OAUTH_CLIENT_SECRET'] as const;
    const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    const priorMode = process.env.ENABLE_INTEGRATION_TEST_ADAPTERS;
    keys.forEach((key) => delete process.env[key]);
    delete process.env.ENABLE_INTEGRATION_TEST_ADAPTERS;
    const providers = IntegrationProviderRegistry.getAllProviderMetadata();
    expect(providers.map((item) => item.provider)).toEqual(['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS']);
    expect(providers.every((item) => item.configurationStatus === 'SETUP_REQUIRED' && item.deploymentConfigured === false)).toBe(true);
    // Variable names are intentionally safe to expose; configured values are not.
    expect(JSON.stringify(providers)).not.toContain('super-secret-client-value');
    keys.forEach((key) => prior[key] === undefined ? delete process.env[key] : process.env[key] = prior[key]);
    if (priorMode === undefined) delete process.env.ENABLE_INTEGRATION_TEST_ADAPTERS; else process.env.ENABLE_INTEGRATION_TEST_ADAPTERS = priorMode;
  });
  it('reports common deployment prerequisites by name and never by value', () => {
    const keys = ['API_PUBLIC_URL', 'WEB_APP_URL', 'OAUTH_STATE_SECRET', 'STORAGE_ENCRYPTION_KEY', 'ZOOM_OAUTH_CLIENT_ID', 'ZOOM_OAUTH_CLIENT_SECRET', 'ZOOM_WEBHOOK_SECRET'] as const;
    const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    keys.forEach((key) => delete process.env[key]);
    const config = ProviderOAuthConfigService.resolve('ZOOM');
    expect(config.configured).toBe(false);
    expect(config.missingConfiguration).toEqual(expect.arrayContaining([...keys]));
    expect(JSON.stringify(config)).not.toContain('undefined-secret-value');
    keys.forEach((key) => prior[key] === undefined ? delete process.env[key] : process.env[key] = prior[key]);
  });
  it('creates a Google Meet v2 space without fabricating schedule or calendar IDs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ name: 'spaces/abc', meetingUri: 'https://meet.google.com/abc-defg-hij', meetingCode: 'abc-defg-hij' }));
    const result = await new GoogleMeetAdapter().createMeeting(connection('GOOGLE_MEET'), { tenantId: 't', classId: 'c', topic: 'Class', startTime: new Date('2026-10-12T10:00:00Z'), endTime: new Date('2026-10-12T11:00:00Z'), timezone: 'UTC', organizerUserId: 'u' });
    expect(fetchMock).toHaveBeenCalledWith('https://meet.googleapis.com/v2/spaces', expect.objectContaining({ method: 'POST' }));
    expect(result.externalMeetingId).toBe('spaces/abc'); expect(result.externalCalendarEventId).toBeUndefined(); expect(result.joinUrl).toBe('https://meet.google.com/abc-defg-hij');
  });

  it('uses Meet conference records and paginated participant sessions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(response({ conferenceRecords: [{ name: 'conferenceRecords/cr1', startTime: '2026-10-12T10:00:00Z', space: 'spaces/abc' }] }));
    fetchMock.mockResolvedValueOnce(response({ participants: [{ name: 'conferenceRecords/cr1/participants/p1', signedinUser: { user: 'users/1', displayName: 'Student', email: 's@example.test' } }] }));
    fetchMock.mockResolvedValueOnce(response({ participantSessions: [{ startTime: '2026-10-12T10:00:00Z', endTime: '2026-10-12T10:30:00Z' }] }));
    const rows = await new GoogleMeetAdapter().getParticipants(connection('GOOGLE_MEET'), 'spaces/abc');
    expect(rows).toHaveLength(1); expect(rows[0].durationMinutes).toBe(30);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/conferenceRecords?');
  });

  it('ends only an active Meet conference and reports no provider cancellation otherwise', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ name: 'spaces/abc' }));
    expect(await new GoogleMeetAdapter().cancelMeeting(connection('GOOGLE_MEET'), 'spaces/abc')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates, updates, and deletes a standalone Teams onlineMeeting', async () => {
    const graph = { id: 'meeting-id', joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/x', subject: 'Class', startDateTime: '2026-10-12T10:00:00Z', endDateTime: '2026-10-12T11:00:00Z' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response(graph)).mockResolvedValueOnce(response({ ...graph, subject: 'Updated' })).mockResolvedValueOnce(response({}, 204));
    const adapter = new MicrosoftTeamsAdapter(); const c = connection('MICROSOFT_TEAMS');
    await adapter.createMeeting(c, { tenantId: 't', classId: 'c', topic: 'Class', startTime: new Date(graph.startDateTime), endTime: new Date(graph.endDateTime), timezone: 'UTC', organizerUserId: 'u' });
    await adapter.updateMeeting(c, graph.id, { topic: 'Updated' }); await adapter.cancelMeeting(c, graph.id);
    expect(fetchMock.mock.calls.map(call => (call[1] as RequestInit).method)).toEqual(['POST', 'PATCH', 'DELETE']);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://graph.microsoft.com/v1.0/me/onlineMeetings');
  });

  it('classifies Graph throttling with Retry-After', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({}, 429, { 'retry-after': '7' }));
    await expect(new MicrosoftTeamsAdapter().createMeeting(connection('MICROSOFT_TEAMS'), { tenantId: 't', classId: 'c', topic: 'Class', startTime: new Date(), endTime: new Date(Date.now() + 60000), timezone: 'UTC', organizerUserId: 'u' })).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfter: '7' });
  });
});
