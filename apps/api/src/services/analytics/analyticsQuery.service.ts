import { Types } from 'mongoose';
import {
  StudentLifecycleModel,
  LeadModel,
  LeadFollowUpModel,
  AdmissionModel,
  PaymentModel,
  StudentFeePlanModel,
  RefundModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  ClassModel,
  BatchModel,
  EnrollmentModel,
  LessonProgressModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  CertificateModel,
  BranchModel,
  OrganizationMemberModel,
  UserModel
} from '@edtech/database';
import {
  ExecutiveDashboardResponse,
  StudentsAnalyticsResponse,
  CRMAnalyticsResponse,
  FinanceAnalyticsResponse,
  AttendanceAnalyticsResponse,
  AcademicsAnalyticsResponse,
  LearningAnalyticsResponse,
  InstructorsAnalyticsResponse,
  BranchComparisonResponse,
  AnalyticsDimensionBreakdown,
  AnalyticsTimeSeriesPoint
} from '@edtech/types';
import { PERMISSIONS, hasPermission } from '@edtech/permissions';
import { getWorkspaceContext } from '@edtech/utils';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/appError';
import { BranchAccessService, BranchActor } from '../branchAccess.service';
import { AnalyticsTimezoneService } from './analyticsTimezone.service';

export interface AnalyticsActor extends BranchActor {
  roles?: string[];
  permissions?: string[];
}

export class AnalyticsQueryService {
  private static getTenantId(): string {
    const ctx = getWorkspaceContext();
    if (!ctx?.currentTenantId) throw new BadRequestError('Tenant context required');
    return ctx.currentTenantId;
  }

  public static async resolveBranchScope(
    tenantId: string,
    actor: AnalyticsActor,
    requestedBranchId?: string
  ): Promise<{
    scopeFilter: Record<string, any>;
    scopeMode: 'ALL' | 'SELECTED';
    authorizedBranchIds: string[];
  }> {
    const userScope = await BranchAccessService.getScope(tenantId, actor);

    if (requestedBranchId && requestedBranchId !== 'ALL') {
      if (!Types.ObjectId.isValid(requestedBranchId)) {
        throw new NotFoundError('Branch not found');
      }
      if (userScope.mode !== 'ALL' && !userScope.branchIds.includes(requestedBranchId)) {
        throw new NotFoundError('Branch not found');
      }
      const branchExists = await BranchModel.exists({ _id: requestedBranchId, tenantId });
      if (!branchExists) throw new NotFoundError('Branch not found');

      return {
        scopeFilter: { branchId: new Types.ObjectId(requestedBranchId) },
        scopeMode: 'SELECTED',
        authorizedBranchIds: [requestedBranchId]
      };
    }

    if (userScope.mode === 'ALL') {
      return {
        scopeFilter: {},
        scopeMode: 'ALL',
        authorizedBranchIds: []
      };
    }

    // SELECTED actor with omitted or 'ALL' requested: restricted strictly to userScope.branchIds
    return {
      scopeFilter: { branchId: { $in: userScope.branchIds.map((id) => new Types.ObjectId(id)) } },
      scopeMode: 'SELECTED',
      authorizedBranchIds: userScope.branchIds
    };
  }

  private static checkPerm(actor: AnalyticsActor, required: string): boolean {
    if (actor.isSuperAdmin) return true;
    const perms = actor.permissions || [];
    if (perms.includes(PERMISSIONS.SUPERADMIN_ALL)) return true;
    return perms.includes(required);
  }

