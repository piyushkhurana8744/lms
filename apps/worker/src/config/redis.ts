import Redis from 'ioredis';
import { ENV } from './env';

export function createRedisConnection(): Redis {
  return new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: null, // Mandatory requirement for BullMQ workers
    enableReadyCheck: false,
    lazyConnect: false
  });
}
