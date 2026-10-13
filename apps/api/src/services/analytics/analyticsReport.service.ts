import { Types } from 'mongoose';
import {
  StudentLifecycleModel,
  StudentLifecycleEventModel,
  LeadModel,
  AdmissionModel,
  PaymentModel,
  StudentFeePlanModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  ClassModel,
  OrganizationMemberModel,
  UserModel
} from '@edtech/database';
import { AnalyticsReportKey, AnalyticsReportQuery, AnalyticsReportResponse } from '@edtech/types';
import { PERMISSIONS } from '@edtech/permissions';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ForbiddenError } from '../../errors/appError';
import { AnalyticsQueryService, AnalyticsActor } from './analyticsQuery.service';
import { AnalyticsTimezoneService } from './analyticsTimezone.service';

export class AnalyticsReportService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  private static assertReportPermission(reportKey: AnalyticsReportKey, actor: AnalyticsActor) {
    if (actor.isSuperAdmin) return;
    const perms = actor.permissions || [];
    if (perms.includes(PERMISSIONS.SUPERADMIN_ALL)) return;

    switch (reportKey) {
      case 'STUDENT_ROSTER':
      case 'STUDENT_LIFECYCLE_HISTORY':
        if (!perms.includes(PERMISSIONS.ANALYTICS_STUDENTS_VIEW) && !perms.includes(PERMISSIONS.STUDENT_DIRECTORY_VIEW)) {
          throw new ForbiddenError('Student analytics report access denied');
        }
        break;
      case 'LEAD_ACQUISITION':
      case 'ADMISSION_CONVERSIONS':
        if (!perms.includes(PERMISSIONS.ANALYTICS_CRM_VIEW) && !perms.includes(PERMISSIONS.CRM_VIEW)) {
          throw new ForbiddenError('CRM analytics report access denied');
        }
        break;
      case 'FINANCE_COLLECTIONS':
      case 'FINANCE_AGING_DUES':
        if (!perms.includes(PERMISSIONS.ANALYTICS_FINANCE_VIEW) && !perms.includes(PERMISSIONS.FINANCE_REPORT_VIEW) && !perms.includes(PERMISSIONS.PAYMENT_VIEW)) {
          throw new ForbiddenError('Finance analytics report access denied');
        }
        break;
      case 'ATTENDANCE_SUMMARY':
      case 'LOW_ATTENDANCE_STUDENTS':
        if (!perms.includes(PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW) && !perms.includes(PERMISSIONS.ATTENDANCE_VIEW) && !perms.includes(PERMISSIONS.ATTENDANCE_REPORT_VIEW)) {
          throw new ForbiddenError('Attendance analytics report access denied');
        }
        break;
      case 'ACADEMIC_CLASS_SCHEDULE':
        if (!perms.includes(PERMISSIONS.ANALYTICS_ACADEMICS_VIEW) && !perms.includes(PERMISSIONS.CLASS_VIEW)) {
          throw new ForbiddenError('Academic schedule report access denied');
        }
        break;
      case 'INSTRUCTOR_WORKLOAD':
        if (!perms.includes(PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW) && !perms.includes(PERMISSIONS.BATCH_VIEW)) {
          throw new ForbiddenError('Instructor workload report access denied');
        }
        break;
      default:
        throw new BadRequestError(`Unknown report key: ${reportKey}`);
    }
  }

  public static async executeReport(
    query: AnalyticsReportQuery,
    actor: AnalyticsActor
  ): Promise<AnalyticsReportResponse> {
    const tenantId = this.getTenantId();
    this.assertReportPermission(query.reportKey, actor);

    const period = AnalyticsTimezoneService.resolvePeriod(query.from, query.to, query.timezone);
    const { scopeFilter } = await AnalyticsQueryService.resolveBranchScope(tenantId, actor, query.branchId);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    let rows: any[] = [];
    let total = 0;
    let summary: Record<string, any> = {};

    switch (query.reportKey) {
      case 'STUDENT_ROSTER': {
        const filter: any = { tenantId: new Types.ObjectId(tenantId) };
        if (scopeFilter.branchId) filter.currentBranchId = scopeFilter.branchId;
        if (query.status && query.status !== 'ALL') filter.currentStatus = query.status;
        if (query.courseId && Types.ObjectId.isValid(query.courseId)) filter.courseId = new Types.ObjectId(query.courseId);
        if (query.batchId && Types.ObjectId.isValid(query.batchId)) filter.currentBatchId = new Types.ObjectId(query.batchId);
        if (query.search?.trim()) {
          filter.$or = [
            { studentNumber: { $regex: query.search.trim(), $options: 'i' } }
          ];
        }

        [rows, total] = await Promise.all([
          StudentLifecycleModel.find(filter)
            .populate('studentUserId', 'name email phone avatarUrl')
            .populate('courseId', 'title slug')
            .populate('currentBatchId', 'name batchCode mode')
            .populate('currentBranchId', 'name code')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          StudentLifecycleModel.countDocuments(filter)
        ]);

        summary = { totalStudents: total };
        break;
      }

      case 'FINANCE_COLLECTIONS': {
        const filter: any = { tenantId: new Types.ObjectId(tenantId), status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } };
        if (scopeFilter.branchId) filter.branchId = scopeFilter.branchId;
        if (query.search?.trim()) {
          filter.$or = [
            { paymentNumber: { $regex: query.search.trim(), $options: 'i' } }
          ];
        }

        const [paymentRows, count, sumAgg] = await Promise.all([
          PaymentModel.find(filter)
            .populate('studentUserId', 'name email')
            .populate('branchId', 'name code')
            .sort({ receivedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          PaymentModel.countDocuments(filter),
          PaymentModel.aggregate([
            { $match: filter },
            { $group: { _id: null, totalMinor: { $sum: '$amountMinor' } } }
          ])
        ]);

        rows = paymentRows;
        total = count;
        summary = { totalCollectedMinor: sumAgg[0]?.totalMinor || 0, currency: 'INR' };
        break;
      }

      case 'LEAD_ACQUISITION': {
        const filter: any = { tenantId: new Types.ObjectId(tenantId), createdAt: { $gte: period.from, $lte: period.to } };
        if (scopeFilter.branchId) filter.branchId = scopeFilter.branchId;
        if (query.status && query.status !== 'ALL') filter.status = query.status;

        [rows, total] = await Promise.all([
          LeadModel.find(filter)
            .populate('branchId', 'name code')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          LeadModel.countDocuments(filter)
        ]);

        summary = { totalLeads: total };
        break;
      }

      case 'ATTENDANCE_SUMMARY': {
        const filter: any = { tenantId: new Types.ObjectId(tenantId), status: 'FINALIZED', sessionDate: { $gte: period.from, $lte: period.to } };
        if (scopeFilter.branchId) filter.branchId = scopeFilter.branchId;

        [rows, total] = await Promise.all([
          AttendanceSessionModel.find(filter)
            .populate('classId', 'name classCode mode')
            .populate('batchId', 'name batchCode')
            .populate('branchId', 'name code')
            .sort({ sessionDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          AttendanceSessionModel.countDocuments(filter)
        ]);

        summary = { totalSessions: total };
        break;
      }

      case 'ACADEMIC_CLASS_SCHEDULE': {
        const filter: any = { tenantId: new Types.ObjectId(tenantId), scheduledStartAt: { $gte: period.from, $lte: period.to } };
        if (scopeFilter.branchId) filter.branchId = scopeFilter.branchId;
        if (query.status && query.status !== 'ALL') filter.status = query.status;

        [rows, total] = await Promise.all([
          ClassModel.find(filter)
            .populate('batchId', 'name batchCode')
            .populate('instructorId', 'name email')
            .populate('branchId', 'name code')
            .sort({ scheduledStartAt: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          ClassModel.countDocuments(filter)
        ]);

        summary = { totalClasses: total };
        break;
      }

      default: {
        rows = [];
        total = 0;
      }
    }

    return {
      reportKey: query.reportKey,
      generatedAt: new Date().toISOString(),
      timezone: period.timezone,
      data: rows,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  public static async getReport(
    query: AnalyticsReportQuery,
    actor: AnalyticsActor
  ): Promise<AnalyticsReportResponse> {
    return this.executeReport(query, actor);
  }
}