  // ==========================================
  // 1. EXECUTIVE DASHBOARD (PERMISSION-SHAPED)
  // ==========================================
  public static async getExecutiveDashboard(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<ExecutiveDashboardResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter, scopeMode, authorizedBranchIds } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const canViewStudents = this.checkPerm(actor, PERMISSIONS.ANALYTICS_STUDENTS_VIEW) || this.checkPerm(actor, PERMISSIONS.STUDENT_DIRECTORY_VIEW);
    const canViewCRM = this.checkPerm(actor, PERMISSIONS.ANALYTICS_CRM_VIEW) || this.checkPerm(actor, PERMISSIONS.CRM_VIEW);
    const canViewFinance = this.checkPerm(actor, PERMISSIONS.ANALYTICS_FINANCE_VIEW) || this.checkPerm(actor, PERMISSIONS.FINANCE_REPORT_VIEW);
    const canViewAttendance = this.checkPerm(actor, PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW) || this.checkPerm(actor, PERMISSIONS.ATTENDANCE_VIEW);
    const canViewAcademics = this.checkPerm(actor, PERMISSIONS.ANALYTICS_ACADEMICS_VIEW) || this.checkPerm(actor, PERMISSIONS.CLASS_VIEW);
    const canViewLearning = this.checkPerm(actor, PERMISSIONS.ANALYTICS_LEARNING_VIEW) || this.checkPerm(actor, PERMISSIONS.PROGRESS_VIEW);
    const canViewInstructors = this.checkPerm(actor, PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW) || this.checkPerm(actor, PERMISSIONS.BATCH_VIEW);

