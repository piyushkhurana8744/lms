import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';
import { UserModel, SessionModel, TenantModel } from '@edtech/database';
import { AuditService } from '../audit.service';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../errors/appError';
import mongoose from 'mongoose';

vi.mock('@edtech/database', () => {
  const mockUserFindById = vi.fn();
  const mockSessionFindById = vi.fn();
  const mockSessionCreate = vi.fn();

  return {
    UserModel: {
      findById: mockUserFindById
    },
    SessionModel: {
      findById: mockSessionFindById,
      create: mockSessionCreate
    },
    TenantModel: {
      findById: vi.fn()
    },
    getDatabaseState: vi.fn().mockReturnValue('CONNECTED')
  };
});

vi.mock('../audit.service', () => ({
  AuditService: {
    logEvent: vi.fn().mockResolvedValue({})
  }
}));

describe('SuperAdmin Impersonation ("Secret Login") Engine Test Suite', () => {
  const superAdminId = new mongoose.Types.ObjectId().toString();
  const targetUserId = new mongoose.Types.ObjectId().toString();
  const targetTenantId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should reject impersonation if reason is missing or empty string', async () => {
    await expect(
      AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: superAdminId,
        reason: ''
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('2. should reject self-impersonation', async () => {
    await expect(
      AuthService.impersonateUser({
        targetUserId: superAdminId,
        superAdminUserId: superAdminId,
        reason: 'Self test'
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('3. should reject nested impersonation when caller session is already impersonating', async () => {
    const originalSessionId = new mongoose.Types.ObjectId().toString();
    (SessionModel.findById as any).mockResolvedValueOnce({
      _id: originalSessionId,
      impersonatedBy: new mongoose.Types.ObjectId()
    });

    await expect(
      AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: superAdminId,
        reason: 'Nested test',
        originalSessionId
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('4. should reject impersonation if actor is not a platform superadmin', async () => {
    (UserModel.findById as any).mockReturnValueOnce({
      _id: superAdminId,
      isSuperAdmin: false,
      status: 'ACTIVE'
    });

    await expect(
      AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: superAdminId,
        reason: 'Testing unauthorized attempt'
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('5. should reject impersonation if target user is not found', async () => {
    (UserModel.findById as any)
      .mockReturnValueOnce({
        _id: superAdminId,
        isSuperAdmin: true,
        status: 'ACTIVE'
      })
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(null)
      });

    await expect(
      AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: superAdminId,
        reason: 'Target user not found test'
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('6. should reject impersonating another platform superadmin', async () => {
    const mockSuperAdmin = {
      _id: superAdminId,
      isSuperAdmin: true,
      status: 'ACTIVE'
    };
    const mockTargetSuperAdmin = {
      _id: targetUserId,
      isSuperAdmin: true,
      status: 'ACTIVE',
      roles: []
    };

    (UserModel.findById as any)
      .mockReturnValueOnce(mockSuperAdmin)
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(mockTargetSuperAdmin)
      });

    await expect(
      AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: superAdminId,
        reason: 'Attempting to impersonate peer superadmin'
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('7. should reject impersonating an inactive or suspended user account', async () => {
    const mockSuperAdmin = {
      _id: superAdminId,
      isSuperAdmin: true,
      status: 'ACTIVE'
    };
    const mockTargetInactiveUser = {
      _id: targetUserId,
      isSuperAdmin: false,
      status: 'SUSPENDED',
      roles: []
    };

    (UserModel.findById as any)
      .mockReturnValueOnce(mockSuperAdmin)
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(mockTargetInactiveUser)
      });

    await expect(
      AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: superAdminId,
        reason: 'Attempting to impersonate suspended user'
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('8. should create a short-lived impersonation session with reason and log audit event', async () => {
    const mockSuperAdmin = {
      _id: superAdminId,
      email: 'superadmin@didm.in',
      isSuperAdmin: true,
      status: 'ACTIVE'
    };

    const mockTargetUser = {
      _id: targetUserId,
      email: 'trainer@tenant.com',
      name: 'Trainer Rahul',
      tenantId: targetTenantId,
      status: 'ACTIVE',
      isSuperAdmin: false,
      roles: [{ slug: 'INSTRUCTOR', name: 'Instructor' }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (UserModel.findById as any)
      .mockReturnValueOnce(mockSuperAdmin)
      .mockReturnValueOnce({
        populate: vi.fn().mockResolvedValue(mockTargetUser)
      });

    (SessionModel.create as any).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: targetUserId,
      impersonatedBy: superAdminId,
      impersonationReason: 'Customer support ticket #402'
    });

    const result = await AuthService.impersonateUser({
      targetUserId,
      superAdminUserId: superAdminId,
      reason: 'Customer support ticket #402',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest'
    });

    expect(result.user.isImpersonated).toBe(true);
    expect(result.user.impersonatedBy).toBe(superAdminId);
    expect(result.user.impersonationReason).toBe('Customer support ticket #402');
    expect(result.user.isSuperAdmin).toBe(false); // Effective user is NOT superadmin
    expect(result.tokens.accessToken).toBeDefined();
    expect(AuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUPERADMIN_IMPERSONATION_STARTED',
        actorId: superAdminId,
        metadata: expect.objectContaining({
          reason: 'Customer support ticket #402'
        })
      })
    );
  });

  it('9. should exit impersonation and restore SuperAdmin session', async () => {
    const mockImpersonatedSession: any = {
      _id: 'session-123',
      userId: targetUserId,
      impersonatedBy: superAdminId,
      save: vi.fn().mockResolvedValue(true)
    };

    const mockSuperAdmin = {
      _id: superAdminId,
      email: 'superadmin@didm.in',
      name: 'Super Administrator',
      isSuperAdmin: true,
      status: 'ACTIVE',
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    (SessionModel.findById as any).mockResolvedValue(mockImpersonatedSession);
    (UserModel.findById as any).mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockSuperAdmin)
    });
    (SessionModel.create as any).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      userId: superAdminId
    });

    const result = await AuthService.exitImpersonation({
      currentSessionId: 'session-123'
    });

    expect(result.user.isSuperAdmin).toBe(true);
    expect(result.user.email).toBe('superadmin@didm.in');
    expect(mockImpersonatedSession.revokedAt).toBeDefined();
    expect(AuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUPERADMIN_IMPERSONATION_ENDED',
        actorId: superAdminId
      })
    );
  });

  it('10. should reject exit impersonation when session has no impersonatedBy', async () => {
    const mockNormalSession: any = {
      _id: 'session-456',
      userId: targetUserId,
      impersonatedBy: null
    };

    (SessionModel.findById as any).mockResolvedValue(mockNormalSession);

    await expect(
      AuthService.exitImpersonation({
        currentSessionId: 'session-456'
      })
    ).rejects.toThrow(BadRequestError);
  });

  it('11. should reject exit impersonation if original SuperAdmin account was revoked/deactivated', async () => {
    const mockImpersonatedSession: any = {
      _id: 'session-789',
      userId: targetUserId,
      impersonatedBy: superAdminId,
      save: vi.fn().mockResolvedValue(true)
    };

    const mockInactiveSuperAdmin = {
      _id: superAdminId,
      isSuperAdmin: true,
      status: 'SUSPENDED'
    };

    (SessionModel.findById as any).mockResolvedValue(mockImpersonatedSession);
    (UserModel.findById as any).mockReturnValue({
      populate: vi.fn().mockResolvedValue(mockInactiveSuperAdmin)
    });

    await expect(
      AuthService.exitImpersonation({
        currentSessionId: 'session-789'
      })
    ).rejects.toThrow(UnauthorizedError);
  });
});
