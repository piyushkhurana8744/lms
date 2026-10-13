import { describe, it, expect } from 'vitest';
import { HealthService } from '../health.service';

describe('HealthService Probe Architecture', () => {
  it('should return a valid liveness probe status object', () => {
    const liveness = HealthService.getLiveness();

    expect(liveness).toHaveProperty('status', 'alive');
    expect(liveness).toHaveProperty('timestamp');
    expect(liveness).toHaveProperty('uptimeSeconds');
    expect(typeof liveness.uptimeSeconds).toBe('number');
  });

  it('should return a valid readiness probe status object', () => {
    const { isReady, data } = HealthService.getReadiness();

    expect(typeof isReady).toBe('boolean');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('api', 'healthy');
    expect(data.services).toHaveProperty('database');
    expect(data.services).toHaveProperty('redis');
  });

  it('should return a valid system health overview object', () => {
    const health = HealthService.getSystemHealth();

    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('timestamp');
    expect(health).toHaveProperty('uptimeSeconds');
    expect(health).toHaveProperty('environment');
  });
});