    const response: ExecutiveDashboardResponse = {
      timezone: period.timezone,
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        previousFrom: period.previousFrom.toISOString(),
        previousTo: period.previousTo.toISOString()
      },
      scope: {
        mode: scopeMode,
        branchIds: authorizedBranchIds
      }
    };

    // 1. Students Section
    if (canViewStudents) {
      const studentFilter: any = { tenantId: new Types.ObjectId(tenantId) };
      if (scopeFilter.branchId) {
        studentFilter.currentBranchId = scopeFilter.branchId;
      }
      const [activeTotal, newlyCurrent, newlyPrevious, onHold, completed] = await Promise.all([
        StudentLifecycleModel.countDocuments({ ...studentFilter, currentStatus: 'ACTIVE' }),
        StudentLifecycleModel.countDocuments({ ...studentFilter, activatedAt: { $gte: period.from, $lte: period.to } }),
        StudentLifecycleModel.countDocuments({ ...studentFilter, activatedAt: { $gte: period.previousFrom, $lte: period.previousTo } }),
        StudentLifecycleModel.countDocuments({ ...studentFilter, currentStatus: 'ON_HOLD' }),
        StudentLifecycleModel.countDocuments({ ...studentFilter, currentStatus: 'COMPLETED' })
      ]);

      response.students = {
        activeTotal,
        newlyAdmitted: AnalyticsTimezoneService.calculateMetricChange(newlyCurrent, newlyPrevious),
        onHold,
        completed,
        trend: []
      };
    }

    // 2. CRM Section
    if (canViewCRM) {
      const leadFilter: any = { tenantId: new Types.ObjectId(tenantId) };
      if (scopeFilter.branchId) leadFilter.branchId = scopeFilter.branchId;

      const [leadsCurrent, leadsPrevious, admCurrent, admPrevious, overdueFollowUps] = await Promise.all([
        LeadModel.countDocuments({ ...leadFilter, createdAt: { $gte: period.from, $lte: period.to } }),
        LeadModel.countDocuments({ ...leadFilter, createdAt: { $gte: period.previousFrom, $lte: period.previousTo } }),
        AdmissionModel.countDocuments({ ...leadFilter, status: { $in: ['APPROVED', 'ENROLLED'] }, createdAt: { $gte: period.from, $lte: period.to } }),
        AdmissionModel.countDocuments({ ...leadFilter, status: { $in: ['APPROVED', 'ENROLLED'] }, createdAt: { $gte: period.previousFrom, $lte: period.previousTo } }),
        LeadFollowUpModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'PENDING', scheduledAt: { $lt: new Date() } })
      ]);

      const conversionRate = leadsCurrent > 0 ? Math.round((admCurrent / leadsCurrent) * 10000) / 100 : 0;

      response.crm = {
        leadsCreated: AnalyticsTimezoneService.calculateMetricChange(leadsCurrent, leadsPrevious),
        leadsConverted: AnalyticsTimezoneService.calculateMetricChange(admCurrent, admPrevious),
        conversionRate,
        overdueFollowUps,
        funnel: []
      };
    }

    // 3. Finance Section
    if (canViewFinance) {
      const finFilter: any = { tenantId: new Types.ObjectId(tenantId) };
      if (scopeFilter.branchId) finFilter.branchId = scopeFilter.branchId;

      const [collectedCurrRes, collectedPrevRes, outstandingRes, refundedRes] = await Promise.all([
        PaymentModel.aggregate([
          { $match: { ...finFilter, status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } } },
          { $group: { _id: null, total: { $sum: '$amountMinor' } } }
        ]),
        PaymentModel.aggregate([
          { $match: { ...finFilter, status: 'SUCCESS', receivedAt: { $gte: period.previousFrom, $lte: period.previousTo } } },
          { $group: { _id: null, total: { $sum: '$amountMinor' } } }
        ]),
        StudentFeePlanModel.aggregate([
          { $match: { ...finFilter, status: { $in: ['ACTIVE', 'UPCOMING', 'OVERDUE'] } } },
          { $group: { _id: null, total: { $sum: '$outstandingBalanceMinor' } } }
        ]),
        RefundModel.aggregate([
          { $match: { ...finFilter, status: 'SUCCESS', createdAt: { $gte: period.from, $lte: period.to } } },
          { $group: { _id: null, total: { $sum: '$amountMinor' } } }
        ])
      ]);

      const collectedMinor = collectedCurrRes[0]?.total || 0;
      const prevCollectedMinor = collectedPrevRes[0]?.total || 0;
      const outstandingMinor = outstandingRes[0]?.total || 0;
      const refundedMinor = refundedRes[0]?.total || 0;

      response.finance = {
        collectedMinor: AnalyticsTimezoneService.calculateMetricChange(collectedMinor, prevCollectedMinor),
        outstandingMinor,
        overdueMinor: 0,
        refundedMinor,
        netCollectionsMinor: Math.max(0, collectedMinor - refundedMinor),
        currency: 'INR',
        trend: []
      };
    }

    // 4. Attendance Section
    if (canViewAttendance) {
      const attFilter: any = { tenantId: new Types.ObjectId(tenantId), status: 'FINALIZED' };
      if (scopeFilter.branchId) attFilter.branchId = scopeFilter.branchId;

      const sessions = await AttendanceSessionModel.find({
        tenantId: new Types.ObjectId(tenantId),
        status: 'FINALIZED',
        sessionDate: { $gte: period.from, $lte: period.to }
      }).select('_id expectedStudentCount markedStudentCount').lean();

      const sessionIds = sessions.map((s) => s._id);

      const recordsAgg = await AttendanceRecordModel.aggregate([
        { $match: { attendanceSessionId: { $in: sessionIds }, tenantId: new Types.ObjectId(tenantId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const countsMap = new Map(recordsAgg.map((r) => [r._id, r.count]));
      const present = countsMap.get('PRESENT') || 0;
      const late = countsMap.get('LATE') || 0;
      const absent = countsMap.get('ABSENT') || 0;
      const excused = countsMap.get('EXCUSED') || 0;
      const validTotal = present + late + absent;

      const percentage = validTotal > 0 ? Math.round(((present + late) / validTotal) * 10000) / 100 : null;

      response.attendance = {
        overallPercentage: percentage,
        totalExpected: sessions.reduce((acc, s) => acc + (s.expectedStudentCount || 0), 0),
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        excusedCount: excused,
        trend: []
      };
    }

    // 5. Academics Section
    if (canViewAcademics) {
      const classFilter: any = { tenantId: new Types.ObjectId(tenantId) };
      if (scopeFilter.branchId) classFilter.branchId = scopeFilter.branchId;

      const [scheduled, cancelled, rescheduled, batchesCount] = await Promise.all([
        ClassModel.countDocuments({ ...classFilter, scheduledStartAt: { $gte: period.from, $lte: period.to }, status: { $ne: 'CANCELLED' } }),
        ClassModel.countDocuments({ ...classFilter, scheduledStartAt: { $gte: period.from, $lte: period.to }, status: 'CANCELLED' }),
        ClassModel.countDocuments({ ...classFilter, scheduledStartAt: { $gte: period.from, $lte: period.to }, isRescheduled: true }),
        BatchModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), ...(scopeFilter.branchId ? { branchId: scopeFilter.branchId } : {}), status: 'ONGOING' })
      ]);

      response.academics = {
        scheduledClasses: scheduled,
        completedClasses: 0,
        cancelledClasses: cancelled,
        rescheduledClasses: rescheduled,
        activeBatchesCount: batchesCount
      };
    }

    // 6. Learning Section
    if (canViewLearning) {
      const [activeEnrollments, completedEnrollments, totalEnrollments, lessonCompletions] = await Promise.all([
        EnrollmentModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'ACTIVE' }),
        EnrollmentModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'COMPLETED' }),
        EnrollmentModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: { $in: ['ACTIVE', 'COMPLETED'] } }),
        LessonProgressModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), isCompleted: true, completedAt: { $gte: period.from, $lte: period.to } })
      ]);

      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100 : 0;

      response.learning = {
        activeEnrollments,
        courseCompletionRate: completionRate,
        lessonCompletions,
        averageAssessmentScore: null
      };
    }

    // 7. Instructors Section
    if (canViewInstructors) {
      const instFilter: any = { tenantId: new Types.ObjectId(tenantId), role: 'INSTRUCTOR', status: 'ACTIVE' };
      if (scopeFilter.branchId) instFilter.branchIds = scopeFilter.branchId;

      const [instructorsCount, pastUnfinalized] = await Promise.all([
        OrganizationMemberModel.countDocuments(instFilter),
        ClassModel.countDocuments({
          tenantId: new Types.ObjectId(tenantId),
          scheduledStartAt: { $lt: new Date() },
          status: { $ne: 'CANCELLED' }
        })
      ]);

      response.instructors = {
        totalActiveInstructors: instructorsCount,
        totalTeachingHours: 0,
        pendingAttendanceClasses: pastUnfinalized,
        pendingGradingSubmissions: 0
      };
    }

    return response;
  }

  // ==========================================
  // 2. STUDENTS ANALYTICS
  // ==========================================
  public static async getStudentsAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<StudentsAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const match: any = { tenantId: new Types.ObjectId(tenantId) };
    if (scopeFilter.branchId) match.currentBranchId = scopeFilter.branchId;
    if (rawQuery.courseId && Types.ObjectId.isValid(rawQuery.courseId)) match.courseId = new Types.ObjectId(rawQuery.courseId);
    if (rawQuery.batchId && Types.ObjectId.isValid(rawQuery.batchId)) match.currentBatchId = new Types.ObjectId(rawQuery.batchId);

    const [active, newlyCurr, newlyPrev, onHold, withdrawn, dropped, completed] = await Promise.all([
      StudentLifecycleModel.countDocuments({ ...match, currentStatus: 'ACTIVE' }),
      StudentLifecycleModel.countDocuments({ ...match, activatedAt: { $gte: period.from, $lte: period.to } }),
      StudentLifecycleModel.countDocuments({ ...match, activatedAt: { $gte: period.previousFrom, $lte: period.previousTo } }),
      StudentLifecycleModel.countDocuments({ ...match, currentStatus: 'ON_HOLD' }),
      StudentLifecycleModel.countDocuments({ ...match, currentStatus: 'WITHDRAWN' }),
      StudentLifecycleModel.countDocuments({ ...match, currentStatus: 'DROPPED' }),
      StudentLifecycleModel.countDocuments({ ...match, currentStatus: 'COMPLETED' })
    ]);

    // Branch Distribution
    const branchAgg = await StudentLifecycleModel.aggregate([
      { $match: { ...match, currentStatus: 'ACTIVE' } },
      { $group: { _id: '$currentBranchId', count: { $sum: 1 } } }
    ]);
    const branchIds = branchAgg.map((b) => b._id).filter(Boolean);
    const branches = await BranchModel.find({ _id: { $in: branchIds } }).select('name code').lean();
    const branchMap = new Map(branches.map((b) => [b._id.toString(), b]));

    const branchDistribution: AnalyticsDimensionBreakdown[] = branchAgg.map((b) => {
      const doc = b._id ? branchMap.get(b._id.toString()) : null;
      return {
        id: b._id ? b._id.toString() : 'unassigned',
        name: doc?.name || 'Unassigned Branch',
        code: doc?.code,
        value: b.count,
        count: b.count,
        percentage: active > 0 ? Math.round((b.count / active) * 10000) / 100 : 0
      };
    });

    // Time Series Trend for new student activations
    const trendAgg = await StudentLifecycleModel.aggregate([
      { $match: { ...match, activatedAt: { $gte: period.from, $lte: period.to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$activatedAt', timezone: period.timezone } },
          count: { $sum: 1 }
        }
      }
    ]);
    const rawTrend = trendAgg.map((t) => ({ bucket: t._id, value: t.count, count: t.count }));
    const lifecycleTrend = AnalyticsTimezoneService.zeroFillSeries(rawTrend, period.from, period.to, 'DAILY', period.timezone);

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      activeStudents: active,
      newlyAdmitted: AnalyticsTimezoneService.calculateMetricChange(newlyCurr, newlyPrev),
      onHold,
      withdrawn,
      dropped,
      completed,
      branchDistribution,
      courseDistribution: [],
      batchDistribution: [],
      lifecycleTrend
    };
  }

  // ==========================================
  // 3. CRM & ADMISSIONS ANALYTICS
  // ==========================================
  public static async getCRMAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<CRMAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const leadMatch: any = { tenantId: new Types.ObjectId(tenantId) };
    if (scopeFilter.branchId) leadMatch.branchId = scopeFilter.branchId;

    const [leadsCurr, leadsPrev, admCurr, admPrev, overdueFollowUps] = await Promise.all([
      LeadModel.countDocuments({ ...leadMatch, createdAt: { $gte: period.from, $lte: period.to } }),
      LeadModel.countDocuments({ ...leadMatch, createdAt: { $gte: period.previousFrom, $lte: period.previousTo } }),
      AdmissionModel.countDocuments({ ...leadMatch, status: { $in: ['APPROVED', 'ENROLLED'] }, createdAt: { $gte: period.from, $lte: period.to } }),
      AdmissionModel.countDocuments({ ...leadMatch, status: { $in: ['APPROVED', 'ENROLLED'] }, createdAt: { $gte: period.previousFrom, $lte: period.previousTo } }),
      LeadFollowUpModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'PENDING', scheduledAt: { $lt: new Date() } })
    ]);

    const conversionRate = leadsCurr > 0 ? Math.round((admCurr / leadsCurr) * 10000) / 100 : 0;

    // Leads by Source
    const sourceAgg = await LeadModel.aggregate([
      { $match: { ...leadMatch, createdAt: { $gte: period.from, $lte: period.to } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    const leadsBySource: AnalyticsDimensionBreakdown[] = sourceAgg.map((s) => ({
      id: s._id || 'DIRECT',
      name: s._id || 'Direct Inquiry',
      value: s.count,
      count: s.count,
      percentage: leadsCurr > 0 ? Math.round((s.count / leadsCurr) * 10000) / 100 : 0
    }));

    // Stage Distribution
    const stageAgg = await LeadModel.aggregate([
      { $match: { ...leadMatch } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const leadsByStage: AnalyticsDimensionBreakdown[] = stageAgg.map((st) => ({
      id: st._id,
      name: st._id,
      value: st.count,
      count: st.count
    }));

    // Funnel
    const funnel = [
      { stage: 'LEAD', count: leadsCurr },
      { stage: 'ADMISSION', count: admCurr, stageConversionRate: conversionRate }
    ];

    // Trend
    const trendAgg = await LeadModel.aggregate([
      { $match: { ...leadMatch, createdAt: { $gte: period.from, $lte: period.to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: period.timezone } },
          count: { $sum: 1 }
        }
      }
    ]);
    const rawTrend = trendAgg.map((t) => ({ bucket: t._id, value: t.count, count: t.count }));
    const trend = AnalyticsTimezoneService.zeroFillSeries(rawTrend, period.from, period.to, 'DAILY', period.timezone);

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      leadsCreated: AnalyticsTimezoneService.calculateMetricChange(leadsCurr, leadsPrev),
      admissionsTotal: AnalyticsTimezoneService.calculateMetricChange(admCurr, admPrev),
      conversionRate,
      leadsBySource,
      leadsByStage,
      counsellorDistribution: [],
      overdueFollowUpsCount: overdueFollowUps,
      funnel,
      trend
    };
  }

  // ==========================================
  // 4. FINANCE & REVENUE RECONCILIATION
  // ==========================================
  public static async getFinanceAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<FinanceAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const match: any = { tenantId: new Types.ObjectId(tenantId) };
    if (scopeFilter.branchId) match.branchId = scopeFilter.branchId;

    const [collectedCurrRes, collectedPrevRes, outstandingRes, refundedRes, methodAgg, branchAgg, trendAgg] = await Promise.all([
      PaymentModel.aggregate([
        { $match: { ...match, status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } } },
        { $group: { _id: null, total: { $sum: '$amountMinor' } } }
      ]),
      PaymentModel.aggregate([
        { $match: { ...match, status: 'SUCCESS', receivedAt: { $gte: period.previousFrom, $lte: period.previousTo } } },
        { $group: { _id: null, total: { $sum: '$amountMinor' } } }
      ]),
      StudentFeePlanModel.aggregate([
        { $match: { ...match, status: { $in: ['ACTIVE', 'UPCOMING', 'OVERDUE'] } } },
        { $group: { _id: null, total: { $sum: '$outstandingBalanceMinor' } } }
      ]),
      RefundModel.aggregate([
        { $match: { ...match, status: 'SUCCESS', createdAt: { $gte: period.from, $lte: period.to } } },
        { $group: { _id: null, total: { $sum: '$amountMinor' } } }
      ]),
      PaymentModel.aggregate([
        { $match: { ...match, status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } } },
        { $group: { _id: '$method', total: { $sum: '$amountMinor' }, count: { $sum: 1 } } }
      ]),
      PaymentModel.aggregate([
        { $match: { ...match, status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } } },
        { $group: { _id: '$branchId', total: { $sum: '$amountMinor' }, count: { $sum: 1 } } }
      ]),
      PaymentModel.aggregate([
        { $match: { ...match, status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$receivedAt', timezone: period.timezone } },
            total: { $sum: '$amountMinor' }
          }
        }
      ])
    ]);

    const collectedAmountMinor = collectedCurrRes[0]?.total || 0;
    const prevCollectedMinor = collectedPrevRes[0]?.total || 0;
    const outstandingAmountMinor = outstandingRes[0]?.total || 0;
    const refundedAmountMinor = refundedRes[0]?.total || 0;
    const netCollectionsMinor = Math.max(0, collectedAmountMinor - refundedAmountMinor);

    const paymentMethodBreakdown: AnalyticsDimensionBreakdown[] = methodAgg.map((m) => ({
      id: m._id || 'ONLINE_GATEWAY',
      name: m._id || 'Online Gateway',
      value: m.total,
      count: m.count,
      percentage: collectedAmountMinor > 0 ? Math.round((m.total / collectedAmountMinor) * 10000) / 100 : 0
    }));

    // Branch Collections
    const bIds = branchAgg.map((b) => b._id).filter(Boolean);
    const branches = await BranchModel.find({ _id: { $in: bIds } }).select('name code').lean();
    const branchMap = new Map(branches.map((b) => [b._id.toString(), b]));

    const branchCollections: AnalyticsDimensionBreakdown[] = branchAgg.map((b) => {
      const doc = b._id ? branchMap.get(b._id.toString()) : null;
      return {
        id: b._id ? b._id.toString() : 'unassigned',
        name: doc?.name || 'Unassigned Branch',
        code: doc?.code,
        value: b.total,
        count: b.count,
        percentage: collectedAmountMinor > 0 ? Math.round((b.total / collectedAmountMinor) * 10000) / 100 : 0
      };
    });

    const rawTrend = trendAgg.map((t) => ({ bucket: t._id, value: t.total, count: 1 }));
    const trend = AnalyticsTimezoneService.zeroFillSeries(rawTrend, period.from, period.to, 'DAILY', period.timezone);

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      currency: 'INR',
      collectedAmountMinor: AnalyticsTimezoneService.calculateMetricChange(collectedAmountMinor, prevCollectedMinor),
      outstandingAmountMinor,
      overdueAmountMinor: 0,
      refundedAmountMinor,
      netCollectionsMinor,
      paymentMethodBreakdown,
      branchCollections,
      courseCollections: [],
      trend
    };
  }

  // ==========================================
  // 5. ATTENDANCE ANALYTICS
  // ==========================================
  public static async getAttendanceAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<AttendanceAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const sessionMatch: any = {
      tenantId: new Types.ObjectId(tenantId),
      status: 'FINALIZED',
      sessionDate: { $gte: period.from, $lte: period.to }
    };
    if (scopeFilter.branchId) sessionMatch.branchId = scopeFilter.branchId;

    const sessions = await AttendanceSessionModel.find(sessionMatch).select('_id branchId batchId sessionDate').lean();
    const sessionIds = sessions.map((s) => s._id);

    const recordsAgg = await AttendanceRecordModel.aggregate([
      { $match: { attendanceSessionId: { $in: sessionIds }, tenantId: new Types.ObjectId(tenantId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const countsMap = new Map(recordsAgg.map((r) => [r._id, r.count]));
    const present = countsMap.get('PRESENT') || 0;
    const late = countsMap.get('LATE') || 0;
    const absent = countsMap.get('ABSENT') || 0;
    const excused = countsMap.get('EXCUSED') || 0;
    const validTotal = present + late + absent;

    const overallPercentage = validTotal > 0 ? Math.round(((present + late) / validTotal) * 10000) / 100 : null;

    // Trend
    const trendAgg = await AttendanceSessionModel.aggregate([
      { $match: sessionMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$sessionDate', timezone: period.timezone } },
          total: { $sum: '$markedStudentCount' }
        }
      }
    ]);
    const rawTrend = trendAgg.map((t) => ({ bucket: t._id, value: t.total, count: t.total }));
    const trend = AnalyticsTimezoneService.zeroFillSeries(rawTrend, period.from, period.to, 'DAILY', period.timezone);

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      overallPercentage,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      excusedCount: excused,
      totalFinalizedSessions: sessions.length,
      branchBreakdown: [],
      batchBreakdown: [],
      trend,
      lowAttendanceSummary: {
        threshold: rawQuery.threshold || 75,
        studentsBelowThresholdCount: 0
      }
    };
  }

  // ==========================================
  // 6. ACADEMICS ANALYTICS
  // ==========================================
  public static async getAcademicsAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<AcademicsAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const match: any = { tenantId: new Types.ObjectId(tenantId) };
    if (scopeFilter.branchId) match.branchId = scopeFilter.branchId;

    const [scheduled, cancelled, rescheduled, batches] = await Promise.all([
      ClassModel.countDocuments({ ...match, scheduledStartAt: { $gte: period.from, $lte: period.to }, status: { $ne: 'CANCELLED' } }),
      ClassModel.countDocuments({ ...match, scheduledStartAt: { $gte: period.from, $lte: period.to }, status: 'CANCELLED' }),
      ClassModel.countDocuments({ ...match, scheduledStartAt: { $gte: period.from, $lte: period.to }, isRescheduled: true }),
      BatchModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), ...(scopeFilter.branchId ? { branchId: scopeFilter.branchId } : {}), status: 'ONGOING' })
    ]);

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      scheduledClasses: scheduled,
      completedClasses: 0,
      cancelledClasses: cancelled,
      rescheduledClasses: rescheduled,
      activeBatchesCount: batches,
      branchClassVolume: [],
      modeBreakdown: [],
      trend: []
    };
  }

  // ==========================================
  // 7. LEARNING & ASSESSMENTS
  // ==========================================
  public static async getLearningAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<LearningAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);

    const [activeEnrollments, completedEnrollments, totalEnrollments, lessonCompletions, certificatesIssued, certificatesRevoked] = await Promise.all([
      EnrollmentModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'ACTIVE' }),
      EnrollmentModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'COMPLETED' }),
      EnrollmentModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: { $in: ['ACTIVE', 'COMPLETED'] } }),
      LessonProgressModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), isCompleted: true, completedAt: { $gte: period.from, $lte: period.to } }),
      CertificateModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), issuedAt: { $gte: period.from, $lte: period.to } }),
      CertificateModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), status: 'REVOKED' })
    ]);

    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100 : 0;

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      activeEnrollments,
      courseCompletionRate: completionRate,
      totalLessonCompletions: lessonCompletions,
      inactiveStudentsCount: 0,
      courseProgressDistribution: [],
      assessmentMetrics: {
        publishedCount: 0,
        submissionsCount: 0,
        submissionRate: 0,
        gradedCount: 0,
        pendingGradingCount: 0,
        averageScorePercent: null
      },
      certificatesIssued,
      certificatesRevoked
    };
  }

  // ==========================================
  // 8. INSTRUCTOR WORKLOAD ANALYTICS
  // ==========================================
  public static async getInstructorsAnalytics(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<InstructorsAnalyticsResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const instFilter: any = { tenantId: new Types.ObjectId(tenantId), role: 'INSTRUCTOR', status: 'ACTIVE' };
    if (scopeFilter.branchId) instFilter.branchIds = scopeFilter.branchId;

    const [activeInstructors, totalClassesAssigned] = await Promise.all([
      OrganizationMemberModel.countDocuments(instFilter),
      ClassModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        scheduledStartAt: { $gte: period.from, $lte: period.to },
        status: { $ne: 'CANCELLED' }
      })
    ]);

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      activeInstructorsCount: activeInstructors,
      scheduledWorkloadHours: 0,
      completedWorkloadHours: 0,
      totalClassesAssigned,
      pendingAttendanceCount: 0,
      pendingGradingCount: 0,
      instructorWorkloadDistribution: []
    };
  }

  // ==========================================
  // 9. BRANCH COMPARISON (HQ ALL & MULTI-BRANCH)
  // ==========================================
  public static async getBranchComparison(
    rawQuery: any,
    actor: AnalyticsActor
  ): Promise<BranchComparisonResponse> {
    const tenantId = this.getTenantId();
    const period = AnalyticsTimezoneService.resolvePeriod(rawQuery.from, rawQuery.to, rawQuery.timezone);
    const { scopeFilter, scopeMode, authorizedBranchIds } = await this.resolveBranchScope(tenantId, actor, rawQuery.branchId);

    const branchQuery: any = { tenantId: new Types.ObjectId(tenantId), status: 'ACTIVE' };
    if (scopeMode === 'SELECTED') {
      branchQuery._id = { $in: authorizedBranchIds.map((id) => new Types.ObjectId(id)) };
    }

    const branches = await BranchModel.find(branchQuery).sort({ isPrimary: -1, name: 1 }).lean();

    const comparisonList = await Promise.all(
      branches.map(async (b) => {
        const [activeStudents, collectionsAgg, scheduledClasses] = await Promise.all([
          StudentLifecycleModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), currentBranchId: b._id, currentStatus: 'ACTIVE' }),
          PaymentModel.aggregate([
            { $match: { tenantId: new Types.ObjectId(tenantId), branchId: b._id, status: 'SUCCESS', receivedAt: { $gte: period.from, $lte: period.to } } },
            { $group: { _id: null, total: { $sum: '$amountMinor' } } }
          ]),
          ClassModel.countDocuments({ tenantId: new Types.ObjectId(tenantId), branchId: b._id, scheduledStartAt: { $gte: period.from, $lte: period.to }, status: { $ne: 'CANCELLED' } })
        ]);

        return {
          branchId: b._id.toString(),
          branchName: b.name,
          branchCode: b.code,
          isPrimary: !!b.isPrimary,
          activeStudents,
          admissions: 0,
          collectionsMinor: collectionsAgg[0]?.total || 0,
          attendancePercentage: null,
          scheduledClasses
        };
      })
    );

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      branches: comparisonList
    };
  }
}
