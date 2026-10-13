import { IHealthStatus, ILivenessStatus, IReadinessStatus } from '@edtech/types';
import { getDatabaseState, isDatabaseTransactionCapable } from '@edtech/database';
import { getRedisState } from '../config/redis';
import { ENV } from '../config/env';

export class HealthService {
  public static getLiveness(): ILivenessStatus {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }

  public static getReadiness(): { isReady: boolean; data: IReadinessStatus } {
    const mongoState = getDatabaseState();
    const redisState = getRedisState();

    const transactions = isDatabaseTransactionCapable();
    const isReady = mongoState === 'connected' && redisState === 'connected' && transactions;

    return {
      isReady,
      data: {
        status: isReady ? 'ready' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          api: 'healthy',
          database: mongoState,
          redis: redisState,
          transactions: transactions ? 'available' : 'unavailable'
        }
      }
    };
  }

  public static getSystemHealth(): IHealthStatus {
    const mongoState = getDatabaseState();
    const redisState = getRedisState();
    const transactions = isDatabaseTransactionCapable();

    const isSystemHealthy = mongoState === 'connected' && redisState === 'connected';

    return {
      status: isSystemHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        api: 'healthy',
        database: mongoState,
        redis: redisState,
        transactions: transactions ? 'available' : 'unavailable'
      },
      environment: ENV.NODE_ENV
    };
  }
}
