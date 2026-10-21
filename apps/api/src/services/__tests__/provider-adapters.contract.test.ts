import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { GoogleMeetAdapter } from '../integrations/adapters/googleMeet.adapter';
import { MicrosoftTeamsAdapter } from '../integrations/adapters/microsoftTeams.adapter';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';
import { ProviderOAuthConfigService } from '../integrations/security/providerOAuthConfig.service';
import { OAuthStateService } from '../integrations/security/oauthState.service';
import { IntegrationConnectionService } from '../integrations/orchestration/integrationConnection.service';
import { ZoomAdapter } from '../integrations/adapters/zoom.adapter';
import { IntegrationWebhookService } from '../integrations/orchestration/integrationWebhook.service';
import crypto from 'crypto';

const connection = (provider: any) => ({
  _id: new Types.ObjectId(), provider, status: 'CONNECTED', scopes: [],
  expiresAt: new Date(Date.now() + 3600000),
  encryptedCredentials: SecretEncryptionService.encryptSecret(JSON.stringify({ accessToken: 'contract-access-token', refreshToken: 'refresh', clientId: 'client', clientSecret: 'secret' }))
} as any);
const response = (body: any, status = 200, headers: Record<string, string> = {}) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const configuredZoomEnvironment = {
  NODE_ENV: 'development', API_PUBLIC_URL: 'https://didm-stable.ngrok-free.app/', WEB_APP_URL: 'http://localhost:3000',
  OAUTH_STATE_SECRET: 'o'.repeat(32), STORAGE_ENCRYPTION_KEY: 'e'.repeat(32),
  ZOOM_OAUTH_CLIENT_ID: 'zoom-client', ZOOM_OAUTH_CLIENT_SECRET: 'zoom-secret', ZOOM_WEBHOOK_SECRET: 'webhook-secret',
  ZOOM_WEBHOOK_URL: '', ZOOM_CALLBACK_URL: ''
};

