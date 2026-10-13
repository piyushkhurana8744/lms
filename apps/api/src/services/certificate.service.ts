import crypto from 'crypto';
import { ClientSession, Types } from 'mongoose';
import { CertificateModel, CertificateSequenceModel, CourseModel, EnrollmentModel, NotificationIntentModel, OrganizationBrandingModel, TenantModel, UserModel, runInTransaction } from '@edtech/database';
import { getWorkspaceContext, logger, tenantContextStorage } from '@edtech/utils';
import { CertificateIssueSchema, CertificateListQuerySchema, CertificateRevokeSchema, CertificateVerificationCodeSchema } from '@edtech/validation';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/appError';
import { AuditService } from './audit.service';
import { CertificateArtifactService } from './certificateArtifact.service';
import { NotificationService } from './notification.service';

type Actor = { userId: string };
export class CertificateService {
  private static tenant() { const tenantId = getWorkspaceContext().currentTenantId; if (!tenantId) throw new BadRequestError('Tenant workspace context missing'); return tenantId; }
  private static async number(tenantId: string, session: ClientSession) { const year = new Date().getUTCFullYear(); const counter = await CertificateSequenceModel.findOneAndUpdate({ tenantId, year }, { $inc: { value: 1 }, $setOnInsert: { tenantId, year } }, { upsert: true, new: true, session, setDefaultsOnInsert: true }); return `CERT-${year}-${String(counter.value).padStart(6, '0')}`; }
  private static dto(certificate: any) { return { id: certificate._id.toString(), certificateNumber: certificate.certificateNumber, verificationCode: certificate.verificationCode, verificationUrl: `/verify/certificate/${certificate.verificationCode}`, student: { name: certificate.credentialSnapshot.studentName }, course: { title: certificate.credentialSnapshot.courseTitle }, organization: { name: certificate.credentialSnapshot.organizationName }, completionDate: certificate.credentialSnapshot.completionDate, issuedAt: certificate.issuedAt, status: certificate.status, artifact: { status: certificate.artifact?.status || 'PENDING', generatedAt: certificate.artifact?.generatedAt, retryCount: certificate.artifact?.retryCount || 0 }, revokedAt: certificate.revokedAt, revocationReason: certificate.revocationReason }; }

  static async eligibility(enrollmentId: string) {
    const tenantId = this.tenant();
    if (!Types.ObjectId.isValid(enrollmentId)) throw new BadRequestError('Invalid enrollment ID');
    const enrollment = await EnrollmentModel.findOne({ _id: enrollmentId, tenantId }).lean();
    if (!enrollment) throw new NotFoundError('Enrollment not found');
    const [student, course] = await Promise.all([UserModel.findOne({ _id: enrollment.studentId, tenantId }).select('name').lean(), CourseModel.findOne({ _id: enrollment.courseId, tenantId }).select('title').lean()]);
    if (!student || !course) throw new NotFoundError('Enrollment relationship not found');
    const completed = enrollment.status === 'COMPLETED' && enrollment.progressPercent === 100 && Boolean(enrollment.completedAt);
    const reasons = completed ? [] : ['COURSE_NOT_COMPLETED'];
    return { eligible: completed, enrollmentId: enrollment._id.toString(), student: { id: student._id.toString(), name: student.name }, course: { id: course._id.toString(), title: course.title }, checks: { enrollment: { passed: enrollment.status !== 'CANCELLED', status: enrollment.status }, courseCompletion: { passed: completed, progressPercent: enrollment.progressPercent, completedAt: enrollment.completedAt || null }, assessments: { passed: true, policy: 'NO_REQUIRED_ASSESSMENT_POLICY' }, attendance: { passed: true, policy: 'NO_MINIMUM_ATTENDANCE_POLICY' }, finance: { passed: true, policy: 'NOT_AN_ELIGIBILITY_CRITERION' } }, reasons };
  }

