import { Types } from 'mongoose';
import {
  IntegrationConnectionModel,
  IIntegrationConnectionDocument,
  UserModel
} from '@edtech/database';
import {
  IntegrationProvider,
  IntegrationScopeType,
  IIntegrationConnectionDTO
} from '@edtech/types';
import {
  ConnectIntegrationSchema
} from '@edtech/validation';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../../../errors/appError';
import { BranchAccessService, BranchActor } from '../../branchAccess.service';
import { AuditService } from '../../audit.service';
import { SecretEncryptionService } from '../../security/secretEncryption.service';
import { OAuthStateService } from '../security/oauthState.service';
import { TokenManagerService } from '../security/tokenManager.service';
import { IntegrationProviderRegistry } from '../registry/providerRegistry.service';
import { DomainEventService } from '../../domainEvent.service';
import { tenantContextStorage } from '@edtech/utils';
import { ProviderOAuthConfigService } from '../security/providerOAuthConfig.service';

export class IntegrationConnectionService {
  /**
   * Sanitizes an IntegrationConnection document into a safe DTO without secrets.
   */
  public static toDTO(doc: IIntegrationConnectionDocument): IIntegrationConnectionDTO {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      provider: doc.provider,
      status: doc.status,
      scopeType: doc.scopeType,
      branchId: doc.branchId ? doc.branchId.toString() : null,
      userId: doc.userId ? doc.userId.toString() : null,
      externalAccountId: doc.externalAccountId || undefined,
      externalTenantId: doc.externalTenantId || undefined,
      scopes: doc.scopes || [],
      connectedBy: doc.connectedBy ? doc.connectedBy.toString() : undefined,
      connectedAt: doc.connectedAt,
      lastRefreshAt: doc.lastRefreshAt,
      expiresAt: doc.expiresAt,
      lastHealthCheckAt: doc.lastHealthCheckAt,
      lastErrorCategory: doc.lastErrorCategory || undefined,
      lastErrorMessage: doc.lastErrorMessage || undefined,
      metadata: doc.metadata || {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }

  public static async listConnections(
    tenantId: string,
    actor: BranchActor
  ): Promise<IIntegrationConnectionDTO[]> {
    const filter: any = { tenantId };
    const connections = await IntegrationConnectionModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Branch actor filtering if connection is branch-scoped
    const authorized = [];
    for (const conn of connections) {
      if (conn.scopeType === 'BRANCH' && conn.branchId) {
        const hasAccess = await BranchAccessService.hasBranchAccess(
          tenantId,
          actor,
          conn.branchId.toString()
        );
        if (!hasAccess) continue;
      }
      if (conn.scopeType === 'USER' && conn.userId) {
        if (conn.userId.toString() !== actor.userId && !actor.isSuperAdmin) {
          // Instructors only see their own user-scoped connections
          continue;
        }
      }
      authorized.push(conn);
    }

    return authorized.map((c: any) => this.toDTO(c));
  }

  public static async getConnection(
    tenantId: string,
    id: string,
    actor: BranchActor
  ): Promise<IIntegrationConnectionDocument> {
    const conn = await IntegrationConnectionModel.findOne({ _id: id, tenantId });
    if (!conn) {
      throw new NotFoundError('Integration connection not found');
    }

    if (conn.scopeType === 'BRANCH' && conn.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, conn.branchId.toString(), {
        requireActive: true
      });
    }

    if (conn.scopeType === 'USER' && conn.userId) {
      if (conn.userId.toString() !== actor.userId && !actor.isSuperAdmin) {
        throw new ForbiddenError('You are not authorized to access this user-scoped connection');
      }
    }

    return conn;
  }

  public static async initiateOAuth(
    tenantId: string,
    provider: IntegrationProvider,
    actor: BranchActor,
    options: { scopeType?: IntegrationScopeType; branchId?: string; redirectUrl?: string } = {}
  ): Promise<{ authUrl: string; state: string }> {
    if (options.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, options.branchId, {
        requireActive: true
      });
    }

    const config = ProviderOAuthConfigService.require(provider);
    const { state, codeChallenge } = await OAuthStateService.generateState({
      tenantId,
      userId: actor.userId,
      provider,
      scopeType: options.scopeType || 'TENANT',
      branchId: options.branchId || null,
      redirectUrl: options.redirectUrl
    });

