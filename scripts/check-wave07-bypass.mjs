import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const migrated = [
  'apps/worker/src/services/outboxDispatcher.ts',
  'apps/worker/src/services/notificationDispatcher.ts',
  'apps/worker/src/services/integrationDispatcher.ts',
  'apps/worker/src/index.ts',
  'apps/api/src/services/notification.service.ts',
  'apps/worker/src/services/financeReconciliation.ts',
  'apps/api/src/services/receiptArtifact.service.ts',
  'apps/api/src/app.ts',
  'apps/api/src/services/automation.service.ts',
  'apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts',
  'apps/api/src/services/integrations/orchestration/zoomRecording.service.ts',
  'apps/api/src/services/finance.service.ts',
  'apps/api/src/services/auth.service.ts',
  'apps/api/src/services/certificate.service.ts',
  'apps/api/src/scripts/migratePhase18BranchAccess.ts'
];
const violations = migrated.filter((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').includes('bypassTenantFilter'));
const migratedSites = [
  ['apps/worker/src/services/outboxDispatcher.ts', 'claimOutboxEvent', 'outbox'],
  ['apps/worker/src/services/outboxDispatcher.ts', 'dispatchClaimedEvent', 'outbox'],
  ['apps/worker/src/services/notificationDispatcher.ts', 'enqueuePendingNotificationDeliveries', 'notification'],
  ['apps/worker/src/services/integrationDispatcher.ts', 'enqueuePendingIntegrationOperations:recording-discovery', 'integration'],
  ['apps/worker/src/services/integrationDispatcher.ts', 'enqueuePendingIntegrationOperations:operation-upsert', 'integration'],
  ['apps/worker/src/services/integrationDispatcher.ts', 'enqueuePendingIntegrationOperations:lease-recovery', 'integration'],
  ['apps/worker/src/services/integrationDispatcher.ts', 'enqueuePendingIntegrationOperations:operation-discovery', 'integration'],
  ['apps/worker/src/index.ts', 'integrationWorker:ownership-check', 'integration'],
  ['apps/worker/src/index.ts', 'integrationWorker:failed-finalization', 'integration'],
  ['apps/api/src/app.ts', 'internal integration operation processing', 'integration'],
  ['apps/api/src/services/notification.service.ts', 'createIntent:recipient-and-preference-resolution', 'notification'],
  ['apps/api/src/services/notification.service.ts', 'createIntent:deduplication-reload', 'notification'],
  ['apps/api/src/services/notification.service.ts', 'consumeFinanceOutboxEvent', 'finance-outbox'],
  ['apps/api/src/services/notification.service.ts', 'claimDelivery', 'notification'],
  ['apps/api/src/services/notification.service.ts', 'processDelivery:tenant-owned-records', 'notification'],
  ['apps/api/src/app.ts', 'internal notification worker routes', 'notification'],
  ['apps/worker/src/services/financeReconciliation.ts', 'claimReconciliation', 'finance'],
  ['apps/worker/src/services/financeReconciliation.ts', 'releaseReconciliation', 'finance'],
  ['apps/api/src/app.ts', 'internal finance worker routes', 'finance'],
  ['apps/api/src/app.ts', 'test-connections integration route', 'integration'],
  ['apps/api/src/services/receiptArtifact.service.ts', 'generateTrusted', 'artifact'],
  ['apps/api/src/services/certificate.service.ts', 'trustedGenerate', 'artifact'],
  ['apps/api/src/services/automation.service.ts', 'processNextEvent', 'automation'],
  ['apps/api/src/services/automation.service.ts', 'runExecution', 'automation'],
  ['apps/api/src/services/automation.service.ts', 'recoverDue', 'automation'],
  ['apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts', 'persistVerifiedZoomEvent:connection-resolution', 'integration-webhook'],
  ['apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts', 'persistVerifiedZoomEvent:meeting-status-update', 'integration-webhook'],
  ['apps/api/src/services/integrations/orchestration/zoomRecording.service.ts', 'signalMeetingEnded', 'zoom-recording'],
  ['apps/api/src/services/integrations/orchestration/zoomRecording.service.ts', 'signalRecordingCompleted', 'zoom-recording'],
  ['apps/api/src/services/integrations/orchestration/zoomRecording.service.ts', 'enqueueSync', 'zoom-recording'],
  ['apps/api/src/services/integrations/orchestration/zoomRecording.service.ts', 'sync', 'zoom-recording'],
  ['apps/api/src/services/finance.service.ts', 'processRazorpayWebhook:order-resolution', 'finance-webhook'],
  ['apps/api/src/services/finance.service.ts', 'processRazorpayWebhook:refund-resolution', 'finance-webhook'],
  ['apps/api/src/services/auth.service.ts', 'impersonateUser:superadmin-resolution', 'platform-auth'],
  ['apps/api/src/services/auth.service.ts', 'impersonateUser:target-user-resolution', 'platform-auth'],
  ['apps/api/src/services/auth.service.ts', 'exitImpersonation:superadmin-resolution', 'platform-auth'],
  ['apps/api/src/services/certificate.service.ts', 'verify:public-credential-lookup', 'public-verification'],
  ['apps/api/src/scripts/migratePhase18BranchAccess.ts', 'main:branch-access-migration', 'database-migration']
].map(([file, fn, domain]) => ({ file, function: fn, domain, previousRawBypass: true, newAuthorizedMechanism: 'opaque SystemAuthority/PlatformAuthority + authorizedSystemOperation/TENANT re-entry/publicReadPolicy', trustedCaller: 'verified credential / session / exact verification code', tenantReentryBehavior: 'global discovery is identifier-only; tenant-owned reads and writes bind tenantId', negativeTest: 'authorized-system-context and batch integration suites', status: 'MIGRATED' }));

function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? (['dist', 'node_modules', '__tests__'].includes(entry.name) ? [] : files(resolve(dir, entry.name))) : entry.name.endsWith('.ts') ? [resolve(dir, entry.name)] : []); }
const root = resolve(new URL('..', import.meta.url).pathname);
const pending = [...files(resolve(root, 'apps/api/src')), ...files(resolve(root, 'apps/worker/src'))].flatMap((file) => readFileSync(file, 'utf8').split('\n').flatMap((line, index) => line.includes('bypassTenantFilter') ? [{ file: relative(root, file), function: `line:${index + 1}`, domain: relative(root, file).split('/').slice(-2, -1)[0], previousRawBypass: true, newAuthorizedMechanism: null, trustedCaller: null, tenantReentryBehavior: null, negativeTest: null, status: 'PENDING' }] : []));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ generatedBy: 'scripts/check-wave07-bypass.mjs', productionDefinition: 'apps/api/src and apps/worker/src TypeScript excluding tests and generated output', baselineCount: 45, currentRawBypassCount: pending.length, records: [...migratedSites, ...pending] }, null, 2));
  process.exit(violations.length || pending.length ? 1 : 0);
}
if (violations.length || pending.length) {
  const filesWithPendingBypass = [...new Set(pending.map((record) => record.file))];
  console.error(`Raw tenant bypass is forbidden in production modules:\n${[...new Set([...violations, ...filesWithPendingBypass])].join('\n')}`);
  process.exit(1);
}
console.log(`Wave 0.7 production bypass check passed (all API and worker TypeScript modules scanned; ${migrated.length} migration-register modules verified).`);
