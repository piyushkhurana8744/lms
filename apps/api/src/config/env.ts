import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/edtech_lms?directConnection=true'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000')
});

const parsed = envSchema.parse(process.env);

export const ENV = {
  PORT: parsed.PORT,
  NODE_ENV: parsed.NODE_ENV,
  MONGO_URI: parsed.MONGO_URI,
  REDIS_URL: parsed.REDIS_URL,
  CORS_ORIGINS: parsed.CORS_ORIGINS.split(',').map((o) => o.trim())
};
