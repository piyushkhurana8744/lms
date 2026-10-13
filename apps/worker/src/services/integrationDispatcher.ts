import { Queue } from 'bullmq';
import { IntegrationOperationModel } from '@edtech/database';

export async function enqueuePendingIntegrationOperations(queue: Queue): Promise<number> {
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
  return due.length;
}
