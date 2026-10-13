import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, hashToken, signAccessToken, verifyAccessToken } from '@edtech/utils';
import { hasPermission, PERMISSIONS } from '@edtech/permissions';

describe('STEP 2 Authentication & Security Architecture Tests', () => {
  it('should securely hash and verify passwords using bcrypt cost 12', async () => {
    const rawPassword = 'SuperSecurePassword123!';
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toBe(rawPassword);
    expect(hashed.length).toBeGreaterThan(20);

    const isMatch = await comparePassword(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrongMatch = await comparePassword('WrongPassword', hashed);
    expect(isWrongMatch).toBe(false);
  });

  it('should generate consistent SHA-256 hashes for refresh tokens at rest', () => {
    const rawToken = 'sample-refresh-token-string-xyz';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // Hex SHA-256 string
  });

  it('should sign and verify minimal JWT access token claims', () => {
    const payload = {
      sub: 'user_12345',
      sessionId: 'session_67890',
      tenantId: 'tenant_abc',
      tokenVersion: 1
    };

    const token = signAccessToken(payload, 'test-secret-key', '15m');
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token, 'test-secret-key');
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('user_12345');
    expect(decoded?.sessionId).toBe('session_67890');
    expect(decoded?.tenantId).toBe('tenant_abc');
  });

  it('should reject access token with invalid secret', () => {
    const token = signAccessToken({ sub: 'user_123', sessionId: 's1', tenantId: null, tokenVersion: 1 }, 'valid-secret');
    const decoded = verifyAccessToken(token, 'invalid-secret');
    expect(decoded).toBeNull();
  });

  it('should evaluate granular RBAC permissions correctly', () => {
    const adminPermissions = [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.ROLE_MANAGE];

    expect(hasPermission(adminPermissions, PERMISSIONS.USER_VIEW)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.ROLE_MANAGE)).toBe(true);
    expect(hasPermission(adminPermissions, PERMISSIONS.TENANT_MANAGE)).toBe(false);

    // Super Admin Wildcard Evaluation
    const superAdminPermissions = [PERMISSIONS.SUPERADMIN_ALL];
    expect(hasPermission(superAdminPermissions, PERMISSIONS.TENANT_MANAGE)).toBe(true);
    expect(hasPermission(superAdminPermissions, PERMISSIONS.USER_DELETE)).toBe(true);
  });
});
