import { AsyncLocalStorage } from 'async_hooks';
import { timingSafeEqual } from 'crypto';
import { Types } from 'mongoose';
import { SessionModel } from './models/session.model';
import { UserModel } from './models/user.model';

export const SYSTEM_OPERATION_KINDS = [
  'AUTH_BOOTSTRAP', 'WORKER_CLAIM', 'OUTBOX_DISPATCH', 'NOTIFICATION_DISPATCH',
  'FINANCE_WEBHOOK', 'FINANCE_RECONCILIATION', 'AUTOMATION_RECOVERY',
  'INTEGRATION_WORKER', 'PROVIDER_WEBHOOK', 'ZOOM_RECORDING_WEBHOOK',
  'ARTIFACT_HANDOFF', 'PUBLIC_CERTIFICATE_VERIFICATION', 'DATABASE_MIGRATION'
] as const;

export type SystemOperationKind = typeof SYSTEM_OPERATION_KINDS[number];

export const PUBLIC_READ_POLICIES = ['CERTIFICATE_VERIFICATION', 'DOMAIN_RESOLUTION'] as const;
export type PublicReadPolicy = typeof PUBLIC_READ_POLICIES[number];

type AuthorizedExecutionContext =
  | { mode: 'PLATFORM'; actorId: string; sessionId: string; reason: string; correlationId: string }
  | { mode: 'SYSTEM'; kind: SystemOperationKind; principal: string; reason: string; correlationId: string; tenantId?: string };

declare const authorityBrand: unique symbol;
export type SystemAuthority = { readonly principal: string; readonly [authorityBrand]: true };

declare const platformAuthorityBrand: unique symbol;
export type PlatformAuthority = { readonly actorId: string; readonly sessionId: string; readonly reason: string; readonly correlationId: string; readonly [platformAuthorityBrand]: true };

const storage = new AsyncLocalStorage<AuthorizedExecutionContext>();
const authBootstrapStorage = new AsyncLocalStorage<{ policy: AuthBootstrapPolicy; key: string }>();
const issuedSystemAuthorities = new WeakSet<object>();
const issuedPlatformAuthorities = new WeakSet<object>();
const kinds = new Set<string>(SYSTEM_OPERATION_KINDS);
const publicPolicies = new Set<string>(PUBLIC_READ_POLICIES);
export const AUTH_BOOTSTRAP_POLICIES = ['LOGIN_USER_BY_EMAIL', 'REGISTER_USER_BY_EMAIL', 'SESSION_USER_BY_ID'] as const;
export type AuthBootstrapPolicy = typeof AUTH_BOOTSTRAP_POLICIES[number];
const authBootstrapPolicies = new Set<string>(AUTH_BOOTSTRAP_POLICIES);

function required(value: string | undefined, field: string) {
  if (!value?.trim()) throw new Error(`Authorized execution ${field} is required`);
  return value.trim();
}

