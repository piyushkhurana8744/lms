import {
  AnalyticsExportPayload,
  AnalyticsReportQuery,
  IAnalyticsExport,
} from '@edtech/types';
import { AnalyticsQueryService, AnalyticsActor } from './analytics/analyticsQuery.service';
import { AnalyticsReportService } from './analytics/analyticsReport.service';
import { AnalyticsExportService } from './analytics/analyticsExport.service';
import { AnalyticsTimezoneService } from './analytics/analyticsTimezone.service';

export class AnalyticsService {
  async getExecutiveDashboard(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getExecutiveDashboard(query, actor);
  }

  async getStudentsAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getStudentsAnalytics(query, actor);
  }

  async getCRMAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getCRMAnalytics(query, actor);
  }

  async getFinanceAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getFinanceAnalytics(query, actor);
  }

  async getAttendanceAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getAttendanceAnalytics(query, actor);
  }

  async getAcademicsAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getAcademicsAnalytics(query, actor);
  }

  async getLearningAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getLearningAnalytics(query, actor);
  }

  async getInstructorsAnalytics(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getInstructorsAnalytics(query, actor);
  }

  async getBranchComparison(tenantId: string, actor: AnalyticsActor, query: Record<string, any>) {
    return AnalyticsQueryService.getBranchComparison(query, actor);
  }

  async getReport(tenantId: string, actor: AnalyticsActor, reportKey: string, query: AnalyticsReportQuery) {
    return AnalyticsReportService.getReport({ ...query, reportKey: reportKey as any }, actor);
  }

  async createExport(tenantId: string, actor: AnalyticsActor, payload: AnalyticsExportPayload) {
    return AnalyticsExportService.createExport(payload, actor);
  }

  async getExport(tenantId: string, actor: AnalyticsActor, exportId: string) {
    return AnalyticsExportService.getExport(exportId, actor);
  }

  async listExports(tenantId: string, actor: AnalyticsActor) {
    return AnalyticsExportService.listExports(actor);
  }
}

export const analyticsService = new AnalyticsService();
export {
  AnalyticsQueryService,
  AnalyticsReportService,
  AnalyticsExportService,
  AnalyticsTimezoneService,
};
