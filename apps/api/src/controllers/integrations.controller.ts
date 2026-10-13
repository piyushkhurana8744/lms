import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getWorkspaceContext } from '@edtech/utils';
import { IntegrationConnectionService } from '../services/integrations/orchestration/integrationConnection.service';
import { LiveClassOrchestratorService } from '../services/integrations/orchestration/liveClassOrchestrator.service';
import { AcademicClassroomSyncService } from '../services/integrations/orchestration/academicClassroomSync.service';
import { IntegrationOperationService } from '../services/integrations/orchestration/integrationOperation.service';
import { IntegrationWebhookService } from '../services/integrations/orchestration/integrationWebhook.service';
import { IntegrationProviderRegistry } from '../services/integrations/registry/providerRegistry.service';
import { IntegrationProvider } from '@edtech/types';
import { BranchActor } from '../services/branchAccess.service';
import { IntegrationOperationModel } from '@edtech/database';

const actor = (req: Request): BranchActor => {
  const user = (req as AuthenticatedRequest).user;
  return {
    userId: user?.userId || '',
    isSuperAdmin: user?.isSuperAdmin || false,
    roles: user?.roles || []
  };
};

const tenant = () => {
  const id = getWorkspaceContext().currentTenantId;
  if (!id) throw new Error('Tenant context required');
  return id;
};

const ok = (res: Response, data: any, status = 200) =>
  res.status(status).json({ success: true, data, error: null });

export class IntegrationsController {
  // Provider Metadata
  static getProviders(req: Request, res: Response) {
    const data = IntegrationProviderRegistry.getAllProviderMetadata();
    ok(res, data);
  }

  // Connections
  static listConnections(req: Request, res: Response, next: NextFunction) {
    IntegrationConnectionService.listConnections(tenant(), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static initiateOAuth(req: Request, res: Response, next: NextFunction) {
    const provider = String(req.params.provider).toUpperCase() as IntegrationProvider;
    IntegrationConnectionService.initiateOAuth(tenant(), provider, actor(req), req.body)
      .then((d) => ok(res, d))
      .catch(next);
  }

  static handleCallback(req: Request, res: Response, next: NextFunction) {
    const provider = String(req.params.provider).toUpperCase() as IntegrationProvider;
    const webUrl = (process.env.WEB_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    IntegrationConnectionService.handleOAuthCallback(req.query, provider)
      .then((d) => {
        return res.redirect(303, `${webUrl}/admin/settings/integrations?oauth=success&provider=${encodeURIComponent(d.provider)}`);
      })
      .catch(() => res.redirect(303, `${webUrl}/admin/settings/integrations?oauth=error&provider=${encodeURIComponent(provider)}&code=AUTHORIZATION_FAILED`));
  }

  static directConnect(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_INTEGRATION_TEST_ADAPTERS !== 'true') {
      return next(new Error('Direct integration credential connections are disabled; use OAuth authorization'));
    }
    const provider = String(req.params.provider).toUpperCase() as IntegrationProvider;
    IntegrationConnectionService.connectOrUpdate(tenant(), provider, req.body, actor(req))
      .then((d) => ok(res, IntegrationConnectionService.toDTO(d), 201))
      .catch(next);
  }

  static disconnect(req: Request, res: Response, next: NextFunction) {
    IntegrationConnectionService.disconnectConnection(tenant(), String(req.params.id), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static checkHealth(req: Request, res: Response, next: NextFunction) {
    IntegrationConnectionService.checkHealth(tenant(), String(req.params.id), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  // Operations
  static listOperations(req: Request, res: Response, next: NextFunction) {
    IntegrationOperationService.listOperations(tenant(), req.query)
      .then((d) => ok(res, d))
      .catch(next);
  }

  // Sync Runs
  static listSyncRuns(req: Request, res: Response, next: NextFunction) {
    AcademicClassroomSyncService.listSyncRuns(tenant(), req.query)
      .then((d) => ok(res, d))
      .catch(next);
  }

  // Google Classroom Routes
  static discoverClassroomCourses(req: Request, res: Response, next: NextFunction) {
    AcademicClassroomSyncService.discoverCourses(tenant(), req.query, actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static linkClassroomCourse(req: Request, res: Response, next: NextFunction) {
    AcademicClassroomSyncService.linkBatchToClassroomCourse(tenant(), req.body, actor(req))
      .then((d) => ok(res, d, 201))
      .catch(next);
  }

  static listClassroomLinks(req: Request, res: Response, next: NextFunction) {
    AcademicClassroomSyncService.listLinks(tenant(), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static syncClassroomLink(req: Request, res: Response, next: NextFunction) {
    AcademicClassroomSyncService.syncClassroomResource(tenant(), String(req.params.id), req.body, actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static resolveClassroomConflict(req: Request, res: Response, next: NextFunction) {
    AcademicClassroomSyncService.resolveConflict(tenant(), String(req.params.id), req.body, actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  // Live Class Meeting Routes
  static createClassMeeting(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.createMeetingForClass(tenant(), String(req.params.classId), req.body, actor(req))
      .then((d) => ok(res, d, 201))
      .catch(next);
  }

  static getClassMeeting(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.getAuthorizedJoinInfo(tenant(), String(req.params.classId), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static getClassMeetingHistory(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.listMeetingHistory(tenant(), String(req.params.classId), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static retryClassMeeting(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.createMeetingForClass(tenant(), String(req.params.classId), req.body, actor(req))
      .then(async (d) => {
        await IntegrationOperationModel.updateMany(
          { tenantId: tenant(), canonicalResourceId: String(req.params.classId), status: 'FAILED' },
          { $set: { status: 'COMPLETED', result: { authorizedRetry: true, meetingId: d.id }, completedAt: new Date(), nextRetryAt: null, errorCategory: null, errorDetails: null } }
        );
        return ok(res, d);
      })
      .catch(next);
  }

  static rescheduleClassMeeting(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.rescheduleMeetingForClass(tenant(), String(req.params.classId), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static cancelClassMeeting(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.cancelMeetingForClass(tenant(), String(req.params.classId), String(req.body?.reason || 'Cancelled by instructor'), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static getJoinInfo(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.getAuthorizedJoinInfo(tenant(), String(req.params.classId), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static getAttendanceEvidence(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.syncAttendanceEvidence(tenant(), String(req.params.classId), actor(req), req.query)
      .then((d) => ok(res, d))
      .catch(next);
  }

  static getRecordings(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.getRecordings(tenant(), String(req.params.classId), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  static getTranscripts(req: Request, res: Response, next: NextFunction) {
    LiveClassOrchestratorService.getTranscripts(tenant(), String(req.params.classId), actor(req))
      .then((d) => ok(res, d))
      .catch(next);
  }

  // Webhooks
  static handleWebhook(req: Request, res: Response, next: NextFunction) {
    const rawProvider = String(req.params.provider).toUpperCase();
    const provider: IntegrationProvider = rawProvider === 'GOOGLE' ? 'GOOGLE_MEET' : (rawProvider as IntegrationProvider);

    IntegrationWebhookService.handleWebhook({
      provider,
      headers: req.headers,
      rawBody: (req as any).rawBody,
      payload: req.body || {}
    })
      .then((d) => {
        if (d.challenge) {
          return res.status(200).json(d.challenge);
        }
        return ok(res, d);
      })
      .catch(next);
  }
}
