import { Queue } from 'bullmq';
import { IntegrationOperationModel, LiveClassRecordingModel, runAuthorizedSystemOperation, SystemAuthority } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { randomUUID } from 'crypto';

export async function enqueuePendingIntegrationOperations(authority: SystemAuthority, queue: Queue): Promise<number> {
  const dueRecordings = await runAuthorizedSystemOperation(authority, { kind: 'INTEGRATION_WORKER', reason: 'Discover due recording work', correlationId: randomUUID() }, () => LiveClassRecordingModel.find({
    state: { $in: ['AWAITING_PROCESSING', 'PROCESSING', 'FAILED_RETRYABLE'] },
    nextRetryAt: { $lte: new Date() }
  }).setOptions({ authorizedSystemOperation: 'INTEGRATION_WORKER' }).limit(100).select('_id tenantId connectionId state stateVersion').lean());
  for (const recording of dueRecordings) {
    const slot = Math.floor(Date.now() / 60_000);
    const tenantId = recording.tenantId.toString();
    await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () => IntegrationOperationModel.findOneAndUpdate(
      { idempotencyKey: `SYNC_RECORDING:${recording._id}:${recording.stateVersion}:${slot}` },
      { $setOnInsert: { tenantId: recording.tenantId, provider: 'ZOOM', connectionId: recording.connectionId, operationType: 'SYNC_RECORDING', canonicalResourceType: 'LiveClassRecording', canonicalResourceId: recording._id.toString(), status: 'PENDING', attempts: 0, payload: { reason: 'scheduled-reconciliation' }, correlationId: `zoom-recording-${recording._id}-${slot}` } },
      { upsert: true, setDefaultsOnInsert: true }
    ));
  }
  const staleBefore = new Date(Date.now() - 2 * 60_000);
  const stale = await runAuthorizedSystemOperation(authority, { kind: 'INTEGRATION_WORKER', reason: 'Discover stale integration leases', correlationId: randomUUID() }, () => IntegrationOperationModel.find(
    { status: 'PROCESSING', startedAt: { $lte: staleBefore } }
  ).setOptions({ authorizedSystemOperation: 'INTEGRATION_WORKER' }).select('_id tenantId').limit(100).lean());
  for (const item of stale) { const tenantId = item.tenantId.toString(); await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () => IntegrationOperationModel.updateOne({ _id: item._id, tenantId, status: 'PROCESSING', startedAt: { $lte: staleBefore } }, { $set: { status: 'RETRYABLE', nextRetryAt: new Date(), errorCategory: 'INTERNAL', errorDetails: 'Recovered stale worker lease' } })); }
  const due = await runAuthorizedSystemOperation(authority, { kind: 'INTEGRATION_WORKER', reason: 'Discover due integration operations', correlationId: randomUUID() }, () => IntegrationOperationModel.find({
    status: { $in: ['PENDING', 'RETRYABLE'] },
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }]
  }).setOptions({ authorizedSystemOperation: 'INTEGRATION_WORKER' }).sort({ createdAt: 1 }).limit(100).select('_id tenantId').lean());
  for (const operation of due) {
    const jobId = `integration_${operation._id}`;
    const existing = await queue.getJob(jobId);
    if (existing && (await existing.getState()) === 'failed') await existing.remove();
    await queue.add('integration.operation', { operationId: operation._id.toString(), tenantId: operation.tenantId.toString() }, {
      jobId, attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 }, removeOnComplete: 1000, removeOnFail: false
    });
  }
  return due.length + dueRecordings.length;
}
