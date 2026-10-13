import crypto from 'crypto';
import { IntegrationOAuthStateModel } from '@edtech/database';
import { IntegrationProvider, IntegrationScopeType } from '@edtech/types';
import { BadRequestError } from '../../../errors/appError';
import { SecretEncryptionService } from '../../security/secretEncryption.service';

const STATE_TTL_MS = 15 * 60 * 1000;

export interface OAuthStatePayload {
  tenantId: string; userId: string; provider: IntegrationProvider; scopeType: IntegrationScopeType;
  branchId?: string | null; redirectUrl?: string; nonce: string; expiresAt: number; codeVerifier?: string;
}

function stateSecret(): string {
  const value = process.env.OAUTH_STATE_SECRET || process.env.STORAGE_ENCRYPTION_KEY;
  if (!value && process.env.NODE_ENV === 'test') return 'test-only-oauth-state-secret-32-bytes';
  if (!value || value.length < 32) throw new Error('OAUTH_STATE_SECRET or STORAGE_ENCRYPTION_KEY must contain at least 32 characters');
  return value;
}
const hashNonce = (nonce: string) => crypto.createHash('sha256').update(nonce).digest('hex');

export class OAuthStateService {
  public static async generateState(params: {
    tenantId: string; userId: string; provider: IntegrationProvider; scopeType?: IntegrationScopeType;
    branchId?: string | null; redirectUrl?: string;
  }): Promise<{ state: string; codeChallenge: string }> {
    const nonce = crypto.randomBytes(32).toString('base64url');
    const codeVerifier = crypto.randomBytes(48).toString('base64url');
    const expiresAt = Date.now() + STATE_TTL_MS;
    const encoded = Buffer.from(JSON.stringify({ nonce, expiresAt, provider: params.provider })).toString('base64url');
    const signature = crypto.createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
    await IntegrationOAuthStateModel.create({
      nonceHash: hashNonce(nonce), tenantId: params.tenantId, userId: params.userId,
      provider: params.provider, scopeType: params.scopeType || 'TENANT', branchId: params.branchId || null,
      redirectUrl: params.redirectUrl, encryptedCodeVerifier: SecretEncryptionService.encryptSecret(codeVerifier),
      expiresAt: new Date(expiresAt)
    });
    return { state: `${encoded}.${signature}`, codeChallenge: crypto.createHash('sha256').update(codeVerifier).digest('base64url') };
  }

  public static async consumeState(state: string, expectedProvider?: IntegrationProvider): Promise<OAuthStatePayload> {
    const [encoded, signature, ...extra] = String(state || '').split('.');
    if (!encoded || !signature || extra.length) throw new BadRequestError('Malformed OAuth state parameter');
    const expected = crypto.createHmac('sha256', stateSecret()).update(encoded).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new BadRequestError('OAuth state signature verification failed');
    let signed: { nonce: string; expiresAt: number; provider: IntegrationProvider };
    try { signed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); }
    catch { throw new BadRequestError('Failed to parse OAuth state payload'); }
    if (!signed.nonce || Date.now() > signed.expiresAt) throw new BadRequestError('OAuth state has expired');
    if (expectedProvider && signed.provider !== expectedProvider) throw new BadRequestError('OAuth state provider mismatch');
    const record = await IntegrationOAuthStateModel.findOneAndUpdate(
      { nonceHash: hashNonce(signed.nonce), provider: signed.provider, consumedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { consumedAt: new Date() } }, { new: true }
    );
    if (!record) throw new BadRequestError('OAuth state is invalid, expired, or already used');
    return {
      tenantId: record.tenantId.toString(), userId: record.userId.toString(), provider: record.provider,
      scopeType: record.scopeType, branchId: record.branchId?.toString() || null, redirectUrl: record.redirectUrl,
      nonce: signed.nonce, expiresAt: record.expiresAt.getTime(),
      codeVerifier: record.encryptedCodeVerifier ? SecretEncryptionService.decryptSecret(record.encryptedCodeVerifier) : undefined
    };
  }
}
