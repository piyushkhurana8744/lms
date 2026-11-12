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
import { CertificateService } from './services/certificate.service';
import { authorizeInternalSystemCaller, PaymentModel, RefundModel, IntegrationOperationModel, ClassModel, IntegrationConnectionModel, runAuthorizedSystemOperation } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { NotificationService } from './services/notification.service';
import { AutomationService } from './services/automation.service';
import { LiveClassOrchestratorService } from './services/integrations/orchestration/liveClassOrchestrator.service';
import { IntegrationProviderRegistry } from './services/integrations/registry/providerRegistry.service';
import { ZoomRecordingService } from './services/integrations/orchestration/zoomRecording.service';

function authorizeInternalWorker(value?: string) {
  return authorizeInternalSystemCaller(value, 'internal-api-worker');
}

export function createApp(): Express {
  const app = express();

  // Baseline Security Middleware
  app.use(helmet());
  app.use(cors(corsOptions));
  const razorpayWebhookLimiter = rateLimiter(process.env.NODE_ENV === 'test' ? 10_000 : 100, 60 * 1000);
  app.post('/api/v1/webhooks/payments/razorpay', razorpayWebhookLimiter, express.raw({ type: 'application/json', limit: '1mb' }), async (req, res, next) => {
    try {
      const signature = String(req.header('x-razorpay-signature') || '');
      const eventId = req.header('x-razorpay-event-id') || undefined;
      const result = await FinanceService.processRazorpayWebhook(req.body as Buffer, signature, eventId);
      res.status(200).json({ success: true, data: result, error: null });
    } catch (error: any) {
      // This is an unauthenticated provider boundary. Do not disclose whether a
      // supplied provider identifier exists, belongs to a tenant, or collided.
      if (error?.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode === 403 ? 401 : 400).json({ success: false, data: null, error: 'Webhook rejected' });
      }
      next(error);
    }
  });
  app.use(express.json({
    limit: '50mb',
    verify: (req: any, _res, buffer) => { req.rawBody = buffer.toString('utf8'); }
  }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.post('/api/v1/internal/finance/:kind/:id', async (req, res, next) => {
    try {
      const authority = authorizeInternalWorker(req.header('x-internal-worker-secret'));
      if (!authority) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const tenantId = req.header('x-tenant-id') || '';
      if (!/^[a-f\d]{24}$/i.test(tenantId)) return res.status(400).json({ success: false, error: 'Valid worker tenant binding required' });
      const kind = String(req.params.kind); const id = String(req.params.id);
      if (kind === 'receipt-artifact') {
        const result = await ReceiptArtifactService.generateTrusted(id, authority, tenantId);
        return res.json({ success: true, data: { status: result.artifact?.status }, error: null });
      }
      if (kind === 'certificate-artifact') {
        const result = await CertificateService.trustedGenerate(id, authority, tenantId);
        return res.json({ success: true, data: { status: result.artifact?.status }, error: null });
      }
      const Model: any = kind === 'payment-reconcile' ? PaymentModel : kind === 'refund-reconcile' ? RefundModel : null;
      if (!Model) return res.status(404).json({ success: false, error: 'Unknown finance worker operation' });
      const record: any = await runAuthorizedSystemOperation(authority, { kind: 'FINANCE_RECONCILIATION', reason: `Resolve ${kind} record tenant`, correlationId: id }, () =>
        Model.findById(id).setOptions({ authorizedSystemOperation: 'FINANCE_RECONCILIATION' }).select('tenantId').lean()
      );
      if (!record) return res.status(404).json({ success: false, error: 'Finance record not found' });
      if (record.tenantId.toString() !== tenantId) return res.status(400).json({ success: false, error: 'Finance record tenant mismatch' });
      const data = await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () =>
        kind === 'payment-reconcile' ? FinanceService.reconcilePayment(id, record._id.toString()) : FinanceService.reconcileRefund(id, record._id.toString())
      );
      return res.json({ success: true, data, error: null });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/notifications/deliveries/:id/process', async (req, res, next) => {
    try {
      const authority = authorizeInternalWorker(req.header('x-internal-worker-secret'));
      if (!authority) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const tenantId = req.header('x-tenant-id') || '';
      if (!/^[a-f\d]{24}$/i.test(tenantId)) return res.status(400).json({ success: false, error: 'Valid worker tenant binding required' });
      const delivery = await NotificationService.processDelivery(String(req.params.id), authority, tenantId);
      return res.json({ success: true, data: delivery ? { status: delivery.status } : null, error: null });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/notifications/finance-events/:eventId/consume', async (req, res, next) => {
    try {
      const authority = authorizeInternalWorker(req.header('x-internal-worker-secret'));
      if (!authority) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const tenantId = req.header('x-tenant-id') || '';
      if (!/^[a-f\d]{24}$/i.test(tenantId)) return res.status(400).json({ success: false, error: 'Valid worker tenant binding required' });
      const notification = await NotificationService.consumeFinanceOutboxEvent(String(req.params.eventId), authority, tenantId);
      return res.json({ success: true, data: { notificationId: notification?._id.toString() }, error: null });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/notifications/intents/:eventId/consume', async (req, res, next) => {
    try { const authority = authorizeInternalWorker(req.header('x-internal-worker-secret')); if (!authority) return res.status(401).json({ success: false, error: 'Unauthorized worker' }); const tenantId = req.header('x-tenant-id') || ''; if (!/^[a-f\d]{24}$/i.test(tenantId)) return res.status(400).json({ success: false, error: 'Valid worker tenant binding required' }); const intent = await NotificationService.consumeOutboxEvent(String(req.params.eventId), authority, tenantId); return res.json({ success: true, data: intent ? { status: intent.status } : null, error: null }); } catch (error) { return next(error); }
  });
  app.post('/api/v1/internal/automations/process', async (req, res, next) => {
    try { if (!authorizeInternalWorker(req.header('x-internal-worker-secret'))) return res.status(401).json({ success: false, error: 'Unauthorized worker' }); const event = await AutomationService.processNextEvent(); const recovered = await AutomationService.recoverDue(); return res.json({ success: true, data: { eventId: event?.eventId || null, recovered } }); } catch (error) { return next(error); }
  });
  if (process.env.NODE_ENV === 'test') {
    app.post('/api/v1/internal/integrations/test-connections', async (req, res, next) => {
      try {
        const authority = authorizeInternalWorker(req.header('x-internal-worker-secret'));
        if (!authority) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
        const { tenantId, provider, status, scopes = [], metadata = {} } = req.body || {};
        if (!tenantId || !/^[a-f\d]{24}$/i.test(tenantId)) return res.status(400).json({ success: false, error: 'Valid tenantId required' });
        const connection = await runAuthorizedSystemOperation(authority, { kind: 'INTEGRATION_WORKER', tenantId, reason: 'Test connection setup', correlationId: `test-conn-${tenantId}` }, () =>
          IntegrationConnectionModel.findOneAndUpdate(
            { tenantId, provider, scopeType: 'TENANT', userId: null, branchId: null },
            { $set: { status, scopes, metadata, lastErrorCategory: status === 'CONNECTED' ? null : status, lastErrorMessage: status === 'CONNECTED' ? null : `Deterministic ${status} state` } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          ).setOptions({ authorizedSystemOperation: 'INTEGRATION_WORKER' })
        );
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
      const authority = authorizeInternalWorker(req.header('x-internal-worker-secret'));
      if (!authority) return res.status(401).json({ success: false, error: 'Unauthorized worker' });
      const binding: any = await runAuthorizedSystemOperation(authority, { kind: 'INTEGRATION_WORKER', reason: 'Resolve integration operation tenant', correlationId: String(req.params.id) }, () => IntegrationOperationModel.findById(req.params.id).setOptions({ authorizedSystemOperation: 'INTEGRATION_WORKER' }).select('_id tenantId').lean());
      if (!binding?.tenantId) return res.status(404).json({ success: false, error: 'Integration operation not found' });
      const tenantId = binding.tenantId.toString();
      const operation: any = await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () => IntegrationOperationModel.findOne({ _id: binding._id, tenantId }));
      if (!operation) return res.status(404).json({ success: false, error: 'Integration operation tenant binding rejected' });
      if (operation.status === 'COMPLETED') return res.json({ success: true, data: { status: 'COMPLETED' }, error: null });
      if (operation.operationType === 'SYNC_RECORDING') {
        operation.status = 'PROCESSING'; operation.startedAt = new Date(); operation.attempts += 1; await operation.save();
        const data = await ZoomRecordingService.sync(operation.canonicalResourceId);
        operation.status = 'COMPLETED'; operation.completedAt = new Date(); operation.nextRetryAt = null;
        operation.errorCategory = null; operation.errorDetails = null; await operation.save();
        return res.json({ success: true, data: { id: data._id.toString(), state: data.state }, error: null });
      }
      const cls: any = await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () => ClassModel.findOne({ _id: operation.canonicalResourceId, tenantId }));
      if (!cls) return res.status(404).json({ success: false, error: 'Canonical class not found' });
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
      const authority = authorizeInternalWorker(req.header('x-internal-worker-secret'));
      if (authority) {
        const binding: any = await runAuthorizedSystemOperation(authority, { kind: 'INTEGRATION_WORKER', reason: 'Resolve failed integration operation tenant', correlationId: `failure:${String(req.params.id)}` }, () => IntegrationOperationModel.findById(req.params.id).setOptions({ authorizedSystemOperation: 'INTEGRATION_WORKER' }).select('_id tenantId').lean()).catch(() => null);
        if (binding?.tenantId) {
          const tenantId = binding.tenantId.toString();
          await tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () => IntegrationOperationModel.updateOne({ _id: binding._id, tenantId, status: { $ne: 'COMPLETED' } }, { $set: { status: 'RETRYABLE', errorCategory: 'INTERNAL', errorDetails: String((error as any)?.message || error).slice(0, 500), nextRetryAt: new Date(Date.now() + 1_000) } })).catch(() => undefined);
        }
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
