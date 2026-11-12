import { UserModel, SessionModel, TenantModel, RoleModel, OrganizationMemberModel, runInTransaction, authorizePlatformSession, runAuthorizedPlatformOperation, runAuthBootstrapOperation } from '@edtech/database';
import {
  hashPassword,
  comparePassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  tenantContextStorage,
  sanitizeReturnUrl,
  getAuthorizedReturnUrl
} from '@edtech/utils';
import { PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';
import { IAuthTokens, IUser } from '@edtech/types';
import crypto from 'crypto';

export class AuthService {
  /**
   * User Registration
   */
  public static async register(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    tenantSlug?: string;
  }): Promise<{ user: IUser; emailVerificationToken: string }> {
    const registrationEmail = params.email.trim().toLowerCase();
    const existingUsers = await runAuthBootstrapOperation('REGISTER_USER_BY_EMAIL', registrationEmail, () => UserModel.find({ email: registrationEmail }).setOptions({ authBootstrapPolicy: 'REGISTER_USER_BY_EMAIL' }).limit(2));
    const existingUser = existingUsers[0];
    if (existingUser) {
      throw new BadRequestError('An account with this email address already exists');
    }

    if (!params.tenantSlug) throw new BadRequestError('Tenant workspace is required for registration');
    const tenant = await TenantModel.findOne({ slug: params.tenantSlug.toLowerCase(), status: 'ACTIVE' });
    if (!tenant) {
      throw new NotFoundError(`Active tenant '${params.tenantSlug}' not found`);
    }
    const tenantId = tenant._id;

    const passwordHash = await hashPassword(params.password);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Assign default STUDENT role if tenant exists
    let defaultRoleIds: any[] = [];
    if (tenantId) {
      const studentRole = await RoleModel.findOne({ tenantId, slug: 'student' });
      if (studentRole) {
        defaultRoleIds = [studentRole._id];
      }
    }

    const user = await runAuthBootstrapOperation('REGISTER_USER_BY_EMAIL', registrationEmail, () => UserModel.create({
      tenantId,
      name: params.name,
      email: params.email.toLowerCase(),
      passwordHash,
      phone: params.phone,
      status: 'ACTIVE',
      emailVerified: false,
      isSuperAdmin: false,
      roles: defaultRoleIds
    }));

    await AuditService.logEvent({
      actorId: user._id.toString(),
      tenantId: tenantId ? tenantId.toString() : 'PLATFORM',
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user._id.toString(),
      metadata: { email: user.email }
    });

    return {
      user: {
        id: user._id.toString(),
        tenantId: user.tenantId ? user.tenantId.toString() : null,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        emailVerified: user.emailVerified,
        isSuperAdmin: user.isSuperAdmin,
        roles: [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      emailVerificationToken
    };
  }

  /**
   * User Login & Dual Token Issuance
   */
  public static async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: IUser; tokens: IAuthTokens }> {
    const loginEmail = params.email.trim().toLowerCase();
    const matches = await runAuthBootstrapOperation('LOGIN_USER_BY_EMAIL', loginEmail, () => UserModel.find({ email: loginEmail }).setOptions({ authBootstrapPolicy: 'LOGIN_USER_BY_EMAIL' }).limit(2));
    if (matches.length > 1) throw new UnauthorizedError('Invalid email address or password');
    const user = matches[0];
    if (!user) {
      throw new UnauthorizedError('Invalid email address or password');
    }

    const isMatch = await comparePassword(params.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email address or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is suspended or inactive');
    }
    if (user.tenantId) await tenantContextStorage.run({ currentTenantId: user.tenantId.toString(), currentUserId: user._id.toString(), isPlatformContext: false, allowedTenantIds: [user.tenantId.toString()] }, async () => await user.populate('roles'));

    // Generate initial Refresh Token & Session
    const tempSessionId = new (require('mongoose').Types.ObjectId)();
    const rawRefreshToken = signRefreshToken({
      sessionId: tempSessionId.toString(),
      userId: user._id.toString(),
      tokenVersion: 1
    });

    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days

    const session = await SessionModel.create({
      _id: tempSessionId,
      userId: user._id,
      tenantId: user.tenantId,
      currentRefreshTokenHash: refreshTokenHash,
      tokenVersion: 1,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      lastUsedAt: new Date(),
      expiresAt
    });

    // Sign Access Token
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      sessionId: session._id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tokenVersion: 1
    });

    const lastLoginAt = new Date();
    await runAuthBootstrapOperation('LOGIN_USER_BY_EMAIL', loginEmail, () =>
      UserModel.updateOne({ email: loginEmail }, { $set: { lastLoginAt } })
        .setOptions({ authBootstrapPolicy: 'LOGIN_USER_BY_EMAIL' })
    );
    user.lastLoginAt = lastLoginAt;

    await AuditService.logEvent({
      actorId: user._id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : 'PLATFORM',
      action: 'USER_LOGIN',
      resource: 'Session',
      resourceId: session._id.toString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    const permissionsSet = new Set<string>();
    const rolesList: string[] = [];

    if (user.isSuperAdmin) {
      permissionsSet.add(PERMISSIONS.SUPERADMIN_ALL);
      rolesList.push('SUPER_ADMIN');
    }

    if (user.tenantId) {
      await tenantContextStorage.run(
        { currentTenantId: user.tenantId.toString(), currentUserId: user._id.toString(), isPlatformContext: false, allowedTenantIds: [user.tenantId.toString()] },
        async () => {
          try {
            const member = await OrganizationMemberModel.findOne({
              tenantId: user.tenantId,
              userId: user._id,
              status: 'ACTIVE'
            });

            if (member) {
              rolesList.push(member.role);
              const systemPerms = SYSTEM_ROLE_PERMISSIONS[member.role] || [];
              systemPerms.forEach((p) => permissionsSet.add(p));

              const customRole = await RoleModel.findOne({
                tenantId: user.tenantId,
                slug: member.role.toLowerCase()
              });
              if (customRole && Array.isArray(customRole.permissions)) {
                customRole.permissions.forEach((p) => permissionsSet.add(p));
              }
            }
          } catch {
            // Fall back gracefully
          }
        }
      );
    }

    if (rolesList.length === 0 && user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (r) {
          if (r.slug) rolesList.push(r.slug);
          if (Array.isArray(r.permissions)) {
            r.permissions.forEach((p: string) => permissionsSet.add(p));
          }
        }
      });
    }

    return {
      user: {
        id: user._id.toString(),
        tenantId: user.tenantId ? user.tenantId.toString() : null,
        activeTenantId: user.tenantId ? user.tenantId.toString() : null,
        allowedTenantIds: (user.allowedTenantIds || []).map((id: any) => id.toString()),
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        emailVerified: user.emailVerified,
        isSuperAdmin: user.isSuperAdmin,
        roles: rolesList,
        permissions: Array.from(permissionsSet),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken
      }
    };
  }

  /**
   * Refresh Token Rotation with Token Theft Detection
   */
  public static async refreshTokens(rawRefreshToken: string): Promise<IAuthTokens> {
    const payload = verifyRefreshToken(rawRefreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const session = await SessionModel.findById(payload.sessionId);
    if (!session) {
      throw new UnauthorizedError('Session not found');
    }

    const currentHash = hashToken(rawRefreshToken);
    const now = new Date();

    if (session.userId.toString() !== payload.userId) {
      throw new UnauthorizedError('Refresh token identity mismatch');
    }
    if (session.revokedAt || session.expiresAt <= now) {
      throw new UnauthorizedError('Session has been revoked or expired');
    }
    if (currentHash === session.previousRefreshTokenHash) {
      // A near-simultaneous browser-tab refresh can legitimately arrive with
      // the just-rotated token. Fail it without revoking the winning session.
      const lastUsedAt = session.lastUsedAt?.getTime?.() || 0;
      if (now.getTime() - lastUsedAt <= 10_000) {
        throw new UnauthorizedError('Refresh token already rotated');
      }

      // Reuse outside the narrow concurrency window is treated as theft.
      session.revokedAt = new Date();
      await session.save();

      await AuditService.logEvent({
        actorId: session.userId.toString(),
        tenantId: session.tenantId ? session.tenantId.toString() : 'PLATFORM',
        action: 'TOKEN_REUSE_THEFT_DETECTED',
        resource: 'Session',
        resourceId: session._id.toString(),
        metadata: { message: 'Attempted reuse of rotated refresh token. Session revoked.' }
      });

      throw new UnauthorizedError('Security Violation: Refresh token reuse detected. Session revoked.');
    }
    if (payload.tokenVersion !== session.tokenVersion) {
      throw new UnauthorizedError('Refresh token version mismatch');
    }

    // SECURITY CHECK 2: Must match active current refresh token hash
    if (currentHash !== session.currentRefreshTokenHash) {
      throw new UnauthorizedError('Invalid refresh token fingerprint');
    }

    // ROTATION: Generate new rotated token pair
    const newTokenVersion = session.tokenVersion + 1;
    const newRawRefreshToken = signRefreshToken({
      sessionId: session._id.toString(),
      userId: session.userId.toString(),
      tokenVersion: newTokenVersion
    });

    const newRefreshTokenHash = hashToken(newRawRefreshToken);

    // Compare-and-set prevents two requests from rotating the same token.
    const rotatedSession = await SessionModel.findOneAndUpdate(
      {
        _id: session._id,
        currentRefreshTokenHash: currentHash,
        tokenVersion: payload.tokenVersion,
        revokedAt: null,
        expiresAt: { $gt: now }
      },
      {
        $set: {
          previousRefreshTokenHash: currentHash,
          currentRefreshTokenHash: newRefreshTokenHash,
          tokenVersion: newTokenVersion,
          lastUsedAt: now
        }
      },
      { new: true }
    );
    if (!rotatedSession) {
      throw new UnauthorizedError('Refresh token already rotated');
    }

    const sessionUserId = rotatedSession.userId.toString();
    const user = await runAuthBootstrapOperation('SESSION_USER_BY_ID', sessionUserId, () => UserModel.findOne({ _id: rotatedSession.userId }).setOptions({ authBootstrapPolicy: 'SESSION_USER_BY_ID' }));
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account suspended');
    }

    const newAccessToken = signAccessToken({
      sub: user._id.toString(),
      sessionId: rotatedSession._id.toString(),
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      tokenVersion: newTokenVersion
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    };
  }

  /**
   * Revoke Single Session
   */
  public static async logout(sessionId: string, actorId: string): Promise<void> {
    const session = await SessionModel.findById(sessionId);
    if (session) {
      if (session.userId.toString() !== actorId && session.impersonatedBy?.toString() !== actorId) throw new UnauthorizedError('Session revocation actor mismatch');
      session.revokedAt = new Date();
      await session.save();

      await AuditService.logEvent({
        actorId,
        tenantId: session.tenantId ? session.tenantId.toString() : 'PLATFORM',
        action: 'USER_LOGOUT',
        resource: 'Session',
        resourceId: session._id.toString()
      });
    }
  }

  /**
   * Revoke All Sessions for User
   */
  public static async logoutAll(userId: string, actorId: string): Promise<void> {
    if (userId !== actorId) throw new UnauthorizedError('Session revocation actor mismatch');
    await SessionModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    await AuditService.logEvent({
      actorId,
      tenantId: 'PLATFORM',
      action: 'USER_LOGOUT_ALL_SESSIONS',
      resource: 'User',
      resourceId: userId
    });
  }

  /**
   * SuperAdmin Impersonation: Secret Login as any tenant user
   */
  public static async impersonateUser(params: {
    targetUserId: string;
    superAdminUserId: string;
    reason?: string;
    returnTo?: string;
    originalSessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: IUser; tokens: IAuthTokens; impersonatedBy: string; returnTo: string }> {
    if (!params.reason || typeof params.reason !== 'string' || params.reason.trim().length === 0) {
      throw new BadRequestError('Impersonation reason is required');
    }
    const impersonationReason = params.reason.trim();
    const sanitizedReturnTo = sanitizeReturnUrl(params.returnTo, '/platform');

    if (params.superAdminUserId === params.targetUserId) {
      throw new BadRequestError('Self-impersonation is not permitted');
    }

    if (!params.originalSessionId) throw new UnauthorizedError('Verified platform session is required');
    const correlationId = crypto.randomUUID();
    let platformAuth;
    try { platformAuth = await authorizePlatformSession({ actorId: params.superAdminUserId, sessionId: params.originalSessionId, reason: impersonationReason, correlationId }); }
    catch (error: any) { throw new UnauthorizedError(error?.message || 'Platform session verification failed'); }

    const { superAdmin, targetUser } = await runAuthorizedPlatformOperation(platformAuth, {
      reason: impersonationReason,
      correlationId
    }, async () => {
      const superAdminQuery = UserModel.findById(params.superAdminUserId);
      const sa = await (typeof (superAdminQuery as any)?.setOptions === 'function'
        ? (superAdminQuery as any).setOptions({ authorizedPlatformOperation: true })
        : superAdminQuery);
      if (!sa || !sa.isSuperAdmin || sa.status !== 'ACTIVE') {
        throw new UnauthorizedError('Platform Super Admin access required for impersonation');
      }

      const targetUserQuery = UserModel.findById(params.targetUserId);
      const tu = await (typeof (targetUserQuery as any)?.setOptions === 'function'
        ? (targetUserQuery as any).setOptions({ authorizedPlatformOperation: true }).populate('roles')
        : (typeof (targetUserQuery as any)?.populate === 'function'
            ? (targetUserQuery as any).populate('roles')
            : targetUserQuery));
      if (!tu) {
        throw new NotFoundError('Target user account not found');
      }
      return { superAdmin: sa, targetUser: tu };
    });

    if (targetUser.isSuperAdmin) {
      throw new BadRequestError('Impersonating another platform superadmin is not permitted');
    }

    if (targetUser.status !== 'ACTIVE') {
      throw new BadRequestError('Cannot impersonate an inactive or suspended user account');
    }

    const tempSessionId = new (require('mongoose').Types.ObjectId)();
    const rawRefreshToken = signRefreshToken({
      sessionId: tempSessionId.toString(),
      userId: targetUser._id.toString(),
      tokenVersion: 1
    });

    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 Hours short-lived impersonation session

    const session = await runInTransaction(async (dbSession) => {
      const [created] = await SessionModel.create([{
        _id: tempSessionId,
        userId: targetUser._id,
        tenantId: targetUser.tenantId,
        activeTenantId: targetUser.tenantId,
        impersonatedBy: superAdmin._id,
        impersonationReason,
        impersonationReturnTo: sanitizedReturnTo,
        originalSessionId: params.originalSessionId ? new (require('mongoose').Types.ObjectId)(params.originalSessionId) : null,
        currentRefreshTokenHash: refreshTokenHash,
        tokenVersion: 1,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        lastUsedAt: new Date(),
        expiresAt
      }], { session: dbSession });

      await AuditService.logEvent({
        actorId: superAdmin._id.toString(),
        tenantId: targetUser.tenantId ? targetUser.tenantId.toString() : 'PLATFORM',
        action: 'SUPERADMIN_IMPERSONATION_STARTED',
        resource: 'User',
        resourceId: targetUser._id.toString(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        session: dbSession,
        critical: true,
        correlationId,
        idempotencyKey: `impersonation:start:${created._id.toString()}`,
        metadata: {
          superAdminEmail: superAdmin.email,
          targetEmail: targetUser.email,
          targetUserId: targetUser._id.toString(),
          targetRoles: targetUser.roles?.map((r: any) => r.slug || r.name),
          reason: impersonationReason,
          returnTo: sanitizedReturnTo,
          impersonationSessionId: created._id.toString()
        }
      });
      return created;
    });

    const accessToken = signAccessToken({
      sub: targetUser._id.toString(),
      sessionId: session._id.toString(),
      tenantId: targetUser.tenantId ? targetUser.tenantId.toString() : null,
      tokenVersion: 1
    });

    const targetPermsSet = new Set<string>();
    const targetRolesList: string[] = [];

    if (targetUser.tenantId) {
      await tenantContextStorage.run(
        { currentTenantId: targetUser.tenantId.toString(), currentUserId: targetUser._id.toString(), isPlatformContext: false, allowedTenantIds: [targetUser.tenantId.toString()] },
        async () => {
          try {
            const member = await OrganizationMemberModel.findOne({
              tenantId: targetUser.tenantId,
              userId: targetUser._id,
              status: 'ACTIVE'
            });

            if (member) {
              targetRolesList.push(member.role);
              const systemPerms = SYSTEM_ROLE_PERMISSIONS[member.role] || [];
              systemPerms.forEach((p) => targetPermsSet.add(p));

              const customRole = await RoleModel.findOne({
                tenantId: targetUser.tenantId,
                slug: member.role.toLowerCase()
              });
              if (customRole && Array.isArray(customRole.permissions)) {
                customRole.permissions.forEach((p) => targetPermsSet.add(p));
              }
            }
          } catch {
            // Fall back gracefully
          }
        }
      );
    }

    if (targetRolesList.length === 0 && targetUser.roles && Array.isArray(targetUser.roles)) {
      targetUser.roles.forEach((r: any) => {
        if (r) {
          if (r.slug) targetRolesList.push(r.slug);
          if (Array.isArray(r.permissions)) {
            r.permissions.forEach((p: string) => targetPermsSet.add(p));
          }
        }
      });
    }

    return {
      user: {
        id: targetUser._id.toString(),
        tenantId: targetUser.tenantId ? targetUser.tenantId.toString() : null,
        activeTenantId: targetUser.tenantId ? targetUser.tenantId.toString() : null,
        allowedTenantIds: (targetUser.allowedTenantIds || []).map((id: any) => id.toString()),
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        status: targetUser.status,
        emailVerified: targetUser.emailVerified,
        isSuperAdmin: false,
        impersonatedBy: superAdmin._id.toString(),
        isImpersonated: true,
        impersonationReason,
        impersonationReturnTo: sanitizedReturnTo,
        roles: targetRolesList,
        permissions: Array.from(targetPermsSet),
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken
      },
      impersonatedBy: superAdmin.email,
      returnTo: sanitizedReturnTo
    };
  }

  /**
   * Exit Impersonation: Restore SuperAdmin Session
   */
  public static async exitImpersonation(params: {
    currentSessionId: string;
    returnTo?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: IUser; tokens: IAuthTokens; impersonationEnded: boolean; returnTo: string }> {
    const currentSession = await SessionModel.findById(params.currentSessionId);
    if (!currentSession || !currentSession.impersonatedBy) {
      throw new BadRequestError('No active impersonation session found to exit');
    }

    const superAdminId = currentSession.impersonatedBy.toString();
    const rawReturnTo = params.returnTo || (currentSession as any).impersonationReturnTo;
    const authorizedReturnTo = getAuthorizedReturnUrl({ isSuperAdmin: true }, rawReturnTo, '/platform');

    if (currentSession.revokedAt) {
      // Idempotent duplicate exit: session already ended
      return {
        user: {
          id: superAdminId,
          tenantId: null,
          activeTenantId: null,
          allowedTenantIds: [],
          name: '',
          email: '',
          status: 'ACTIVE',
          emailVerified: true,
          isSuperAdmin: true,
          roles: ['SUPER_ADMIN'],
          permissions: [PERMISSIONS.SUPERADMIN_ALL],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        tokens: {
          accessToken: '',
          refreshToken: ''
        },
        impersonationEnded: true,
        returnTo: authorizedReturnTo
      };
    }

    // Do not restore a revoked original session (Requirement 10)
    if (currentSession.originalSessionId) {
      const origSession = await SessionModel.findById(currentSession.originalSessionId);
      if (origSession && (origSession.revokedAt || new Date() > origSession.expiresAt)) {
        throw new UnauthorizedError('Original operator session has been revoked or expired');
      }
    }

    const correlationId = crypto.randomUUID();
    let platformAuth;
    try { platformAuth = await authorizePlatformSession({ actorId: superAdminId, sessionId: params.currentSessionId, reason: 'Exit Impersonation Session', correlationId, allowImpersonatedExit: true }); }
    catch (error: any) { throw new UnauthorizedError(error?.message || 'Platform session verification failed'); }

    const superAdmin = await runAuthorizedPlatformOperation(platformAuth, {
      reason: 'Exit Impersonation Session',
      correlationId
    }, async () => {
      const saQuery = UserModel.findById(superAdminId);
      const sa = await (typeof (saQuery as any)?.setOptions === 'function'
        ? (saQuery as any).setOptions({ authorizedPlatformOperation: true }).populate('roles')
        : (typeof (saQuery as any)?.populate === 'function'
            ? (saQuery as any).populate('roles')
            : saQuery));
      if (!sa || !sa.isSuperAdmin || sa.status !== 'ACTIVE') {
        throw new UnauthorizedError('Platform Super Admin account inactive or revoked');
      }
      return sa;
    });

    const userRoles = superAdmin.roles ? superAdmin.roles.map((r: any) => r.slug || r.name) : ['SUPER_ADMIN'];
    const finalReturnTo = getAuthorizedReturnUrl(
      { isSuperAdmin: true, roles: userRoles },
      rawReturnTo,
      '/platform'
    );

    // Create a fresh clean session for SuperAdmin
    const tempSessionId = new (require('mongoose').Types.ObjectId)();
    const rawRefreshToken = signRefreshToken({
      sessionId: tempSessionId.toString(),
      userId: superAdmin._id.toString(),
      tokenVersion: 1
    });

    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newAdminSession = await runInTransaction(async (dbSession) => {
      const revoked = await SessionModel.findOneAndUpdate(
        { _id: currentSession._id, impersonatedBy: superAdmin._id, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { new: true, session: dbSession }
      );
      if (!revoked) throw new BadRequestError('Impersonation session is no longer active');

      const [created] = await SessionModel.create([{
        _id: tempSessionId,
        userId: superAdmin._id,
        tenantId: null,
        activeTenantId: null,
        currentRefreshTokenHash: refreshTokenHash,
        tokenVersion: 1,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        lastUsedAt: new Date(),
        expiresAt
      }], { session: dbSession });

      await AuditService.logEvent({
        actorId: superAdmin._id.toString(),
        tenantId: 'PLATFORM',
        action: 'SUPERADMIN_IMPERSONATION_ENDED',
        resource: 'Session',
        resourceId: currentSession._id.toString(),
        session: dbSession,
        critical: true,
        correlationId,
        idempotencyKey: `impersonation:end:${currentSession._id.toString()}`,
        metadata: {
          superAdminEmail: superAdmin.email,
          targetUserId: currentSession.userId.toString(),
          exitedUserId: currentSession.userId.toString(),
          returnTo: finalReturnTo,
          restoredSessionId: created._id.toString()
        }
      });
      return created;
    });

    const accessToken = signAccessToken({
      sub: superAdmin._id.toString(),
      sessionId: newAdminSession._id.toString(),
      tenantId: null,
      tokenVersion: 1
    });

    return {
      user: {
        id: superAdmin._id.toString(),
        tenantId: null,
        activeTenantId: null,
        allowedTenantIds: (superAdmin.allowedTenantIds || []).map((id: any) => id.toString()),
        name: superAdmin.name,
        email: superAdmin.email,
        phone: superAdmin.phone,
        status: superAdmin.status,
        emailVerified: superAdmin.emailVerified,
        isSuperAdmin: true,
        roles: userRoles,
        permissions: [PERMISSIONS.SUPERADMIN_ALL],
        createdAt: superAdmin.createdAt,
        updatedAt: superAdmin.updatedAt
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken
      },
      impersonationEnded: true,
      returnTo: finalReturnTo
    };
  }
}