async function withEnvironment(values: Record<string, string>, run: () => unknown | Promise<unknown>) {
  const prior = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  try { return await run(); }
  finally {
    for (const [key, oldValue] of Object.entries(prior)) oldValue === undefined ? delete process.env[key] : process.env[key] = oldValue;
  }
}

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
  it('builds the exact Zoom callback from an HTTPS tunnel origin and keeps the local frontend separate', async () => {
    await withEnvironment(configuredZoomEnvironment, () => {
      const config = ProviderOAuthConfigService.resolve('ZOOM');
      expect(config.configured).toBe(true);
      expect(config.callbackUrl).toBe('https://didm-stable.ngrok-free.app/api/v1/integrations/connections/zoom/callback');
      expect(config.webhookUrl).toBe('https://didm-stable.ngrok-free.app/api/v1/integrations/webhooks/zoom');
      expect(config.callbackUrl).not.toContain('localhost:3000');

      process.env.ZOOM_WEBHOOK_URL = 'https://custom-webhook.example.com/zoom';
      process.env.ZOOM_CALLBACK_URL = 'https://custom-callback.example.com/zoom/callback';
      const customConfig = ProviderOAuthConfigService.resolve('ZOOM');
      expect(customConfig.webhookUrl).toBe('https://custom-webhook.example.com/zoom');
      expect(customConfig.callbackUrl).toBe('https://custom-callback.example.com/zoom/callback');
    });
  });
  it('accepts HTTPS staging and production origins and rejects malformed or insecure public origins', async () => {
    await withEnvironment(configuredZoomEnvironment, () => {
      process.env.API_PUBLIC_URL = 'https://api.staging.example.edu';
      expect(ProviderOAuthConfigService.resolve('ZOOM').configured).toBe(true);
      process.env.NODE_ENV = 'production';
      process.env.API_PUBLIC_URL = 'https://api.example.edu';
      process.env.WEB_APP_URL = 'https://lms.example.edu';
      expect(ProviderOAuthConfigService.resolve('ZOOM').configured).toBe(true);
      process.env.API_PUBLIC_URL = 'http://api.example.edu';
      expect(ProviderOAuthConfigService.resolve('ZOOM').invalidConfiguration).toContain('API_PUBLIC_URL_REQUIRES_HTTPS');
      process.env.API_PUBLIC_URL = 'https://api.example.edu/unexpected-path?x=1';
      expect(ProviderOAuthConfigService.resolve('ZOOM').invalidConfiguration).toContain('API_PUBLIC_URL_MUST_BE_ORIGIN');
      process.env.API_PUBLIC_URL = 'not-a-url';
      expect(ProviderOAuthConfigService.resolve('ZOOM').invalidConfiguration).toContain('API_PUBLIC_URL');
      process.env.NODE_ENV = 'development';
      process.env.API_PUBLIC_URL = 'http://localhost:4000';
      expect(ProviderOAuthConfigService.resolve('ZOOM').invalidConfiguration).toContain('API_PUBLIC_URL_REQUIRES_HTTPS_FOR_ZOOM');
    });
  });
  it('uses one identical Zoom redirect URI for authorization and token exchange while sending PKCE', async () => {
    await withEnvironment(configuredZoomEnvironment, async () => {
      vi.spyOn(OAuthStateService, 'generateState').mockResolvedValue({ state: 'signed-state', codeChallenge: 'pkce-challenge' });
      const initiated = await IntegrationConnectionService.initiateOAuth(
        new Types.ObjectId().toString(), 'ZOOM', { userId: new Types.ObjectId().toString() }, { scopeType: 'TENANT' }
      );
      const authorization = new URL(initiated.authUrl);
      const expectedRedirect = 'https://didm-stable.ngrok-free.app/api/v1/integrations/connections/zoom/callback';
      expect(authorization.searchParams.get('redirect_uri')).toBe(expectedRedirect);
      expect(authorization.searchParams.get('code_challenge')).toBe('pkce-challenge');
      expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');

      const tenantId = new Types.ObjectId(); const userId = new Types.ObjectId();
      vi.spyOn(OAuthStateService, 'consumeState').mockResolvedValue({
        tenantId: tenantId.toString(), userId: userId.toString(), provider: 'ZOOM', scopeType: 'TENANT',
        nonce: 'nonce', expiresAt: Date.now() + 60_000, codeVerifier: 'pkce-verifier'
      });
      const document: any = {
        _id: new Types.ObjectId(), tenantId, provider: 'ZOOM', status: 'CONNECTED', scopeType: 'TENANT',
        branchId: null, userId: null, scopes: [], connectedBy: userId, connectedAt: new Date(),
        metadata: {}, createdAt: new Date(), updatedAt: new Date(), save: vi.fn().mockResolvedValue(undefined)
      };
      vi.spyOn(IntegrationConnectionService, 'connectOrUpdate').mockResolvedValue(document);
      const fetchMock = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(response({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, scope: 'meeting:read' }))
        .mockResolvedValueOnce(response({ id: 'zoom-user', account_id: 'zoom-account', email: 'host@example.test' }));
      await IntegrationConnectionService.handleOAuthCallback({ code: 'authorization-code', state: 'signed-state' }, 'ZOOM');
      const tokenBody = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
      expect(tokenBody.get('redirect_uri')).toBe(expectedRedirect);
      expect(tokenBody.get('code_verifier')).toBe('pkce-verifier');
    });
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

  it('preserves safe Zoom 400 diagnostics without leaking credentials or retrying', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 300, message: 'Invalid timezone: Mars/Olympus' }, 400));
    const error = await new ZoomAdapter().createMeeting(connection('ZOOM'), {
      tenantId: 't', classId: 'c', topic: 'Class', startTime: new Date('2026-10-12T10:00:00Z'),
      endTime: new Date('2026-10-12T11:00:00Z'), timezone: 'Mars/Olympus', organizerUserId: 'u'
    }).catch((value) => value);
    expect(error).toMatchObject({ statusCode: 400, code: 'INVALID_REQUEST', category: 'INVALID_REQUEST', zoomCode: '300' });
    expect(error.message).toContain('Invalid timezone');
    expect(error.details).toMatchObject({ provider: 'ZOOM', operation: 'meeting creation', upstreamStatus: 400, zoomCode: '300', retryable: false });
    expect(error.details.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('requests Zoom cloud auto-recording only when explicitly enabled', async () => {
    const zoomResponse = { id: 123, uuid: 'uuid', join_url: 'https://zoom.us/j/123', start_url: 'https://zoom.us/s/123', start_time: '2026-10-12T10:00:00Z', duration: 60, timezone: 'UTC', settings: {} };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(zoomResponse));
    await new ZoomAdapter().createMeeting(connection('ZOOM'), {
      tenantId: 't', classId: 'c', topic: 'Recorded class', startTime: new Date('2026-10-12T10:00:00Z'),
      endTime: new Date('2026-10-12T11:00:00Z'), timezone: 'UTC', organizerUserId: 'u', autoRecord: true
    });
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.settings.auto_recording).toBe('cloud');
    expect(payload.settings.waiting_room).toBe(true);
  });

  it('does not report Zoom recording READY without scope and verified host policy', async () => {
    const adapter = new ZoomAdapter();
    const missing = await adapter.getRecordingCapability(connection('ZOOM'));
    expect(missing.state).toBe('MISSING_SCOPES');
    const scoped = connection('ZOOM'); scoped.scopes = ['recording:read'];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ recording: { cloud_recording: false } }));
    await expect(adapter.getRecordingCapability(scoped)).resolves.toMatchObject({ state: 'DISABLED_BY_POLICY' });
  });

  it('redacts URLs and credential-shaped values from Zoom error messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ code: 300, message: 'Bad https://zoom.us/j/secret access_token=do-not-leak' }, 400));
    const error = await new ZoomAdapter().createMeeting(connection('ZOOM'), {
      tenantId: 't', classId: 'c', topic: 'Class', startTime: new Date('2026-10-12T10:00:00Z'),
      endTime: new Date('2026-10-12T11:00:00Z'), timezone: 'UTC', organizerUserId: 'u'
    }).catch((value) => value);
    expect(error.message).not.toContain('zoom.us/j/secret');
    expect(error.message).not.toContain('do-not-leak');
  });

  it('authenticates Zoom URL-validation requests before returning the challenge', async () => {
    await withEnvironment({ ZOOM_WEBHOOK_SECRET: 'webhook-secret' }, async () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const payload = { event: 'endpoint.url_validation', payload: { plainToken: 'plain-token' } };
      const rawBody = JSON.stringify(payload);
      await expect(IntegrationWebhookService.handleWebhook({
        provider: 'ZOOM', payload, rawBody,
        headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': 'v0=invalid' }
      })).rejects.toThrow('Invalid Zoom webhook signature');
      const signature = `v0=${crypto.createHmac('sha256', 'webhook-secret').update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
      const result = await IntegrationWebhookService.handleWebhook({
        provider: 'ZOOM', payload, rawBody,
        headers: { 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signature }
      });
      expect(result.challenge).toEqual({
        plainToken: 'plain-token',
        encryptedToken: crypto.createHmac('sha256', 'webhook-secret').update('plain-token').digest('hex')
      });
    });
  });
});
