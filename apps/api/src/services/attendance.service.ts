import { Types } from 'mongoose';
import { AttendanceCorrectionModel, AttendanceRecordModel, AttendanceSessionModel, BatchModel, ClassModel, StudentLifecycleModel, runInTransaction } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { AttendanceAnalyticsQuerySchema, AttendanceHistoryQuerySchema, BulkMarkAttendanceSchema, CorrectAttendanceSchema } from '@edtech/validation';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';
import { StudentLifecycleService } from './studentLifecycle.service';
import { BranchAccessService } from './branchAccess.service';

type Actor = { userId: string; roles: string[]; isSuperAdmin?: boolean };
class AttendanceServiceImpl {
  private static tenant() { const id = getWorkspaceContext().currentTenantId; if (!id) throw new BadRequestError('Tenant workspace context missing'); return id; }
  private static admin(actor: Actor) { return actor.isSuperAdmin || actor.roles.includes('TENANT_ADMIN'); }
  private static async authorizeClass(classDoc: any, actor: Actor) {
    const tenantId = this.tenant();
    const branchId = classDoc.branchId?.toString();
    if (branchId) await BranchAccessService.assertBranchAccess(tenantId, actor, branchId, { requireActive: true });
    if (this.admin(actor)) return;
    if (!actor.roles.includes('INSTRUCTOR')) throw new ForbiddenError('Attendance class access denied');
    if (!classDoc.instructorId || classDoc.instructorId.toString() !== actor.userId) {
      throw new ForbiddenError('Instructor is not assigned to this class');
    }
  }
  private static counts(records: any[]) { const count = (s: string) => records.filter((r) => r.status === s).length; const marked = records.filter((r) => r.status).length; return { expected: records.length, marked, unmarked: records.length - marked, present: count('PRESENT'), absent: count('ABSENT'), late: count('LATE'), excused: count('EXCUSED') }; }
  private static async roster(session: any): Promise<any> { const records = await AttendanceRecordModel.find({ attendanceSessionId: session._id, tenantId: this.tenant() }).populate('studentId', 'name email avatarUrl').sort({ createdAt: 1 }).lean(); return { session: { id: session._id.toString(), classId: session.classId.toString(), batchId: session.batchId?.toString(), status: session.status, sessionDate: session.sessionDate, expected: session.expectedStudentCount, marked: session.markedStudentCount, finalizedAt: session.finalizedAt, scheduledSnapshot: session.scheduledSnapshot }, records: records.map((r: any) => ({ id: r._id.toString(), studentId: r.studentId?._id?.toString() || r.studentId.toString(), studentName: r.studentId?.name, studentEmail: r.studentId?.email, status: r.status, source: r.source, remarks: r.remarks, lateMinutes: r.lateMinutes, markedAt: r.markedAt, correctionCount: r.correctionCount })), counts: this.counts(records) }; }

