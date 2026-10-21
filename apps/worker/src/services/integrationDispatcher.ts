import { Queue } from 'bullmq';
import { IntegrationOperationModel, LiveClassRecordingModel } from '@edtech/database';

export async function enqueuePendingIntegrationOperations(queue: Queue): Promise<number> {
  const dueRecordings = await LiveClassRecordingModel.find({
    state: { $in: ['AWAITING_PROCESSING', 'PROCESSING', 'FAILED_RETRYABLE'] },
    nextRetryAt: { $lte: new Date() }
  }).setOptions({ bypassTenantFilter: true }).limit(100);
  for (const recording of dueRecordings) {
    const slot = Math.floor(Date.now() / 60_000);
    await IntegrationOperationModel.findOneAndUpdate(
      { idempotencyKey: `SYNC_RECORDING:${recording._id}:${recording.stateVersion}:${slot}` },
      { $setOnInsert: { tenantId: recording.tenantId, provider: 'ZOOM', connectionId: recording.connectionId, operationType: 'SYNC_RECORDING', canonicalResourceType: 'LiveClassRecording', canonicalResourceId: recording._id.toString(), status: 'PENDING', attempts: 0, payload: { reason: 'scheduled-reconciliation' }, correlationId: `zoom-recording-${recording._id}-${slot}` } },
      { upsert: true, setDefaultsOnInsert: true }
    ).setOptions({ bypassTenantFilter: true });
  }
  const staleBefore = new Date(Date.now() - 2 * 60_000);
  await IntegrationOperationModel.updateMany(
    { status: 'PROCESSING', startedAt: { $lte: staleBefore } },
    { $set: { status: 'RETRYABLE', nextRetryAt: new Date(), errorCategory: 'INTERNAL', errorDetails: 'Recovered stale worker lease' } }
  ).setOptions({ bypassTenantFilter: true });
  const due = await IntegrationOperationModel.find({
    status: { $in: ['PENDING', 'RETRYABLE'] },
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }]
  }).setOptions({ bypassTenantFilter: true }).sort({ createdAt: 1 }).limit(100);
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