  static async issue(raw: unknown, actor: Actor) {
    const tenantId = this.tenant(), payload = CertificateIssueSchema.parse(raw);
    const evidence = await this.eligibility(payload.enrollmentId);
    if (!evidence.eligible) throw new ConflictError('Enrollment is not eligible for certificate issuance', { reasons: evidence.reasons });
    const existing = await CertificateModel.findOne({ tenantId, enrollmentId: payload.enrollmentId, status: 'ISSUED' });
    let certificate = existing;
    if (!certificate) {
      try {
        certificate = await runInTransaction(async (session) => {
          const active = await CertificateModel.findOne({ tenantId, enrollmentId: payload.enrollmentId, status: 'ISSUED' }).session(session);
          if (active) return active;
          const enrollment = await EnrollmentModel.findOne({ _id: payload.enrollmentId, tenantId, status: 'COMPLETED', progressPercent: 100, completedAt: { $exists: true } }).session(session);
          if (!enrollment?.completedAt) throw new ConflictError('Enrollment is no longer eligible');
          const [student, course, tenant, branding] = await Promise.all([UserModel.findOne({ _id: enrollment.studentId, tenantId }).session(session), CourseModel.findOne({ _id: enrollment.courseId, tenantId }).session(session), TenantModel.findById(tenantId).session(session), OrganizationBrandingModel.findOne({ tenantId }).session(session)]);
          if (!student || !course || !tenant) throw new NotFoundError('Certificate identity source not found');
          const issuedAt = new Date();
          const [created] = await CertificateModel.create([{ tenantId, certificateNumber: await this.number(tenantId, session), verificationCode: crypto.randomBytes(32).toString('base64url'), studentId: student._id, enrollmentId: enrollment._id, courseId: course._id, status: 'ISSUED', issuedAt, issuedBy: actor.userId, eligibilitySnapshot: { enrollmentStatus: enrollment.status, progressPercent: enrollment.progressPercent, completedAt: enrollment.completedAt }, credentialSnapshot: { studentName: student.name, courseTitle: course.title, organizationName: branding?.organizationName || tenant.branding?.companyName || tenant.name, completionDate: enrollment.completedAt, issueDate: issuedAt }, artifact: { status: 'PENDING', retryCount: 0 } }], { session });
          await NotificationIntentModel.create([{ tenantId, eventId: `certificate.issued:${created._id}`, type: 'certificate.issued', recipientUserId: student._id, sourceType: 'Certificate', sourceId: created._id.toString(), occurrenceKey: 'issued', data: { courseTitle: course.title, certificateNumber: created.certificateNumber }, status: 'PENDING', availableAt: new Date(), attemptCount: 0 }], { session });
          await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'CERTIFICATE_ISSUED', resource: 'Certificate', resourceId: created._id.toString(), metadata: { enrollmentId: enrollment._id.toString() }, session });
          return created;
        });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        certificate = await CertificateModel.findOne({ tenantId, enrollmentId: payload.enrollmentId, status: 'ISSUED' });
        if (!certificate) throw error;
      }
    }
    if (!certificate) throw new NotFoundError('Certificate not found after issuance');
    if (certificate.artifact?.status !== 'READY') { try { certificate = await CertificateArtifactService.generate(certificate._id.toString()); } catch { certificate = await CertificateModel.findById(certificate._id); } }
    if (!certificate) throw new NotFoundError('Certificate not found after artifact generation');
    await NotificationService.consumeOutboxEvent(`certificate.issued:${certificate._id}`).catch((error) => logger.error('[Notification] Certificate issued handoff failed', error));
    return this.dto(certificate);
  }

  static async list(raw: unknown) { const tenantId = this.tenant(), query = CertificateListQuerySchema.parse(raw || {}), filter: any = { tenantId }; if (query.status) filter.status = query.status; if (query.courseId) filter.courseId = query.courseId; if (query.search) filter.$or = [{ certificateNumber: { $regex: query.search, $options: 'i' } }, { 'credentialSnapshot.studentName': { $regex: query.search, $options: 'i' } }, { 'credentialSnapshot.courseTitle': { $regex: query.search, $options: 'i' } }]; const total = await CertificateModel.countDocuments(filter); const rows = await CertificateModel.find(filter).sort({ issuedAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(); return { data: rows.map(this.dto), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; }
  static async studentList(studentId: string) { const rows = await CertificateModel.find({ tenantId: this.tenant(), studentId }).sort({ issuedAt: -1 }).lean(); return rows.map(this.dto); }
  static async getForDownload(id: string, studentId?: string) { const query: any = { _id: id, tenantId: this.tenant() }; if (studentId) { query.studentId = studentId; query.status = 'ISSUED'; } const certificate = await CertificateModel.findOne(query); if (!certificate) throw new NotFoundError('Certificate not found'); return certificate; }
  static async revoke(id: string, raw: unknown, actor: Actor) { const tenantId = this.tenant(), payload = CertificateRevokeSchema.parse(raw); const certificate = await runInTransaction(async (session) => { const updated = await CertificateModel.findOneAndUpdate({ _id: id, tenantId, status: 'ISSUED' }, { $set: { status: 'REVOKED', revokedAt: new Date(), revokedBy: actor.userId, revocationReason: payload.reason } }, { new: true, session }); if (updated) { await NotificationIntentModel.create([{ tenantId, eventId: `certificate.revoked:${updated._id}`, type: 'certificate.revoked', recipientUserId: updated.studentId, sourceType: 'Certificate', sourceId: updated._id.toString(), occurrenceKey: 'revoked', data: { certificateNumber: updated.certificateNumber }, status: 'PENDING', availableAt: new Date(), attemptCount: 0 }], { session }); await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'CERTIFICATE_REVOKED', resource: 'Certificate', resourceId: id, metadata: { reason: payload.reason }, session }); return updated; } const existing = await CertificateModel.findOne({ _id: id, tenantId }).session(session); if (!existing) throw new NotFoundError('Certificate not found'); return existing; }); await NotificationService.consumeOutboxEvent(`certificate.revoked:${certificate._id}`).catch((error) => logger.error('[Notification] Certificate revoked handoff failed', error)); return this.dto(certificate); }
  static async retry(id: string, actor: Actor) { const certificate = await CertificateModel.findOne({ _id: id, tenantId: this.tenant() }); if (!certificate) throw new NotFoundError('Certificate not found'); if (certificate.artifact?.status === 'PROCESSING') throw new ConflictError('Certificate artifact is processing'); await CertificateModel.updateOne({ _id: certificate._id }, { $set: { 'artifact.status': 'PENDING' }, $inc: { 'artifact.retryCount': 1 }, $unset: { 'artifact.lastError': 1, 'artifact.leaseUntil': 1 } }); await AuditService.logEvent({ actorId: actor.userId, tenantId: this.tenant(), action: 'CERTIFICATE_ARTIFACT_RETRY', resource: 'Certificate', resourceId: id }); return this.dto(await CertificateArtifactService.generate(id)); }
  static async verify(code: string) { CertificateVerificationCodeSchema.parse(code); const certificate = await CertificateModel.findOne({ verificationCode: code }).setOptions({ bypassTenantFilter: true }).lean(); if (!certificate) throw new NotFoundError('Credential not found'); const snapshot = certificate.credentialSnapshot; return { valid: certificate.status === 'ISSUED', status: certificate.status, certificateNumber: certificate.certificateNumber, studentName: snapshot.studentName, courseTitle: snapshot.courseTitle, organizationName: snapshot.organizationName, issuedAt: certificate.issuedAt, completionDate: snapshot.completionDate }; }
  static async trustedGenerate(id: string) { const certificate = await CertificateModel.findById(id).setOptions({ bypassTenantFilter: true }).select('tenantId'); if (!certificate) throw new NotFoundError('Certificate not found'); const tenantId = certificate.tenantId.toString(); return tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: 'certificate-worker', isPlatformContext: false, allowedTenantIds: [tenantId] }, () => CertificateArtifactService.generate(id)); }
}