function secretsEqual(provided: string, expected: string) {
  const left = Buffer.from(provided); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Exchange a verified internal-worker credential for a process-local capability. */
export function authorizeInternalSystemCaller(providedSecret: string | undefined, principal: string): SystemAuthority | undefined {
  const expected = process.env.INTERNAL_WORKER_SECRET;
  if (!providedSecret || !expected || !secretsEqual(providedSecret, expected)) return undefined;
  const authority = Object.freeze({ principal: required(principal, 'principal') }) as SystemAuthority;
  issuedSystemAuthorities.add(authority);
  return authority;
}

/** Verifies server-side persistence before issuing a process-local capability. */
export async function authorizePlatformSession(params: { actorId: string; sessionId: string; reason: string; correlationId: string; allowImpersonatedExit?: boolean }): Promise<PlatformAuthority> {
  const actorId = required(params.actorId, 'actorId');
  const sessionId = required(params.sessionId, 'sessionId');
  const reason = required(params.reason, 'reason');
  const correlationId = required(params.correlationId, 'correlationId');
  if (!Types.ObjectId.isValid(actorId) || !Types.ObjectId.isValid(sessionId)) throw new Error('Valid actor and session IDs are required for PlatformAuthority');
  const session: any = await SessionModel.collection.findOne({ _id: new Types.ObjectId(sessionId) }, { projection: { userId: 1, impersonatedBy: 1, revokedAt: 1, expiresAt: 1 } });
  if (!session || session.revokedAt || !session.expiresAt || session.expiresAt <= new Date()) throw new Error('Platform Super Admin session is expired or revoked');
  const boundActor = params.allowImpersonatedExit ? session.impersonatedBy : session.userId;
  if (!boundActor || String(boundActor) !== actorId) throw new Error('Platform actor and session do not match');
  if (!params.allowImpersonatedExit && session.impersonatedBy) throw new Error('Impersonated sessions cannot issue platform authority');
  const actor: any = await UserModel.collection.findOne({ _id: new Types.ObjectId(actorId) }, { projection: { isSuperAdmin: 1, status: 1 } });
  if (!actor || actor.status !== 'ACTIVE' || actor.isSuperAdmin !== true) throw new Error('Active platform SuperAdmin permission is required');
  const authority = Object.freeze({ actorId, sessionId, reason, correlationId }) as PlatformAuthority;
  issuedPlatformAuthorities.add(authority);
  return authority;
}

function assertNoEscalation(nextMode: AuthorizedExecutionContext['mode'], tenantId?: string) {
  const current = storage.getStore();
  if (!current) return;
  if (current.mode !== nextMode) throw new Error(`Nested execution escalation from ${current.mode} to ${nextMode} is forbidden`);
  if (current.mode === 'SYSTEM' && current.tenantId && tenantId && current.tenantId !== tenantId) throw new Error('Nested system execution cannot change tenant identity');
}

export function getAuthorizedExecutionContext() { return storage.getStore(); }

export async function runAuthBootstrapOperation<T>(policy: AuthBootstrapPolicy, key: string, operation: () => Promise<T>): Promise<T> {
  if (!authBootstrapPolicies.has(policy)) throw new Error('Unregistered authentication bootstrap policy');
  const normalized = required(key, 'bootstrap key').toLowerCase();
  if (authBootstrapStorage.getStore()) throw new Error('Nested authentication bootstrap is forbidden');
  if (policy.endsWith('_BY_EMAIL') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Valid normalized login email is required');
  if (policy === 'SESSION_USER_BY_ID' && !Types.ObjectId.isValid(normalized)) throw new Error('Valid session user ID is required');
  return authBootstrapStorage.run({ policy, key: normalized }, async () => await operation());
}

export function assertAuthBootstrapQuery(policy: AuthBootstrapPolicy, query: any) {
  const context = authBootstrapStorage.getStore();
  if (!context || context.policy !== policy) throw new Error(`Authentication bootstrap context for ${policy} is required`);
  const expectedField = policy.endsWith('_BY_EMAIL') ? 'email' : '_id';
  const keys = Object.keys(query || {});
  if (keys.length !== 1 || keys[0] !== expectedField || typeof query[expectedField] !== 'string' && !Types.ObjectId.isValid(query[expectedField])) throw new Error('Authentication bootstrap query is not exact');
  if (String(query[expectedField]).toLowerCase() !== context.key) throw new Error('Authentication bootstrap query does not match bound identity');
}

/** Narrow mutation exception for the two pre-session User operations. */
export function assertAuthBootstrapDocument(document: any): boolean {
  const context = authBootstrapStorage.getStore();
  if (!context) return false;
  if (document?.constructor?.modelName !== 'User') throw new Error('Authentication bootstrap mutation is restricted to User');
  if (String(document.email || '').trim().toLowerCase() !== context.key) throw new Error('Authentication bootstrap document does not match bound identity');
  if (context.policy === 'REGISTER_USER_BY_EMAIL') {
    if (!document.isNew || !document.tenantId) throw new Error('Registration requires a new tenant-bound User');
    if (document.isSuperAdmin) throw new Error('Public registration cannot create platform SuperAdmin');
    return true;
  }
  if (context.policy === 'LOGIN_USER_BY_EMAIL') {
    if (document.isNew) throw new Error('Login bootstrap cannot create User');
    const modified = document.modifiedPaths().filter((path: string) => path !== 'lastLoginAt');
    if (modified.length) throw new Error('Login bootstrap may only update lastLoginAt');
    return true;
  }
  throw new Error(`Authentication bootstrap policy ${context.policy} cannot mutate User`);
}

export async function runAuthorizedSystemOperation<T>(authority: SystemAuthority, params: {
  kind: SystemOperationKind;
  reason: string;
  correlationId: string;
  tenantId?: string;
}, operation: () => Promise<T>): Promise<T> {
  if (!authority || !issuedSystemAuthorities.has(authority as object)) throw new Error('Trusted internal system authority is required');
  if (!kinds.has(params.kind)) throw new Error(`Unregistered system operation kind: ${params.kind}`);
  const tenantId = params.tenantId?.trim();
  if (tenantId && !Types.ObjectId.isValid(tenantId)) throw new Error('Authorized system tenantId is invalid');
  assertNoEscalation('SYSTEM', tenantId);
  return storage.run({ mode: 'SYSTEM', kind: params.kind, principal: authority.principal, reason: required(params.reason, 'reason'), correlationId: required(params.correlationId, 'correlationId'), tenantId }, async () => await operation());
}

export async function runAuthorizedPlatformOperation<T>(authority: PlatformAuthority, params: {
  reason: string;
  correlationId: string;
  targetTenantId?: string;
}, operation: () => Promise<T>): Promise<T> {
  if (!authority || !issuedPlatformAuthorities.has(authority as object)) throw new Error('Trusted platform authority is required');
  if (required(params.reason, 'reason') !== authority.reason || required(params.correlationId, 'correlationId') !== authority.correlationId) throw new Error('Platform authority binding mismatch');
  const targetTenantId = params.targetTenantId?.trim();
  if (targetTenantId && !Types.ObjectId.isValid(targetTenantId)) throw new Error('Authorized platform targetTenantId is invalid');
  assertNoEscalation('PLATFORM', targetTenantId);
  return storage.run({ mode: 'PLATFORM', actorId: authority.actorId, sessionId: authority.sessionId, reason: authority.reason, correlationId: authority.correlationId }, async () => await operation());
}

/** Explicitly authorized test and deployment provisioning helper for global platform SuperAdmin identities. */
export async function runPlatformProvisioningOperation<T>(reason: string, operation: () => Promise<T>): Promise<T> {
  const normalizedReason = required(reason, 'provisioning reason');
  return storage.run(
    {
      mode: 'PLATFORM',
      actorId: new Types.ObjectId().toString(),
      sessionId: new Types.ObjectId().toString(),
      reason: normalizedReason,
      correlationId: `platform-provisioning-${Date.now()}`
    },
    async () => await operation()
  );
}

export function assertAuthorizedSystemQuery(kind: SystemOperationKind, tenantId?: unknown) {
  const context = storage.getStore();
  if (!context || context.mode !== 'SYSTEM' || context.kind !== kind) throw new Error(`Authorized SYSTEM context for ${kind} is required`);
  if (context.tenantId && (!tenantId || String(tenantId) !== context.tenantId)) throw new Error('System query tenant identity does not match authorized operation');
}

export function assertAuthorizedPlatformQuery() {
  const context = storage.getStore();
  if (!context || context.mode !== 'PLATFORM') throw new Error('Authorized PLATFORM context is required');
}

export function assertPublicReadPolicy(policy: PublicReadPolicy, query: any) {
  if (!publicPolicies.has(policy)) throw new Error(`Unregistered public read policy: ${policy}`);
  if (policy === 'CERTIFICATE_VERIFICATION') {
    const code = query?.verificationCode;
    if (!code || typeof code !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(code.trim())) {
      throw new Error('Public certificate verification requires an exact valid verificationCode predicate');
    }
  }
  if (policy === 'DOMAIN_RESOLUTION') {
    const field = typeof query?.customDomain === 'string' ? 'customDomain' : typeof query?.platformSubdomain === 'string' ? 'platformSubdomain' : null;
    if (!field || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(query[field])) throw new Error('Domain resolution requires one exact normalized hostname');
    const allowed = new Set([field, 'status']);
    if (Object.keys(query).some((key) => !allowed.has(key))) throw new Error('Domain resolution predicate is too broad');
  }
}
