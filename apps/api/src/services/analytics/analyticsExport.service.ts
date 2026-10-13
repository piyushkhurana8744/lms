import { Types } from 'mongoose';
import { AnalyticsExportModel, IAnalyticsExportDocument } from '@edtech/database';
import { AnalyticsExportPayload, AnalyticsReportKey, IAnalyticsExport } from '@edtech/types';
import { PERMISSIONS } from '@edtech/permissions';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/appError';
import { AnalyticsActor } from './analyticsQuery.service';
import { AnalyticsReportService } from './analyticsReport.service';
import { AuditService } from '../audit.service';

export class AnalyticsExportService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  private static sanitizeCsvValue(val: any): string {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    // Neutralize formula injection in Excel/Sheets (=, +, -, @, \t, \r)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    // Escape double quotes and enclose in quotes if contains comma, quote, or newline
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static buildCsv(headers: string[], rows: any[][]): string {
    const headerLine = headers.map((h) => this.sanitizeCsvValue(h)).join(',');
    const dataLines = rows.map((row) => row.map((cell) => this.sanitizeCsvValue(cell)).join(','));
    return [headerLine, ...dataLines].join('\n');
  }

  public static async createExport(
    payload: AnalyticsExportPayload,
    actor: AnalyticsActor
  ): Promise<{ exportRecord: IAnalyticsExport; csv: string }> {
    const tenantId = this.getTenantId();

    // 1. Enforce Export RBAC
    if (!actor.isSuperAdmin) {
      const perms = actor.permissions || [];
      if (!perms.includes(PERMISSIONS.SUPERADMIN_ALL) && !perms.includes(PERMISSIONS.ANALYTICS_REPORTS_EXPORT)) {
        throw new ForbiddenError('Export analytics report permission required');
      }
    }

    // 2. Fetch full bounded report dataset (max 5,000 rows for sync safety)
    const reportResult = await AnalyticsReportService.executeReport(
      {
        ...payload,
        page: 1,
        limit: 5000
      },
      actor
    );

    const rows = reportResult.data || [];
    let headers: string[] = [];
    let csvRows: any[][] = [];

    switch (payload.reportKey) {
      case 'STUDENT_ROSTER': {
        headers = ['Student ID', 'Full Name', 'Email', 'Course', 'Batch', 'Branch', 'Status', 'Activated At'];
        csvRows = rows.map((r: any) => [
          r.studentNumber || '',
          r.studentUserId?.name || '',
          r.studentUserId?.email || '',
          r.courseId?.title || '',
          r.currentBatchId?.name || '',
          r.currentBranchId?.name || '',
          r.currentStatus || '',
          r.activatedAt ? new Date(r.activatedAt).toISOString() : ''
        ]);
        break;
      }

      case 'FINANCE_COLLECTIONS': {
        headers = ['Payment Number', 'Student Name', 'Email', 'Amount (INR)', 'Method', 'Branch', 'Received At', 'Status'];
        csvRows = rows.map((r: any) => [
          r.paymentNumber || '',
          r.studentUserId?.name || '',
          r.studentUserId?.email || '',
          ((r.amountMinor || 0) / 100).toFixed(2),
          r.method || '',
          r.branchId?.name || '',
          r.receivedAt ? new Date(r.receivedAt).toISOString() : '',
          r.status || ''
        ]);
        break;
      }

      case 'LEAD_ACQUISITION': {
        headers = ['Lead Name', 'Email', 'Phone', 'Source', 'Status', 'Branch', 'Counsellor', 'Created At'];
        csvRows = rows.map((r: any) => [
          r.name || '',
          r.email || '',
          r.phone || '',
          r.source || '',
          r.status || '',
          r.branchId?.name || '',
          r.assignedTo?.name || '',
          r.createdAt ? new Date(r.createdAt).toISOString() : ''
        ]);
        break;
      }

      case 'ATTENDANCE_SUMMARY': {
        headers = ['Session ID', 'Class Name', 'Batch', 'Branch', 'Session Date', 'Expected Students', 'Marked Students', 'Status'];
        csvRows = rows.map((r: any) => [
          r._id?.toString() || '',
          r.classId?.name || '',
          r.batchId?.name || '',
          r.branchId?.name || '',
          r.sessionDate ? new Date(r.sessionDate).toISOString() : '',
          r.expectedStudentCount || 0,
          r.markedStudentCount || 0,
          r.status || ''
        ]);
        break;
      }

      case 'ACADEMIC_CLASS_SCHEDULE': {
        headers = ['Class Name', 'Batch', 'Instructor', 'Branch', 'Scheduled Start', 'Scheduled End', 'Status'];
        csvRows = rows.map((r: any) => [
          r.name || '',
          r.batchId?.name || '',
          r.instructorId?.name || '',
          r.branchId?.name || '',
          r.scheduledStartAt ? new Date(r.scheduledStartAt).toISOString() : '',
          r.scheduledEndAt ? new Date(r.scheduledEndAt).toISOString() : '',
          r.status || ''
        ]);
        break;
      }

      default: {
        headers = ['Data'];
        csvRows = rows.map((r) => [JSON.stringify(r)]);
      }
    }

    const csvContent = this.buildCsv(headers, csvRows);

    // 3. Persist export record with 24h TTL
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const exportDoc = await AnalyticsExportModel.create({
      tenantId: new Types.ObjectId(tenantId),
      requestedBy: new Types.ObjectId(actor.userId),
      reportKey: payload.reportKey,
      format: 'CSV',
      querySnapshot: payload,
      status: 'READY',
      rowCount: rows.length,
      content: csvContent,
      expiresAt
    });

    // 4. Log Audit Event
    await AuditService.logEvent({
      actorId: actor.userId,
      tenantId,
      action: 'analytics.export.created',
      resource: 'AnalyticsExport',
      resourceId: exportDoc._id.toString(),
      metadata: {
        reportKey: payload.reportKey,
        rowCount: rows.length,
        format: 'CSV'
      }
    });

    return {
      exportRecord: {
        id: exportDoc._id.toString(),
        tenantId: exportDoc.tenantId.toString(),
        requestedBy: exportDoc.requestedBy.toString(),
        reportKey: exportDoc.reportKey,
        format: 'CSV',
        querySnapshot: exportDoc.querySnapshot,
        status: exportDoc.status,
        rowCount: exportDoc.rowCount,
        createdAt: exportDoc.createdAt,
        expiresAt: exportDoc.expiresAt
      },
      csv: csvContent
    };
  }

