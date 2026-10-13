import { CorsOptions } from 'cors';
import { ENV } from './env';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or tools without origin header in development
    if (!origin) {
      return callback(null, true);
    }
    if (ENV.CORS_ORIGINS.includes(origin) || ENV.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error(`CORS Policy Violation: Origin '${origin}' is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
  maxAge: 86400 // 24 hours preflight cache
};