  static async getByClass(classId: string, actor: Actor) { const tenantId = this.tenant(); const cls = await ClassModel.findOne({ _id: classId, tenantId }); if (!cls) throw new NotFoundError('Class not found'); await this.authorizeClass(cls, actor); const session = await AttendanceSessionModel.findOne({ tenantId, classId }); return session ? this.roster(session) : null; }
  static async open(classId: string, actor: Actor) {
    const tenantId = this.tenant(); const cls = await ClassModel.findOne({ _id: classId, tenantId }); if (!cls) throw new NotFoundError('Class not found'); await this.authorizeClass(cls, actor); if (cls.status === 'CANCELLED') throw new ConflictError('Attendance cannot be opened for a cancelled class');
    const existing = await AttendanceSessionModel.findOne({ tenantId, classId }); if (existing) return this.roster(existing);
    try { await runInTransaction(async (dbSession) => {
      const sessionDate = cls.startDate || (cls as any).scheduledDate || new Date();
      const baseEligible = (cls.enrolledStudents || []).filter((s: any) => s.status === 'ENROLLED' && (!cls.startDate || !s.enrolledAt || new Date(s.enrolledAt) <= cls.startDate));
      const eligible: any[] = [];
      for (const s of baseEligible) {
        if(!(await StudentLifecycleService.isStudentAcademicallyActiveAt(s.studentId,sessionDate,cls.courseId,cls.batchId)))continue;
        const lc = await StudentLifecycleModel.findOne({ tenantId, studentUserId: s.studentId }).session(dbSession).lean();
        if (lc) {
          if (lc.activatedAt && sessionDate < new Date(lc.activatedAt)) continue;
          if (lc.withdrawnAt && sessionDate >= new Date(lc.withdrawnAt)) continue;
          if (lc.droppedAt && sessionDate >= new Date(lc.droppedAt)) continue;
          let inHold = false;
          if (lc.currentHold && sessionDate >= new Date(lc.currentHold.effectiveFrom)) inHold = true;
          if (lc.holdHistory && Array.isArray(lc.holdHistory)) {
            for (const h of lc.holdHistory) {
              const start = new Date(h.effectiveFrom);
              const end = h.resumedAt ? new Date(h.resumedAt) : null;
              if (sessionDate >= start && (!end || sessionDate < end)) {
                inHold = true;
                break;
              }
            }
          }
          if (inHold) continue;
        }
        eligible.push(s);
      }
      const [created] = await AttendanceSessionModel.create([{
        tenantId,
        classId: cls._id,
        batchId: cls.batchId,
        courseId: cls.courseId,
        sessionDate,
        scheduledSnapshot: {
          name: cls.name || (cls as any).title || 'Class Session',
          mode: cls.mode || 'ONLINE',
          startDate: cls.startDate || sessionDate,
          endDate: cls.endDate,
          startTime: cls.timing?.startTime || (cls as any).startTime || '10:00 AM',
          endTime: cls.timing?.endTime || (cls as any).endTime || '12:00 PM',
          timezone: cls.timing?.timezone || 'Asia/Kolkata',
          branch: cls.classroomDetails?.branch
        },
        openedBy: actor.userId,
        expectedStudentCount: eligible.length,
        markedStudentCount: 0
      }], { session: dbSession });
      if (eligible.length) await AttendanceRecordModel.insertMany(eligible.map((s: any) => ({ tenantId, attendanceSessionId: created._id, classId: cls._id, batchId: cls.batchId, studentId: s.studentId, source: 'MANUAL', correctionCount: 0 })), { session: dbSession });
      await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'ATTENDANCE_OPENED', resource: 'AttendanceSession', resourceId: created._id.toString(), metadata: { classId, expected: eligible.length }, session: dbSession }); return created;
    }); } catch (error: any) { if (error?.code !== 11000) throw error; }
    const session = await AttendanceSessionModel.findOne({ tenantId, classId }); if (!session) throw new ConflictError('Attendance session opening conflicted'); return this.roster(session);
  }
  static async bulkMark(sessionId: string, raw: unknown, actor: Actor) {
    const tenantId = this.tenant(), payload = BulkMarkAttendanceSchema.parse(raw);
    await runInTransaction(async (dbSession) => { const session = await AttendanceSessionModel.findOne({ _id: sessionId, tenantId }).session(dbSession); if (!session) throw new NotFoundError('Attendance session not found'); if (session.status !== 'OPEN') throw new ConflictError('Finalized attendance cannot be marked'); const cls = await ClassModel.findOne({ _id: session.classId, tenantId }).session(dbSession); if (!cls) throw new NotFoundError('Class not found'); await this.authorizeClass(cls, actor); if (cls.status === 'CANCELLED') throw new ConflictError('Cancelled class attendance cannot be marked');
      const studentIds = payload.records.map((r) => new Types.ObjectId(r.studentId)); const count = await AttendanceRecordModel.countDocuments({ tenantId, attendanceSessionId: session._id, studentId: { $in: studentIds } }).session(dbSession); if (count !== payload.records.length) throw new BadRequestError('Every student must belong to the attendance roster');
      await AttendanceRecordModel.bulkWrite(payload.records.map((r) => ({ updateOne: { filter: { tenantId: new Types.ObjectId(tenantId), attendanceSessionId: session._id, studentId: new Types.ObjectId(r.studentId) }, update: { $set: { status: r.status, remarks: r.remarks, lateMinutes: r.status === 'LATE' ? (r.lateMinutes || 0) : undefined, source: 'MANUAL', markedAt: new Date(), markedBy: new Types.ObjectId(actor.userId) } } } })), { session: dbSession });
      session.markedStudentCount = await AttendanceRecordModel.countDocuments({ tenantId, attendanceSessionId: session._id, status: { $exists: true } }).session(dbSession); await session.save({ session: dbSession });
      return session;
    }); return this.roster(await AttendanceSessionModel.findById(sessionId));
  }
  static async markAllPresent(sessionId: string, actor: Actor) {
    const tenantId = this.tenant();
    const session = await AttendanceSessionModel.findOne({ _id: sessionId, tenantId });
    if (!session) throw new NotFoundError('Attendance session not found');
    if (session.status !== 'OPEN') throw new ConflictError('Finalized attendance cannot be marked');
    const unmarked = await AttendanceRecordModel.find({ tenantId, attendanceSessionId: session._id, status: { $exists: false } }).select('studentId').lean();
    if (!unmarked.length) return this.roster(session);
    return this.bulkMark(sessionId, { records: unmarked.map((r) => ({ studentId: r.studentId.toString(), status: 'PRESENT' })) }, actor);
  }
  static async finalize(sessionId: string, actor: Actor) { const tenantId = this.tenant(); await runInTransaction(async (dbSession) => { const session = await AttendanceSessionModel.findOne({ _id: sessionId, tenantId }).session(dbSession); if (!session) throw new NotFoundError('Attendance session not found'); const cls = await ClassModel.findOne({ _id: session.classId, tenantId }).session(dbSession); if (!cls) throw new NotFoundError('Class not found'); await this.authorizeClass(cls, actor); if (cls.status === 'CANCELLED') throw new ConflictError('Cancelled class attendance cannot be finalized'); if (session.status === 'FINALIZED') return session; const unmarked = await AttendanceRecordModel.countDocuments({ tenantId, attendanceSessionId: session._id, status: { $exists: false } }).session(dbSession); if (unmarked) throw new ConflictError(`${unmarked} attendance records remain unmarked`); session.status = 'FINALIZED'; session.finalizedAt = new Date(); session.finalizedBy = new Types.ObjectId(actor.userId); session.markedStudentCount = session.expectedStudentCount; await session.save({ session: dbSession }); await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'ATTENDANCE_FINALIZED', resource: 'AttendanceSession', resourceId: sessionId, metadata: { classId: session.classId.toString() }, session: dbSession }); return session; }); return this.roster(await AttendanceSessionModel.findById(sessionId)); }
  static async correct(recordId: string, raw: unknown, actor: Actor) { const tenantId = this.tenant(), payload = CorrectAttendanceSchema.parse(raw); await runInTransaction(async (dbSession) => { const record = await AttendanceRecordModel.findOne({ _id: recordId, tenantId }).session(dbSession); if (!record) throw new NotFoundError('Attendance record not found'); const session = await AttendanceSessionModel.findOne({ _id: record.attendanceSessionId, tenantId }).session(dbSession); if (!session || session.status !== 'FINALIZED') throw new ConflictError('Corrections require finalized attendance'); const cls = await ClassModel.findOne({ _id: session.classId, tenantId }).session(dbSession); if (!cls) throw new NotFoundError('Class not found'); await this.authorizeClass(cls, actor); if (payload.idempotencyKey) { const prior = await AttendanceCorrectionModel.findOne({ tenantId, idempotencyKey: payload.idempotencyKey }).session(dbSession); if (prior) return record; } if (!record.status) throw new ConflictError('Unmarked record cannot be corrected'); await AttendanceCorrectionModel.create([{ tenantId, attendanceRecordId: record._id, attendanceSessionId: session._id, previousStatus: record.status, newStatus: payload.status, reason: payload.reason, changedBy: actor.userId, changedAt: new Date(), idempotencyKey: payload.idempotencyKey }], { session: dbSession }); record.status = payload.status; record.markedAt = new Date(); record.markedBy = new Types.ObjectId(actor.userId); record.correctionCount += 1; await record.save({ session: dbSession }); await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'ATTENDANCE_CORRECTED', resource: 'AttendanceRecord', resourceId: recordId, metadata: { newStatus: payload.status, reason: payload.reason }, session: dbSession }); return record; }); return AttendanceRecordModel.findById(recordId).lean(); }
  static async corrections(sessionId: string, actor: Actor) {
    const tenantId = this.tenant();
    const session = await AttendanceSessionModel.findOne({ _id: sessionId, tenantId }).lean();
    if (!session) throw new NotFoundError('Attendance session not found');
    const cls = await ClassModel.findOne({ _id: session.classId, tenantId });
    if (!cls) throw new NotFoundError('Class not found');
    await this.authorizeClass(cls, actor);
    const corrections = await AttendanceCorrectionModel.find({ tenantId, attendanceSessionId: sessionId }).populate('changedBy', 'name email').sort({ changedAt: -1 }).lean();
    const records = await AttendanceRecordModel.find({ tenantId, _id: { $in: corrections.map((entry) => entry.attendanceRecordId) } }).populate('studentId', 'name email').lean();
    const students = new Map(records.map((record: any) => [record._id.toString(), { id: record.studentId?._id?.toString(), name: record.studentId?.name, email: record.studentId?.email }]));
    return corrections.map((entry) => ({ ...entry, student: students.get(entry.attendanceRecordId.toString()) }));
  }
  static async studentSummary(studentId: string) { const tenantId = this.tenant(); const records = await AttendanceRecordModel.find({ tenantId, studentId, status: { $exists: true } }).lean(); const sessionIds = records.map((r) => r.attendanceSessionId); const sessions = await AttendanceSessionModel.find({ tenantId, _id: { $in: sessionIds }, status: 'FINALIZED' }).lean(); const classIds = sessions.map((s) => s.classId); const activeClasses = await ClassModel.find({ tenantId, _id: { $in: classIds }, status: { $ne: 'CANCELLED' } }).select('_id').lean(); const valid = new Set(activeClasses.map((c) => c._id.toString())); const finalized = new Set(sessions.filter((s) => valid.has(s.classId.toString())).map((s) => s._id.toString())); const official = records.filter((r) => finalized.has(r.attendanceSessionId.toString())); const present = official.filter((r) => r.status === 'PRESENT').length, late = official.filter((r) => r.status === 'LATE').length, absent = official.filter((r) => r.status === 'ABSENT').length, excused = official.filter((r) => r.status === 'EXCUSED').length, denominator = present + late + absent; return { totalFinalizedEligibleSessions: official.length, attended: present + late, present, absent, late, excused, attendancePercentage: denominator ? Math.round(((present + late) / denominator) * 10000) / 100 : null }; }
  static async studentHistory(studentId: string, raw: unknown) { const tenantId = this.tenant(), q = AttendanceHistoryQuerySchema.parse(raw || {}), filter: any = { tenantId, studentId }; if (q.status) filter.status = q.status; const sessionFilter: any = { tenantId, status: 'FINALIZED' }; if (q.from || q.to) sessionFilter.sessionDate = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }; const sessions = await AttendanceSessionModel.find(sessionFilter).select('_id scheduledSnapshot sessionDate classId batchId').lean(); const map = new Map(sessions.map((s) => [s._id.toString(), s])); filter.attendanceSessionId = { $in: sessions.map((s) => s._id) }; const total = await AttendanceRecordModel.countDocuments(filter); const records = await AttendanceRecordModel.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(); return { data: records.map((r) => ({ ...r, session: map.get(r.attendanceSessionId.toString()) })), pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } }; }
  static async batchAnalytics(batchId: string, raw: unknown, actor: Actor) {
    const tenantId = this.tenant(), q = AttendanceAnalyticsQuerySchema.parse(raw || {});
    const batch = await BatchModel.findOne({ _id: batchId, tenantId });
    if (!batch) throw new NotFoundError('Batch not found');
    if (!this.admin(actor) && batch.instructorId?.toString() !== actor.userId) throw new ForbiddenError('Batch attendance access denied');
    const candidates = await AttendanceSessionModel.find({ tenantId, batchId, status: 'FINALIZED' }).select('_id classId').lean();
    const activeClassIds = await ClassModel.find({ tenantId, _id: { $in: candidates.map((session) => session.classId) }, status: { $ne: 'CANCELLED' } }).select('_id').lean();
    const active = new Set(activeClassIds.map((entry) => entry._id.toString()));
    const sessions = candidates.filter((session) => active.has(session.classId.toString()));
    const records = await AttendanceRecordModel.find({ tenantId, attendanceSessionId: { $in: sessions.map((session) => session._id) }, status: { $exists: true } }).populate('studentId', 'name email').lean();
    const grouped = new Map<string, any>();
    for (const record of records as any[]) {
      const id = record.studentId._id.toString();
      const row = grouped.get(id) || { studentId: id, studentName: record.studentId.name, studentEmail: record.studentId.email, present: 0, absent: 0, late: 0, excused: 0 };
      row[record.status.toLowerCase()]++;
      grouped.set(id, row);
    }
    const rows = [...grouped.values()].map((row) => {
      const denominator = row.present + row.late + row.absent;
      return { ...row, attended: row.present + row.late, attendancePercentage: denominator ? Math.round(((row.present + row.late) / denominator) * 10000) / 100 : null };
    });
    const measurable = rows.filter((row) => row.attendancePercentage !== null);
    const filtered = measurable.filter((row) => row.attendancePercentage < q.threshold);
    const totals = { present: records.filter((record) => record.status === 'PRESENT').length, absent: records.filter((record) => record.status === 'ABSENT').length, late: records.filter((record) => record.status === 'LATE').length, excused: records.filter((record) => record.status === 'EXCUSED').length };
    return { finalizedSessions: sessions.length, totals, averageAttendancePercentage: measurable.length ? Math.round(measurable.reduce((sum, row) => sum + row.attendancePercentage, 0) / measurable.length * 100) / 100 : null, threshold: q.threshold, students: filtered.slice((q.page - 1) * q.limit, q.page * q.limit), pagination: { page: q.page, limit: q.limit, total: filtered.length, totalPages: Math.ceil(filtered.length / q.limit) } };
  }
}
export const AttendanceService: any = AttendanceServiceImpl;