  public static async getExportById(id: string, actor: AnalyticsActor): Promise<{ exportRecord: IAnalyticsExport; csv: string }> {
    const tenantId = this.getTenantId();
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Export not found');

    const doc = await AnalyticsExportModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId)
    }).lean();

    if (!doc) throw new NotFoundError('Export not found');

    // Requester or admin
    if (!actor.isSuperAdmin && doc.requestedBy.toString() !== actor.userId) {
      const perms = actor.permissions || [];
      if (!perms.includes(PERMISSIONS.SUPERADMIN_ALL) && !perms.includes(PERMISSIONS.ANALYTICS_REPORTS_EXPORT)) {
        throw new ForbiddenError('Access to export artifact denied');
      }
    }

    return {
      exportRecord: {
        id: doc._id.toString(),
        tenantId: doc.tenantId.toString(),
        requestedBy: doc.requestedBy.toString(),
        reportKey: doc.reportKey,
        format: 'CSV',
        querySnapshot: doc.querySnapshot,
        status: doc.status,
        rowCount: doc.rowCount,
        createdAt: doc.createdAt,
        expiresAt: doc.expiresAt
      },
      csv: doc.content || ''
    };
  }

  public static async listExports(actor: AnalyticsActor): Promise<IAnalyticsExport[]> {
    const tenantId = this.getTenantId();
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (!actor.isSuperAdmin) {
      const perms = actor.permissions || [];
      if (!perms.includes(PERMISSIONS.SUPERADMIN_ALL) && !perms.includes(PERMISSIONS.ANALYTICS_REPORTS_EXPORT)) {
        query.requestedBy = new Types.ObjectId(actor.userId);
      }
    }
    const docs = await AnalyticsExportModel.find(query).sort({ createdAt: -1 }).limit(50).lean();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      requestedBy: doc.requestedBy.toString(),
      reportKey: doc.reportKey,
      format: doc.format || 'CSV',
      querySnapshot: doc.querySnapshot,
      status: doc.status,
      rowCount: doc.rowCount,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt
    }));
  }

  public static async getExport(id: string, actor: AnalyticsActor) {
    return this.getExportById(id, actor);
  }
}