    const redirectUri = config.callbackUrl;
    let authUrl = '';
    switch (provider) {
      case 'GOOGLE_CLASSROOM':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri, scope: config.scopes.join(' '), access_type: 'offline', prompt: 'consent', state, code_challenge: codeChallenge, code_challenge_method: 'S256' })}`;
        break;
      case 'GOOGLE_MEET':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri, scope: config.scopes.join(' '), access_type: 'offline', prompt: 'consent', state, code_challenge: codeChallenge, code_challenge_method: 'S256' })}`;
        break;
      case 'ZOOM':
        authUrl = `https://zoom.us/oauth/authorize?${new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri, state, code_challenge: codeChallenge, code_challenge_method: 'S256' })}`;
        break;
      case 'MICROSOFT_TEAMS':
        authUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri, response_mode: 'query', scope: config.scopes.join(' '), state, code_challenge: codeChallenge, code_challenge_method: 'S256' })}`;
        break;
    }

    return { authUrl, state };
  }

  public static async handleOAuthCallback(
    raw: unknown,
    expectedProvider?: IntegrationProvider
  ): Promise<IIntegrationConnectionDTO> {
    const params = raw as { code?: string; state?: string; error?: string };
    if (params.error) {
      throw new BadRequestError(`OAuth provider returned error: ${params.error}`);
    }
    if (!params.state || !params.code) {
      throw new BadRequestError('Missing OAuth state parameter');
    }
    const statePayload = await OAuthStateService.consumeState(params.state, expectedProvider);
    const tenantId = statePayload.tenantId;
    const config = ProviderOAuthConfigService.require(statePayload.provider);
    const redirectUri = config.callbackUrl;
    const tokenUrl = statePayload.provider === 'ZOOM' ? 'https://zoom.us/oauth/token'
      : statePayload.provider === 'MICROSOFT_TEAMS' ? 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token'
      : 'https://oauth2.googleapis.com/token';
    const body = new URLSearchParams({ grant_type: 'authorization_code', code: params.code, redirect_uri: redirectUri, client_id: config.clientId, code_verifier: statePayload.codeVerifier || '' });
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    if (statePayload.provider === 'ZOOM') headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
    else body.set('client_secret', config.clientSecret);
    const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers, body });
    const tokens: any = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokens.access_token) throw new UnauthorizedError(`OAuth token exchange failed (${tokenResponse.status})`);
    const identityUrl = statePayload.provider === 'ZOOM' ? 'https://api.zoom.us/v2/users/me'
      : statePayload.provider === 'MICROSOFT_TEAMS' ? 'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName,displayName'
      : 'https://openidconnect.googleapis.com/v1/userinfo';
    const identityResponse = await fetch(identityUrl, { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' } });
    const identity: any = await identityResponse.json().catch(() => ({}));
    if (!identityResponse.ok) throw new UnauthorizedError(`OAuth identity lookup failed (${identityResponse.status})`);
    const accountEmail = identity.email || identity.mail || identity.userPrincipalName;
    const credentials = { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, clientId: config.clientId, clientSecret: config.clientSecret, accountEmail };

    return tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: statePayload.userId, isPlatformContext: false, allowedTenantIds: [tenantId] }, async () => {
      const connection = await this.connectOrUpdate(tenantId, statePayload.provider, {
        scopeType: statePayload.scopeType, branchId: statePayload.branchId || undefined, credentials
      }, { userId: statePayload.userId });
      connection.externalAccountId = identity.id || identity.sub || accountEmail;
      connection.externalTenantId = identity.account_id || identity.tid || undefined;
      connection.scopes = String(tokens.scope || config.scopes.join(' ')).split(' ').filter(Boolean);
      // Zoom's current app builder can return granular endpoint scopes instead
      // of legacy macro names, so capability verification is performed by its
      // safe identity probe and real operations rather than false exact-name
      // comparisons against the legacy documentation labels.
      const missingScopes = statePayload.provider === 'ZOOM'
        ? []
        : config.scopes.filter(scope => !connection.scopes.includes(scope));
      connection.status = missingScopes.length ? 'MISSING_SCOPE' : 'CONNECTED';
      connection.expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000);
      connection.metadata = { ...(connection.metadata || {}), accountEmail, displayName: identity.display_name || identity.displayName || identity.name, missingScopes };
      await connection.save();
      return this.toDTO(connection);
    });
  }

  public static async connectOrUpdate(
    tenantId: string,
    provider: IntegrationProvider,
    rawInput: unknown,
    actor: BranchActor
  ): Promise<IIntegrationConnectionDocument> {
    const input = ConnectIntegrationSchema.parse(rawInput);

    if (input.branchId) {
      await BranchAccessService.assertBranchAccess(tenantId, actor, input.branchId, {
        requireActive: true
      });
    }

    const scopeType = input.scopeType || 'TENANT';
    const userId = scopeType === 'USER' ? new Types.ObjectId(actor.userId) : null;
    const branchId = scopeType === 'BRANCH' && input.branchId ? new Types.ObjectId(input.branchId) : null;

    const creds = input.credentials || {};
    const encryptedCredentials = TokenManagerService.encryptCredentials(creds);

    const doc = await IntegrationConnectionModel.findOneAndUpdate(
      {
        tenantId,
        provider,
        scopeType,
        userId,
        branchId
      },
      {
        $set: {
          status: 'CONNECTED',
          encryptedCredentials,
          externalAccountId: creds.accountEmail || creds.clientId || `account_${Date.now()}`,
          scopes: ['offline_access', 'read', 'write'],
          connectedBy: new Types.ObjectId(actor.userId),
          connectedAt: new Date(),
          lastRefreshAt: new Date(),
          expiresAt: new Date(Date.now() + 3600 * 1000),
          lastHealthCheckAt: new Date(),
          lastErrorCategory: null,
          lastErrorMessage: null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await AuditService.logEvent({
      actorId: actor.userId,
      tenantId,
      action: 'INTEGRATION_CONNECTION_SAVED',
      resource: 'IntegrationConnection',
      resourceId: doc._id.toString(),
      metadata: { provider, scopeType, branchId: input.branchId }
    });

    return doc;
  }

  public static async disconnectConnection(
    tenantId: string,
    id: string,
    actor: BranchActor
  ): Promise<IIntegrationConnectionDTO> {
    const conn = await this.getConnection(tenantId, id, actor);
    const credentials = TokenManagerService.decryptCredentials(conn);
    let revocationAttempted = false;
    let revocationSucceeded = false;
    try {
      if ((conn.provider === 'GOOGLE_CLASSROOM' || conn.provider === 'GOOGLE_MEET') && (credentials.refreshToken || credentials.accessToken)) {
        revocationAttempted = true;
        const token = credentials.refreshToken || credentials.accessToken!;
        const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        revocationSucceeded = response.ok;
      } else if (conn.provider === 'ZOOM' && credentials.accessToken) {
        revocationAttempted = true;
        const config = ProviderOAuthConfigService.resolve('ZOOM');
        const response = await fetch('https://zoom.us/oauth/revoke', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: credentials.accessToken }) });
        revocationSucceeded = response.ok;
      }
    } catch {
      // Provider revocation is best-effort. Local credential destruction must proceed.
    }
    conn.status = 'DISCONNECTED';
    conn.encryptedCredentials = '';
    conn.metadata = { ...(conn.metadata || {}), disconnectedAt: new Date().toISOString(), revocationAttempted, revocationSucceeded };
    await conn.save();

    await AuditService.logEvent({
      actorId: actor.userId,
      tenantId,
      action: 'INTEGRATION_CONNECTION_DISCONNECTED',
      resource: 'IntegrationConnection',
      resourceId: id,
      metadata: { provider: conn.provider, revocationAttempted, revocationSucceeded }
    });

    return this.toDTO(conn);
  }

  public static async checkHealth(
    tenantId: string,
    id: string,
    actor: BranchActor
  ): Promise<{ healthy: boolean; message?: string; latencyMs?: number }> {
    const conn = await this.getConnection(tenantId, id, actor);

    let result;
    if (conn.provider === 'GOOGLE_CLASSROOM') {
      const adapter = IntegrationProviderRegistry.getAcademicPlatformProvider(conn.provider);
      result = await adapter.healthCheck(conn);
    } else {
      const adapter = IntegrationProviderRegistry.getLiveMeetingProvider(conn.provider);
      result = await adapter.healthCheck(conn);
    }

    if (!result.healthy) {
      conn.status = conn.status === 'CONNECTED' ? 'ERROR' : conn.status;
      conn.lastErrorMessage = result.message || 'Health check failed';
    } else {
      conn.lastHealthCheckAt = new Date();
      if (conn.status === 'ERROR') conn.status = 'CONNECTED';
      conn.lastErrorMessage = undefined;
    }
    await conn.save();

    return result;
  }
}
