import { Worker, Job, Queue } from 'bullmq';
import { createRedisConnection } from './config/redis';
import { connectDatabase, disconnectDatabase } from '@edtech/database';
import { ENV } from './config/env';
import { logger } from '@edtech/utils';
import { APP_CONFIG } from '@edtech/config';
import { EmailService } from './services/email/email.service';
import { dispatchOutboxBatch } from './services/outboxDispatcher';
import { enqueueReconciliationBatch, releaseReconciliation } from './services/financeReconciliation';
import { enqueuePendingNotificationDeliveries, recoverNotificationIntents } from './services/notificationDispatcher';
import { enqueuePendingIntegrationOperations } from './services/integrationDispatcher';
import { IntegrationOperationModel } from '@edtech/database';

logger.info('[Worker] Initializing DIDM LMS Worker Application...');

const workers: Worker[] = [];
let outboxTimer: ReturnType<typeof setInterval> | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let reconciliationTimer: ReturnType<typeof setInterval> | undefined;
let notificationTimer: ReturnType<typeof setInterval> | undefined;
let automationTimer: ReturnType<typeof setInterval> | undefined;
let integrationTimer: ReturnType<typeof setInterval> | undefined;

async function bootstrap() {
  try {
    await connectDatabase(ENV.MONGO_URI);
    const redis = createRedisConnection();
    const emailQueue = new Queue(APP_CONFIG.QUEUES.EMAIL, { connection: redis as any });
    const reconciliationQueue = new Queue(APP_CONFIG.QUEUES.FINANCE_RECONCILIATION, { connection: redis as any });
    const notificationQueue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection: redis as any });
    const integrationQueue = new Queue((APP_CONFIG.QUEUES as any).INTEGRATIONS || 'queue-integrations', { connection: redis as any });
    const publishHeartbeat = async () => redis.set('finance:worker:heartbeat', Date.now().toString(), 'EX', 60);
    await publishHeartbeat();
    heartbeatTimer = setInterval(() => void publishHeartbeat().catch((error) => logger.error('[Worker] Heartbeat failed', error)), 15_000);

    const invokeInternal = async (kind: string, id: string) => {
      const response = await fetch(`${ENV.API_INTERNAL_URL}/api/v1/internal/finance/${kind}/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'x-internal-worker-secret': ENV.INTERNAL_WORKER_SECRET } });
      if (!response.ok) throw new Error(`Internal finance operation failed (${response.status})`);
    };
    const consumeFinanceNotification = async (eventId: string, eventType: string) => {
      if (eventType !== 'payment.success') return;
      const response = await fetch(`${ENV.API_INTERNAL_URL}/api/v1/internal/notifications/finance-events/${encodeURIComponent(eventId)}/consume`, { method: 'POST', headers: { 'x-internal-worker-secret': ENV.INTERNAL_WORKER_SECRET } });
      if (!response.ok) throw new Error(`Finance notification consumption failed (${response.status})`);
    };
    const dispatchOutbox = () => dispatchOutboxBatch(emailQueue, (receiptId) => invokeInternal('receipt-artifact', receiptId), ENV.FINANCE_RECONCILIATION_BATCH_SIZE, consumeFinanceNotification);
    await dispatchOutbox();
    outboxTimer = setInterval(() => void dispatchOutbox(), 10_000);

    const scheduleReconciliation = async () => {
      const count = await enqueueReconciliationBatch(reconciliationQueue, { paymentStaleMinutes: ENV.PAYMENT_RECONCILIATION_STALE_MINUTES, refundStaleMinutes: ENV.REFUND_RECONCILIATION_STALE_MINUTES, batchSize: ENV.FINANCE_RECONCILIATION_BATCH_SIZE });
      await redis.set('finance:reconciliation:heartbeat', Date.now().toString(), 'EX', 90);
      return count;
    };
    await scheduleReconciliation();
    reconciliationTimer = setInterval(() => void scheduleReconciliation().catch((error) => logger.error('[Worker:Finance] Reconciliation scheduling failed', error)), ENV.FINANCE_RECONCILIATION_INTERVAL_MS);
    const consumeIntent = async (eventId: string) => { const response = await fetch(`${ENV.API_INTERNAL_URL}/api/v1/internal/notifications/intents/${encodeURIComponent(eventId)}/consume`, { method: 'POST', headers: { 'x-internal-worker-secret': ENV.INTERNAL_WORKER_SECRET } }); if (!response.ok) throw new Error(`Notification intent consumption failed (${response.status})`); };
    const scheduleNotifications = async () => { await recoverNotificationIntents(consumeIntent); return enqueuePendingNotificationDeliveries(notificationQueue); };
    await scheduleNotifications();
    notificationTimer = setInterval(() => void scheduleNotifications().catch((error) => logger.error('[Worker:Notification] Scheduling failed', error)), 10_000);
    const scheduleAutomations = async () => { const response = await fetch(`${ENV.API_INTERNAL_URL}/api/v1/internal/automations/process`, { method: 'POST', headers: { 'x-internal-worker-secret': ENV.INTERNAL_WORKER_SECRET } }); if (!response.ok) throw new Error(`Automation processing failed (${response.status})`); };
    await scheduleAutomations();
    automationTimer = setInterval(() => void scheduleAutomations().catch((error) => logger.error('[Worker:Automation] Recovery poll failed', error)), 5_000);
    const scheduleIntegrations = async () => enqueuePendingIntegrationOperations(integrationQueue);
    await scheduleIntegrations();
    integrationTimer = setInterval(() => void scheduleIntegrations().catch((error) => logger.error('[Worker:Integrations] Scheduling failed', error)), 5_000);

    const integrationWorker = new Worker(APP_CONFIG.QUEUES.INTEGRATIONS, async (job: Job) => {
      const operationId = String(job.data.operationId || '');
      const tenantId = String(job.data.tenantId || '');
      const operation = await IntegrationOperationModel.findOne({ _id: operationId, tenantId }).setOptions({ bypassTenantFilter: true });
      if (!operation) throw new Error('Integration operation tenant binding rejected');
      const response = await fetch(`${ENV.API_INTERNAL_URL}/api/v1/internal/integrations/operations/${encodeURIComponent(operationId)}/process`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-worker-secret': ENV.INTERNAL_WORKER_SECRET }
      });
      if (!response.ok) throw new Error(`Internal integration operation failed (${response.status})`);
    }, { connection: redis as any, concurrency: 3 });
    integrationWorker.on('failed', async (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
        await IntegrationOperationModel.updateOne({ _id: job.data.operationId, status: { $ne: 'COMPLETED' } }, {
          $set: { status: 'FAILED', errorCategory: 'INTERNAL', errorDetails: String(error.message).slice(0, 500), nextRetryAt: null }
        }).setOptions({ bypassTenantFilter: true });
      }
    });
    workers.push(integrationWorker);

    const notificationWorker = new Worker(APP_CONFIG.QUEUES.NOTIFICATIONS, async (job: Job) => {
      const deliveryId = String(job.data.deliveryId || '');
      const response = await fetch(`${ENV.API_INTERNAL_URL}/api/v1/internal/notifications/deliveries/${encodeURIComponent(deliveryId)}/process`, { method: 'POST', headers: { 'x-internal-worker-secret': ENV.INTERNAL_WORKER_SECRET } });
      if (!response.ok) throw new Error(`Internal notification delivery failed (${response.status})`);
    }, { connection: redis as any, concurrency: 5 });
    workers.push(notificationWorker);

    const reconciliationWorker = new Worker(APP_CONFIG.QUEUES.FINANCE_RECONCILIATION, async (job: Job) => {
      const { kind, id } = job.data as { kind: 'payment' | 'refund'; id: string };
      try {
        await invokeInternal(`${kind}-reconcile`, id);
        await releaseReconciliation(kind, id, ENV.FINANCE_RECONCILIATION_INTERVAL_MS);
      } catch (error: any) {
        if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) await releaseReconciliation(kind, id, ENV.FINANCE_RECONCILIATION_INTERVAL_MS, String(error?.message || error));
        throw error;
      }
    }, { connection: redis as any, concurrency: ENV.FINANCE_RECONCILIATION_CONCURRENCY });
    workers.push(reconciliationWorker);

    // 1. Email & Auth Events Worker Processor
    const emailWorker = new Worker(
      APP_CONFIG.QUEUES.EMAIL,
      async (job: Job) => {
        logger.info(`[Worker:Email] Processing job '${job.name}' (ID: ${job.id})`);
        
        switch (job.name) {
          case 'user.registered': {
            const { email, name, verificationToken } = job.data;
            await EmailService.sendEmail({
              to: email,
              subject: 'Verify your DIDM LMS Account',
              html: `<h1>Welcome to DIDM, ${name}!</h1><p>Your email verification token is: <strong>${verificationToken}</strong></p>`
            });
            break;
          }

          case 'password.reset': {
            const { email, resetToken } = job.data;
            await EmailService.sendEmail({
              to: email,
              subject: 'Password Reset Request — DIDM LMS',
              html: `<p>Use the following token to reset your password: <strong>${resetToken}</strong></p>`
            });
            break;
          }

          case 'session.revoked': {
            const { userId, reason } = job.data;
            logger.warn(`[Worker:Security] Security alert for user ${userId}: ${reason}`);
            break;
          }

          case 'payment.success':
          case 'receipt.generated':
          case 'refund.success':
          case 'payment.reversed': {
            const { email, studentName, paymentNumber, receiptNumber, refundNumber, amountMinor, currency } = job.data;
            const reference = receiptNumber || refundNumber || paymentNumber || '';
            const amount = Number.isInteger(amountMinor) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR' }).format(amountMinor / 100) : '';
            await EmailService.sendEmail({ to: email, subject: `DIDM finance update — ${job.name}`, html: `<p>Hello ${studentName || 'Student'},</p><p>${job.name} ${reference} ${amount}.</p><p>You can view the authoritative record in your student finance area.</p>` });
            break;
          }

          default:
            logger.info(`[Worker:Email] Handled event '${job.name}'`);
        }
      },
      { connection: redis as any, concurrency: 5 }
    );

    emailWorker.on('completed', (job) => {
      logger.info(`[Worker:Email] Job '${job.name}' (${job.id}) completed.`);
    });

    emailWorker.on('failed', (job, err) => {
      logger.error(`[Worker:Email] Job '${job?.name}' (${job?.id}) failed: ${err.message}`, err);
    });

    workers.push(emailWorker);
    logger.info('[Worker] All queue workers successfully initialized.');

  } catch (error) {
    logger.error('[Worker Fatal Error] Startup failed:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  logger.info(`[Worker] ${signal} received. Closing workers and database connections...`);
  try {
    if (outboxTimer) clearInterval(outboxTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (reconciliationTimer) clearInterval(reconciliationTimer);
    if (notificationTimer) clearInterval(notificationTimer);
    if (automationTimer) clearInterval(automationTimer);
    if (integrationTimer) clearInterval(integrationTimer);
    await Promise.all(workers.map((w) => w.close()));
    await disconnectDatabase();
    logger.info('[Worker] Shutdown complete.');
    process.exit(0);
  } catch (err) {
    logger.error('[Worker Shutdown Error]', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap();
