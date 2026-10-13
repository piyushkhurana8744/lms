import Redis from 'ioredis';
import { ENV } from './env';

/**
 * Redis Client Instance & Connection Lifecycle Manager
 */
let redisClient: Redis | null = null;
type RedisState = 'connected' | 'disconnected' | 'disabled';
let redisStatus: RedisState = 'disconnected';
let redisStatusOverride: RedisState | undefined;

export function setRedisStateOverride(value?: RedisState): void {
  if (process.env.NODE_ENV !== 'test' && value !== undefined) throw new Error('Redis state override is test-only');
  redisStatusOverride = value;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('[Redis] Max reconnect attempts reached. Redis operating in fallback/offline mode.');
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });

    redisClient.on('connect', () => {
      redisStatus = 'connected';
      console.log('[Redis] Connected to Redis cluster/instance.');
    });

    redisClient.on('error', (err) => {
      redisStatus = 'disconnected';
      console.error('[Redis] Connection error:', err.message);
    });

    redisClient.on('close', () => {
      redisStatus = 'disconnected';
      console.warn('[Redis] Connection closed.');
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<Redis | null> {
  try {
    const client = getRedisClient();
    await client.connect();
    redisStatus = 'connected';
    return client;
  } catch (error) {
    redisStatus = 'disconnected';
    console.warn('[Redis] Initial connection failed. Service degraded, proceeding without active cache.');
    return null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisStatus === 'connected') {
    await redisClient.quit();
    redisStatus = 'disconnected';
    console.log('[Redis] Connection closed gracefully.');
  }
}

export function getRedisState(): 'connected' | 'disconnected' | 'disabled' {
  return redisStatusOverride ?? redisStatus;
}
