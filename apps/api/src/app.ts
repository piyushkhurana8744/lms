import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors';
import { requestLogger } from './middleware/requestLogger.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import v1Router from './routes/v1';
import { FinanceService } from './services/finance.service';
import { ReceiptArtifactService } from './services/receiptArtifact.service';
import { PaymentModel, RefundModel, IntegrationOperationModel, ClassModel, IntegrationConnectionModel } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import crypto from 'crypto';
import { NotificationService } from './services/notification.service';
import { AutomationService } from './services/automation.service';
import { LiveClassOrchestratorService } from './services/integrations/orchestration/liveClassOrchestrator.service';
import { IntegrationProviderRegistry } from './services/integrations/registry/providerRegistry.service';
import { ZoomRecordingService } from './services/integrations/orchestration/zoomRecording.service';

function authorizeInternalWorker(value?: string): boolean {
  const expected = process.env.INTERNAL_WORKER_SECRET || '';
  if (!expected || !value) return false;
  const a = Buffer.from(expected); const b = Buffer.from(value);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createApp(): Express {
  const app = express();

  // Baseline Security Middleware
  app.use(helmet());
  app.use(cors(corsOptions));
  app.post('/api/v1/webhooks/payments/razorpay', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
    try {
      const signature = String(req.header('x-razorpay-signature') || '');
      const eventId = req.header('x-razorpay-event-id') || undefined;
      const result = await FinanceService.processRazorpayWebhook(req.body as Buffer, signature, eventId);
      res.status(200).json({ success: true, data: result, error: null });
    } catch (error) { next(error); }
  });
  app.use(express.json({
    limit: '50mb',
    verify: (req: any, _res, buffer) => { req.rawBody = buffer.toString('utf8'); }
  }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.post('/api/v1/internal/finance/:kind/:id', async (req, res, next) => {
    try {
      if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const kind = String(req.params.kind); const id = String(req.params.id);
      if (kind === 'receipt-artifact') {
        const result = await ReceiptArtifactService.generateTrusted(id);
        return res.json({ success: true, data: { status: result.artifact?.status }, error: null });
      }
      const Model: any = kind === 'payment-reconcile' ? PaymentModel : kind === 'refund-reconcile' ? RefundModel : null;
      if (!Model) return res.status(404).json({ success: false, error: 'Unknown finance worker operation' });
      const record: any = await Model.findById(id).setOptions({ bypassTenantFilter: true }).select('tenantId');
      if (!record) return res.status(404).json({ success: false, error: 'Finance record not found' });
      const tenantId = record.tenantId.toString();
      const data = await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: 'finance-worker', isPlatformContext: false, allowedTenantIds: [tenantId] }, () =>
        kind === 'payment-reconcile' ? FinanceService.reconcilePayment(id, record._id.toString()) : FinanceService.reconcileRefund(id, record._id.toString())
      );
      return res.json({ success: true, data, error: null });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/notifications/deliveries/:id/process', async (req, res, next) => {
    try {
      if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const delivery = await NotificationService.processDelivery(String(req.params.id));
      return res.json({ success: true, data: delivery ? { status: delivery.status } : null, error: null });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/notifications/finance-events/:eventId/consume', async (req, res, next) => {
    try {
      if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const notification = await NotificationService.consumeFinanceOutboxEvent(String(req.params.eventId));
      return res.json({ success: true, data: { notificationId: notification?._id.toString() }, error: null });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/notifications/intents/:eventId/consume', async (req, res, next) => {
    try { if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' }); const intent = await NotificationService.consumeOutboxEvent(String(req.params.eventId)); return res.json({ success: true, data: intent ? { status: intent.status } : null, error: null }); } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/automations/process', async (req, res, next) => {
    try { if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' }); const event = await AutomationService.processNextEvent(); const recovered = await AutomationService.recoverDue(); return res.json({ success: true, data: { eventId: event?.eventId || null, recovered } }); } catch (error) { return next(error); }
  });
  if (process.env.NODE_ENV === 'test') {
    app.post('/api/v1/internal/integrations/test-connections', async (req, res, next) => {
      try {
        if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
        const { tenantId, provider, status, scopes = [], metadata = {} } = req.body || {};
        const connection = await IntegrationConnectionModel.findOneAndUpdate(
          { tenantId, provider, scopeType: 'TENANT', userId: null, branchId: null },
          { $set: { status, scopes, metadata, lastErrorCategory: status === 'CONNECTED' ? null : status, lastErrorMessage: status === 'CONNECTED' ? null : `Deterministic ${status} state` } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ).setOptions({ bypassTenantFilter: true });
        return res.json({ success: true, data: connection, error: null });
      } catch (error) { return next(error); }
    });
    app.post('/api/v1/internal/integrations/test-adapters/:provider/failure', (req, res) => {
      if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const adapter = IntegrationProviderRegistry.getDeterministicLiveAdapter(String(req.params.provider).toUpperCase() as any);
      adapter.setInjectedFailure(req.body?.failure || null);
      return res.json({ success: true, data: adapter.getDiagnostics(), error: null });
    });
    app.get('/api/v1/internal/integrations/test-adapters/:provider/diagnostics', (req, res) => {
      if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const adapter = IntegrationProviderRegistry.getDeterministicLiveAdapter(String(req.params.provider).toUpperCase() as any);
      return res.json({ success: true, data: adapter.getDiagnostics(), error: null });
    });
  }
  app.post('/api/v1/internal/integrations/operations/:id/process', async (req, res, next) => {
    try {
      if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const operation: any = await IntegrationOperationModel.findById(req.params.id).setOptions({ bypassTenantFilter: true });
      if (!operation) return res.status(404).json({ success: false, error: 'Integration operation not found' });
      if (operation.status === 'COMPLETED') return res.json({ success: true, data: { status: 'COMPLETED' }, error: null });
      if (operation.operationType === 'SYNC_RECORDING') {
        operation.status = 'PROCESSING'; operation.startedAt = new Date(); operation.attempts += 1; await operation.save();
        const data = await ZoomRecordingService.sync(operation.canonicalResourceId);
        operation.status = 'COMPLETED'; operation.completedAt = new Date(); operation.nextRetryAt = null;
        operation.errorCategory = null; operation.errorDetails = null; await operation.save();
        return res.json({ success: true, data: { id: data._id.toString(), state: data.state }, error: null });
      }
      const cls: any = await ClassModel.findOne({ _id: operation.canonicalResourceId, tenantId: operation.tenantId }).setOptions({ bypassTenantFilter: true });
      if (!cls) return res.status(404).json({ success: false, error: 'Canonical class not found' });
      const tenantId = operation.tenantId.toString();
      const actor = { userId: cls.instructorId.toString(), roles: ['INSTRUCTOR'], isHqActor: false, isSuperAdmin: false };
      operation.status = 'PROCESSING'; operation.startedAt = new Date(); operation.attempts += 1; await operation.save();
      const run = async () => {
        if (operation.operationType === 'CREATE_MEETING') return LiveClassOrchestratorService.createMeetingForClass(tenantId, operation.canonicalResourceId, { provider: operation.provider }, actor);
        if (operation.operationType === 'RESCHEDULE_MEETING') return LiveClassOrchestratorService.rescheduleMeetingForClass(tenantId, operation.canonicalResourceId, actor);
        if (operation.operationType === 'CANCEL_MEETING') return LiveClassOrchestratorService.cancelMeetingForClass(tenantId, operation.canonicalResourceId, operation.payload?.reason || 'Worker cancellation', actor);
        throw new Error(`Unsupported integration operation ${operation.operationType}`);
      };
      const data = await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: actor.userId, isPlatformContext: false, allowedTenantIds: [tenantId] }, run);
      operation.status = 'COMPLETED'; operation.completedAt = new Date(); operation.nextRetryAt = null;
      operation.errorCategory = null; operation.errorDetails = null; await operation.save();
      return res.json({ success: true, data, error: null });
    } catch (error) {
      const failed: any = await IntegrationOperationModel.findById(req.params.id).setOptions({ bypassTenantFilter: true }).catch(() => null);
      if (failed && failed.status !== 'COMPLETED') {
        failed.status = 'RETRYABLE'; failed.errorCategory = 'INTERNAL'; failed.errorDetails = String((error as any)?.message || error);
        failed.nextRetryAt = new Date(Date.now() + 1_000); await failed.save().catch(() => undefined);
      }
      return next(error);
    }
  });

  app.use(cookieParser());

  // Logging & Rate Limiting Infrastructure
  app.use(requestLogger);
  app.use(rateLimiter(process.env.NODE_ENV === 'test' ? 10_000 : 200, 15 * 60 * 1000)); // isolated E2E traverses every authorized route

  // Root Health Check Shortcut
  app.get('/', (req, res) => {
    res.json({
      name: 'DIDM LMS Platform API Engine',
      status: 'operational',
      version: 'v1',
      documentation: '/api/v1/health'
    });
  });

  // API Version 1 Router
  app.use('/api/v1', v1Router);

  // Centralized Global Error Handler
  app.use(errorHandler);

  return app;
}
