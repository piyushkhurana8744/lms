import { CorsOptions } from 'cors';
import { ENV } from './env';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or tools without origin header in development
    if (!origin) {
      return callback(null, true);
    }
    const domain = (process.env.DOMAIN || '').trim().toLowerCase();
    const isDomainMatch = Boolean(
      domain &&
        (origin === `https://${domain}` ||
          origin === `http://${domain}` ||
          origin.endsWith(`.${domain}`))
    );

    if (
      ENV.NODE_ENV === 'development' ||
      ENV.CORS_ORIGINS.includes(origin) ||
      isDomainMatch ||
      (process.env.WEB_APP_URL && origin === process.env.WEB_APP_URL.replace(/\/$/, ''))
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
  maxAge: 86400 // 24 hours preflight cache
};
