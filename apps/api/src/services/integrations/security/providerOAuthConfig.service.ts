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

function parseBaseUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed;
  } catch { return null; }
}

function isLoopback(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase());
}

function validateBaseUrl(name: 'API_PUBLIC_URL' | 'WEB_APP_URL', raw: string, invalid: string[]): URL | null {
  const parsed = parseBaseUrl(raw);
  if (!parsed) {
    if (raw) invalid.push(name);
    return null;
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/')) {
    invalid.push(`${name}_MUST_BE_ORIGIN`);
  }
  const publicHttp = parsed.protocol !== 'https:' && !isLoopback(parsed.hostname);
  if ((process.env.NODE_ENV === 'production' || publicHttp) && parsed.protocol !== 'https:') {
    invalid.push(`${name}_REQUIRES_HTTPS`);
  }
  return parsed;
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

    const parsedApiUrl = validateBaseUrl('API_PUBLIC_URL', apiUrl, invalidConfiguration);
    validateBaseUrl('WEB_APP_URL', webUrl, invalidConfiguration);
    if (value('OAUTH_STATE_SECRET') && value('OAUTH_STATE_SECRET').length < 32) invalidConfiguration.push('OAUTH_STATE_SECRET_TOO_SHORT');
    if (value('STORAGE_ENCRYPTION_KEY') && value('STORAGE_ENCRYPTION_KEY').length < 32) invalidConfiguration.push('STORAGE_ENCRYPTION_KEY_TOO_SHORT');

    // URL.origin canonicalizes trailing slashes without trusting request/proxy headers.
    // OAuth providers must see the same deployment-configured URI during both steps.
    const base = parsedApiUrl ? parsedApiUrl.origin : '';
    const slug = provider.toLowerCase();

    const customZoomCallbackUrl = provider === 'ZOOM' ? value('ZOOM_CALLBACK_URL') : '';
    let resolvedCallbackUrl = base ? `${base}/api/v1/integrations/connections/${slug}/callback` : '';
    if (provider === 'ZOOM') {
      if (customZoomCallbackUrl) {
        const parsedCallback = parseBaseUrl(customZoomCallbackUrl);
        if (!parsedCallback) {
          invalidConfiguration.push('ZOOM_CALLBACK_URL');
        } else if (parsedCallback.protocol !== 'https:') {
          invalidConfiguration.push('ZOOM_CALLBACK_URL_REQUIRES_HTTPS');
        } else {
          resolvedCallbackUrl = customZoomCallbackUrl;
        }
      }

      const isCallbackHttps = resolvedCallbackUrl.startsWith('https://');
      if (!isCallbackHttps) {
        invalidConfiguration.push('API_PUBLIC_URL_REQUIRES_HTTPS_FOR_ZOOM');
      }
    }

    const customZoomWebhookUrl = provider === 'ZOOM' ? value('ZOOM_WEBHOOK_URL') : '';
    let resolvedZoomWebhookUrl: string | undefined = undefined;
    if (provider === 'ZOOM') {
      if (customZoomWebhookUrl) {
        const parsedWebhook = parseBaseUrl(customZoomWebhookUrl);
        if (!parsedWebhook) {
          invalidConfiguration.push('ZOOM_WEBHOOK_URL');
        } else if (parsedWebhook.protocol !== 'https:') {
          invalidConfiguration.push('ZOOM_WEBHOOK_URL_REQUIRES_HTTPS');
        } else {
          resolvedZoomWebhookUrl = customZoomWebhookUrl;
        }
      } else if (base) {
        resolvedZoomWebhookUrl = `${base}/api/v1/integrations/webhooks/zoom`;
      }
    }

    return {
      provider,
      clientId: value(clientIdName),
      clientSecret: value(clientSecretName),
      scopes: PROVIDER_SCOPES[provider],
      callbackUrl: resolvedCallbackUrl,
      webhookUrl: resolvedZoomWebhookUrl,
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
