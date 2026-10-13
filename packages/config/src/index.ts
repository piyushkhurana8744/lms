/**
 * Safe Shared System Defaults & Constants (@edtech/config)
 * Contains ONLY public constants, brand design tokens, and queue name identifiers.
 */

export const APP_CONFIG = {
  PLATFORM_NAME: 'DIDM',
  COMPANY_NAME: 'DIDM',
  DEFAULT_PORT: 4000,
  DEFAULT_WEB_PORT: 3000,
  DEFAULT_CORS_ORIGINS: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  BRAND: {
    PRIMARY_COLOR: '#BE1E2E',
    SECONDARY_COLOR: '#FFFFFF',
    ACCENT_COLOR: '#BE1E2E',
    BACKGROUND_COLOR: '#F8FAFC',
    TEXT_COLOR: '#0F172A',
    BORDER_COLOR: '#E2E8F0'
  },
  QUEUES: {
    EMAIL: 'queue-email',
    NOTIFICATIONS: 'queue-notifications',
    CERTIFICATES: 'queue-certificates',
    REPORTS: 'queue-reports',
    VIDEO: 'queue-video-processing',
    ANALYTICS: 'queue-analytics',
    WEBHOOKS: 'queue-webhooks',
    FINANCE_RECONCILIATION: 'queue-finance-reconciliation',
    INTEGRATIONS: 'queue-integrations'
  },
  TIMEOUTS: {
    REDIS_CONNECT_MS: 10000,
    MONGO_CONNECT_MS: 10000,
    SHUTDOWN_GRACE_MS: 5000
  }
} as const;
