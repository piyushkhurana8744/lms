import { IntegrationProvider } from '@edtech/types';
import { BadRequestError } from '../../../errors/appError';

export interface ProviderOAuthConfig {
  provider: IntegrationProvider;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  callbackUrl: string;
  webhookUrl?: string;
  requiredEnvironment: string[];
  missingConfiguration: string[];
  invalidConfiguration: string[];
  configured: boolean;
}

const PROVIDER_VARIABLES: Record<IntegrationProvider, [string, string]> = {
  GOOGLE_CLASSROOM: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
  GOOGLE_MEET: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
  ZOOM: ['ZOOM_OAUTH_CLIENT_ID', 'ZOOM_OAUTH_CLIENT_SECRET'],
  MICROSOFT_TEAMS: ['MICROSOFT_OAUTH_CLIENT_ID', 'MICROSOFT_OAUTH_CLIENT_SECRET']
};

export const PROVIDER_SCOPES: Record<IntegrationProvider, string[]> = {
  GOOGLE_CLASSROOM: [
    'openid', 'email', 'profile',
    'https://www.googleapis.com/auth/classroom.courses',
    'https://www.googleapis.com/auth/classroom.rosters',
    'https://www.googleapis.com/auth/classroom.coursework.students',
    'https://www.googleapis.com/auth/classroom.profile.emails'
  ],
  GOOGLE_MEET: [
    'openid', 'email', 'profile',
    'https://www.googleapis.com/auth/meetings.space.created',
    'https://www.googleapis.com/auth/meetings.space.readonly',
    'https://www.googleapis.com/auth/meetings.space.settings'
  ],
  // Zoom OAuth scopes are selected in the Zoom app build flow. These classic
  // names document the capabilities exercised by the current adapter.
  ZOOM: ['user:read', 'meeting:read', 'meeting:write', 'report:read:admin', 'recording:read'],
  MICROSOFT_TEAMS: [
    'openid', 'profile', 'email', 'offline_access', 'User.Read',
    'OnlineMeetings.ReadWrite', 'OnlineMeetingArtifact.Read.All'
  ]
};

const commonVariables = ['API_PUBLIC_URL', 'WEB_APP_URL', 'OAUTH_STATE_SECRET', 'STORAGE_ENCRYPTION_KEY'];
const value = (name: string) => String(process.env[name] || '').trim();

function validAbsoluteUrl(raw: string): boolean {
  try { const parsed = new URL(raw); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; }
  catch { return false; }
}

export class ProviderOAuthConfigService {
  static resolve(provider: IntegrationProvider): ProviderOAuthConfig {
    const [clientIdName, clientSecretName] = PROVIDER_VARIABLES[provider];
    const providerVariables = provider === 'ZOOM'
      ? [clientIdName, clientSecretName, 'ZOOM_WEBHOOK_SECRET']
      : [clientIdName, clientSecretName];
    const requiredEnvironment = [...commonVariables, ...providerVariables];
    const missingConfiguration = requiredEnvironment.filter((name) => !value(name));
    const invalidConfiguration: string[] = [];
    const apiUrl = value('API_PUBLIC_URL');
    const webUrl = value('WEB_APP_URL');

    if (apiUrl && !validAbsoluteUrl(apiUrl)) invalidConfiguration.push('API_PUBLIC_URL');
    if (webUrl && !validAbsoluteUrl(webUrl)) invalidConfiguration.push('WEB_APP_URL');
    if (process.env.NODE_ENV === 'production') {
      if (apiUrl && !apiUrl.startsWith('https://')) invalidConfiguration.push('API_PUBLIC_URL_REQUIRES_HTTPS');
      if (webUrl && !webUrl.startsWith('https://')) invalidConfiguration.push('WEB_APP_URL_REQUIRES_HTTPS');
    }
    if (value('OAUTH_STATE_SECRET') && value('OAUTH_STATE_SECRET').length < 32) invalidConfiguration.push('OAUTH_STATE_SECRET_TOO_SHORT');
    if (value('STORAGE_ENCRYPTION_KEY') && value('STORAGE_ENCRYPTION_KEY').length < 32) invalidConfiguration.push('STORAGE_ENCRYPTION_KEY_TOO_SHORT');

    const base = validAbsoluteUrl(apiUrl) ? apiUrl.replace(/\/$/, '') : '';
    const slug = provider.toLowerCase();
    return {
      provider,
      clientId: value(clientIdName),
      clientSecret: value(clientSecretName),
      scopes: PROVIDER_SCOPES[provider],
      callbackUrl: base ? `${base}/api/v1/integrations/connections/${slug}/callback` : '',
      webhookUrl: provider === 'ZOOM' && base ? `${base}/api/v1/integrations/webhooks/zoom` : undefined,
      requiredEnvironment,
      missingConfiguration,
      invalidConfiguration,
      configured: missingConfiguration.length === 0 && invalidConfiguration.length === 0
    };
  }

  static require(provider: IntegrationProvider): ProviderOAuthConfig {
    const config = this.resolve(provider);
    if (!config.configured) {
      const category = config.missingConfiguration.length ? 'deployment variables are missing' : 'deployment configuration is invalid';
      throw new BadRequestError(`${provider} OAuth cannot start because ${category}`);
    }
    return config;
  }
}
