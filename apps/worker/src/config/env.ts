import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/edtech_lms?directConnection=true')
  ,API_INTERNAL_URL: z.string().url().default('http://127.0.0.1:4000')
  ,INTERNAL_WORKER_SECRET: z.string().min(16).default('development-worker-secret')
  ,PAYMENT_RECONCILIATION_STALE_MINUTES: z.coerce.number().int().positive().default(15)
  ,REFUND_RECONCILIATION_STALE_MINUTES: z.coerce.number().int().positive().default(15)
  ,FINANCE_RECONCILIATION_BATCH_SIZE: z.coerce.number().int().positive().max(100).default(25)
  ,FINANCE_RECONCILIATION_INTERVAL_MS: z.coerce.number().int().positive().default(30000)
  ,FINANCE_RECONCILIATION_CONCURRENCY: z.coerce.number().int().positive().max(20).default(3)
});

const parsed = envSchema.parse(process.env);
if (parsed.NODE_ENV === 'production' && parsed.INTERNAL_WORKER_SECRET === 'development-worker-secret') {
  throw new Error('INTERNAL_WORKER_SECRET must be explicitly configured in production');
}

export const ENV = {
  NODE_ENV: parsed.NODE_ENV,
  REDIS_URL: parsed.REDIS_URL,
  MONGO_URI: parsed.MONGO_URI,
  API_INTERNAL_URL: parsed.API_INTERNAL_URL,
  INTERNAL_WORKER_SECRET: parsed.INTERNAL_WORKER_SECRET,
  PAYMENT_RECONCILIATION_STALE_MINUTES: parsed.PAYMENT_RECONCILIATION_STALE_MINUTES,
  REFUND_RECONCILIATION_STALE_MINUTES: parsed.REFUND_RECONCILIATION_STALE_MINUTES,
  FINANCE_RECONCILIATION_BATCH_SIZE: parsed.FINANCE_RECONCILIATION_BATCH_SIZE,
  FINANCE_RECONCILIATION_INTERVAL_MS: parsed.FINANCE_RECONCILIATION_INTERVAL_MS,
  FINANCE_RECONCILIATION_CONCURRENCY: parsed.FINANCE_RECONCILIATION_CONCURRENCY
};
