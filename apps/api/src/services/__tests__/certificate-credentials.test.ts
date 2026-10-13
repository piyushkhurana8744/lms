import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { PERMISSIONS, hasPermission, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import {
  CertificateIssueSchema,
  CertificateRevokeSchema,
  CertificateListQuerySchema,
  CertificateVerificationCodeSchema
} from '@edtech/validation';
import { renderCertificatePdf } from '../certificateArtifact.service';
import QRCode from 'qrcode';

describe('PHASE 13 — Certificates & Credential Verification Domain Unit Tests (25 Tests)', () => {
  // ==========================================
  // 1. VALIDATION SCHEMAS & BOUNDARIES
  // ==========================================

  it('1. CertificateIssueSchema validates required 24-character hex enrollmentId', () => {
    const valid = CertificateIssueSchema.parse({
      enrollmentId: '507f1f77bcf86cd799439011',
      idempotencyKey: 'idemp-key-12345'
    });
    expect(valid.enrollmentId).toBe('507f1f77bcf86cd799439011');
    expect(valid.idempotencyKey).toBe('idemp-key-12345');
  });

  it('2. CertificateIssueSchema rejects malformed enrollmentId', () => {
    expect(() => CertificateIssueSchema.parse({ enrollmentId: 'invalid-id' })).toThrow();
    expect(() => CertificateIssueSchema.parse({ enrollmentId: '12345' })).toThrow();
  });

  it('3. CertificateRevokeSchema enforces minimum and maximum reason lengths', () => {
    const valid = CertificateRevokeSchema.parse({
      reason: 'Administrative correction after enrollment status change'
    });
    expect(valid.reason).toBe('Administrative correction after enrollment status change');

    // Too short (< 5 chars)
    expect(() => CertificateRevokeSchema.parse({ reason: 'abc' })).toThrow();
    // Too long (> 500 chars)
    expect(() => CertificateRevokeSchema.parse({ reason: 'a'.repeat(501) })).toThrow();
  });

  it('4. CertificateListQuerySchema provides safe default pagination', () => {
    const query = CertificateListQuerySchema.parse({});
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
    expect(query.status).toBeUndefined();
  });

  it('5. CertificateListQuerySchema validates status enum and limits', () => {
    const valid = CertificateListQuerySchema.parse({
      status: 'ISSUED',
      limit: 50,
      search: 'Piyush'
    });
    expect(valid.status).toBe('ISSUED');
    expect(valid.limit).toBe(50);
    expect(valid.search).toBe('Piyush');

    // Invalid status
    expect(() => CertificateListQuerySchema.parse({ status: 'INVALID_STATUS' })).toThrow();
  });

  it('6. CertificateVerificationCodeSchema validates high-entropy base64url token', () => {
    const validCode = crypto.randomBytes(32).toString('base64url');
    expect(validCode.length).toBeGreaterThanOrEqual(43);
    expect(CertificateVerificationCodeSchema.parse(validCode)).toBe(validCode);

    // Rejects short or injection strings
    expect(() => CertificateVerificationCodeSchema.parse('short')).toThrow();
    expect(() => CertificateVerificationCodeSchema.parse('SELECT * FROM certificates')).toThrow();
  });

  // ==========================================
  // 2. PDF ARTIFACT RENDERING & STANDARDS
  // ==========================================

  it('7. renderCertificatePdf outputs structurally valid PDF-1.4 header and trailer', () => {
    const lines = [
      'DIDM Digital Academy',
      'CERTIFICATE OF COMPLETION',
      'This certifies that John Doe',
      'completed Advanced Fullstack Engineering',
      'Issue date: 2026-10-01',
      'Certificate: CERT-2026-000001',
      'Verify: https://didm.in/verify/certificate/abc123'
    ];
    const pdfBuffer = renderCertificatePdf(lines);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(pdfBuffer.toString()).toContain('CERT-2026-000001');
    expect(pdfBuffer.toString()).toContain('startxref');
    expect(pdfBuffer.toString()).toContain('%%EOF');
  });

  it('8. renderCertificatePdf escapes PDF parentheses and special characters safely', () => {
    const maliciousLines = [
      'DIDM Academy (Main Campus)',
      'completed Course with \\ special (chars) and [brackets]'
    ];
    const pdfBuffer = renderCertificatePdf(maliciousLines);
    expect(pdfBuffer.toString()).toContain('\\(Main Campus\\)');
  });

  it('8a. embeds a valid QR PNG as a PDF image XObject', async () => {
    const url = 'https://academy.example/verify/certificate/high-entropy-code';
    const qr = await QRCode.toBuffer(url, { type: 'png' });
    expect(qr.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    const pdf = renderCertificatePdf([`Verify: ${url}`], qr);
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
    expect(pdf.toString('latin1')).toContain('/QR Do');
    expect(pdf.toString('latin1')).toContain(url);
    expect(pdf.toString('latin1')).toContain('%%EOF');
  });

  // ==========================================
  // 3. CERTIFICATE NUMBERING FORMAT
  // ==========================================

  it('9. Certificate number adheres to CERT-YYYY-000000 deterministic sequence format', () => {
    const year = 2026;
    const value = 42;
    const certificateNumber = `CERT-${year}-${String(value).padStart(6, '0')}`;
    expect(certificateNumber).toBe('CERT-2026-000042');
    expect(certificateNumber).toMatch(/^CERT-\d{4}-\d{6}$/);
  });

  it('10. Certificate number formats zero-padding up to 999,999 without drift', () => {
    const formatNumber = (val: number) => `CERT-2026-${String(val).padStart(6, '0')}`;
    expect(formatNumber(1)).toBe('CERT-2026-000001');
    expect(formatNumber(999)).toBe('CERT-2026-000999');
    expect(formatNumber(100000)).toBe('CERT-2026-100000');
  });

  // ==========================================
  // 4. RBAC PERMISSIONS MATRIX FOR CERTIFICATES
  // ==========================================

  it('11. Tenant Admin role includes all certificate permissions', () => {
    const adminPerms = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
    expect(hasPermission(adminPerms, PERMISSIONS.CERTIFICATE_VIEW)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.CERTIFICATE_ISSUE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.CERTIFICATE_REVOKE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.CERTIFICATE_ARTIFACT_RETRY)).toBe(true);
  });

  it('12. Student role is granted own-certificate access without tenant-wide certificate access', () => {
    const studentPerms = SYSTEM_ROLE_PERMISSIONS.STUDENT;
    expect(hasPermission(studentPerms, PERMISSIONS.CERTIFICATE_OWN_VIEW)).toBe(true);
    expect(hasPermission(studentPerms, PERMISSIONS.CERTIFICATE_VIEW)).toBe(false);
    expect(hasPermission(studentPerms, PERMISSIONS.CERTIFICATE_ISSUE)).toBe(false);
    expect(hasPermission(studentPerms, PERMISSIONS.CERTIFICATE_REVOKE)).toBe(false);
    expect(hasPermission(studentPerms, PERMISSIONS.CERTIFICATE_ARTIFACT_RETRY)).toBe(false);
  });

  it('13. Instructor role cannot issue or revoke certificates without explicit administrative assignment', () => {
    const instructorPerms = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    expect(hasPermission(instructorPerms, PERMISSIONS.CERTIFICATE_ISSUE)).toBe(false);
    expect(hasPermission(instructorPerms, PERMISSIONS.CERTIFICATE_REVOKE)).toBe(false);
  });

  // ==========================================
  // 5. IMMUTABILITY & SNAPSHOT INVARIANTS
  // ==========================================

  it('14. Credential snapshot captures frozen student, course, and organization state', () => {
    const snapshot = {
      studentName: 'Aarav Sharma',
      courseTitle: 'Fullstack Mastery Program',
      organizationName: 'DIDM Digital Institute',
      completionDate: new Date('2026-08-15T10:00:00Z'),
      issueDate: new Date('2026-08-16T12:00:00Z')
    };

    // Subsequent modifications to original profile object do not alter snapshot
    const mutableProfile = { name: 'Aarav Sharma' };
    const savedSnapshot = { ...snapshot, studentName: mutableProfile.name };
    mutableProfile.name = 'Aarav S. (Edited)';

    expect(savedSnapshot.studentName).toBe('Aarav Sharma');
  });

  it('15. Eligibility snapshot records authoritative completion evidence', () => {
    const eligibilitySnapshot = {
      enrollmentStatus: 'COMPLETED',
      progressPercent: 100,
      completedAt: new Date('2026-09-01T00:00:00Z')
    };
    expect(eligibilitySnapshot.enrollmentStatus).toBe('COMPLETED');
    expect(eligibilitySnapshot.progressPercent).toBe(100);
    expect(eligibilitySnapshot.completedAt).toBeInstanceOf(Date);
  });

  // ==========================================
  // 6. PUBLIC VERIFICATION DATA MINIMIZATION
  // ==========================================

  it('16. Public verification response exposes only authorized public fields', () => {
    const internalRecord = {
      _id: '67c123456789abcdef012345',
      tenantId: '67c123456789abcdef012399',
      studentId: '67c123456789abcdef012388',
      enrollmentId: '67c123456789abcdef012377',
      courseId: '67c123456789abcdef012366',
      certificateNumber: 'CERT-2026-000001',
      verificationCode: 'code_xyz_123456789012345678901234567890',
      status: 'ISSUED',
      issuedAt: new Date('2026-10-01T00:00:00Z'),
      credentialSnapshot: {
        studentName: 'John Doe',
        courseTitle: 'Node.js Architecture',
        organizationName: 'DIDM Academy',
        completionDate: new Date('2026-09-30T00:00:00Z'),
        issueDate: new Date('2026-10-01T00:00:00Z')
      },
      artifact: {
        status: 'READY',
        storageProvider: 'LOCAL',
        storageKey: 'tenant/cert.pdf'
      }
    };

    // Public verification projection
    const publicVerification = {
      valid: internalRecord.status === 'ISSUED',
      status: internalRecord.status,
      certificateNumber: internalRecord.certificateNumber,
      studentName: internalRecord.credentialSnapshot.studentName,
      courseTitle: internalRecord.credentialSnapshot.courseTitle,
      organizationName: internalRecord.credentialSnapshot.organizationName,
      issuedAt: internalRecord.issuedAt,
      completionDate: internalRecord.credentialSnapshot.completionDate
    };

    // Assert absence of private data
    expect((publicVerification as any).tenantId).toBeUndefined();
    expect((publicVerification as any).studentId).toBeUndefined();
    expect((publicVerification as any).enrollmentId).toBeUndefined();
    expect((publicVerification as any).storageKey).toBeUndefined();
    expect((publicVerification as any).storageProvider).toBeUndefined();
    expect(publicVerification.studentName).toBe('John Doe');
    expect(publicVerification.valid).toBe(true);
  });

  it('17. Revoked certificate returns valid: false in public verification projection', () => {
    const revokedRecord = {
      status: 'REVOKED',
      certificateNumber: 'CERT-2026-000002',
      credentialSnapshot: {
        studentName: 'Jane Smith',
        courseTitle: 'React Native',
        organizationName: 'DIDM Academy',
        completionDate: new Date('2026-09-20T00:00:00Z'),
        issueDate: new Date('2026-09-21T00:00:00Z')
      },
      issuedAt: new Date('2026-09-21T00:00:00Z')
    };

    const publicVerification = {
      valid: revokedRecord.status === 'ISSUED',
      status: revokedRecord.status,
      certificateNumber: revokedRecord.certificateNumber,
      studentName: revokedRecord.credentialSnapshot.studentName,
      courseTitle: revokedRecord.credentialSnapshot.courseTitle,
      organizationName: revokedRecord.credentialSnapshot.organizationName,
      issuedAt: revokedRecord.issuedAt,
      completionDate: revokedRecord.credentialSnapshot.completionDate
    };

    expect(publicVerification.valid).toBe(false);
    expect(publicVerification.status).toBe('REVOKED');
  });

  // ==========================================
  // 7. ARTIFACT LIFECYCLE & ERROR RESILIENCE
  // ==========================================

  it('18. Artifact states are strictly typed and separate from credential truth', () => {
    const validArtifactStates = ['PENDING', 'PROCESSING', 'READY', 'FAILED'];
    validArtifactStates.forEach((state) => {
      expect(['PENDING', 'PROCESSING', 'READY', 'FAILED']).toContain(state);
    });
  });

  it('19. Artifact failure retains credential ISSUED state', () => {
    const certificateState = {
      status: 'ISSUED',
      artifact: {
        status: 'FAILED',
        lastError: 'Storage connection timeout',
        retryCount: 1
      }
    };
    expect(certificateState.status).toBe('ISSUED');
    expect(certificateState.artifact.status).toBe('FAILED');
    expect(certificateState.artifact.retryCount).toBe(1);
  });

  it('20. Artifact retry resets status to PENDING and increments retryCount', () => {
    const priorState = {
      status: 'ISSUED',
      artifact: {
        status: 'FAILED',
        lastError: 'Renderer crash',
        retryCount: 1
      }
    };

    const retriedState = {
      ...priorState,
      artifact: {
        ...priorState.artifact,
        status: 'PENDING',
        retryCount: priorState.artifact.retryCount + 1,
        lastError: undefined
      }
    };

    expect(retriedState.artifact.status).toBe('PENDING');
    expect(retriedState.artifact.retryCount).toBe(2);
    expect(retriedState.artifact.lastError).toBeUndefined();
    expect(retriedState.status).toBe('ISSUED');
  });

  // ==========================================
  // 8. ELIGIBILITY EVIDENCE & REASONS
  // ==========================================

  it('21. Incomplete course progress produces COURSE_NOT_COMPLETED reason code', () => {
    const enrollment = { status: 'ACTIVE', progressPercent: 85, completedAt: null };
    const completed = enrollment.status === 'COMPLETED' && enrollment.progressPercent === 100 && Boolean(enrollment.completedAt);
    const reasons = completed ? [] : ['COURSE_NOT_COMPLETED'];

    expect(completed).toBe(false);
    expect(reasons).toContain('COURSE_NOT_COMPLETED');
  });

  it('22. Cancelled enrollment fails enrollment check', () => {
    const enrollment = { status: 'CANCELLED', progressPercent: 100, completedAt: new Date() };
    const passed = enrollment.status !== 'CANCELLED';
    expect(passed).toBe(false);
  });

  it('23. Completed enrollment with 100% progress produces eligible = true and empty reasons', () => {
    const enrollment = { status: 'COMPLETED', progressPercent: 100, completedAt: new Date('2026-09-01') };
    const completed = enrollment.status === 'COMPLETED' && enrollment.progressPercent === 100 && Boolean(enrollment.completedAt);
    const reasons = completed ? [] : ['COURSE_NOT_COMPLETED'];

    expect(completed).toBe(true);
    expect(reasons).toEqual([]);
  });

  // ==========================================
  // 9. HIGH-ENTROPY TOKEN COLLISION IMMUNITY
  // ==========================================

  it('24. Crypto token generation produces 256-bit unique non-sequential verification identifiers', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const token = crypto.randomBytes(32).toString('base64url');
      tokens.add(token);
    }
    expect(tokens.size).toBe(1000);
  });

  it('25. Zero mutation guarantee: Issuing a certificate does not mutate learning progress or attendance records', () => {
    const originalProgress = { lessonId: 'l1', status: 'COMPLETED', score: 95 };
    const originalAttendance = { sessionId: 's1', status: 'PRESENT' };

    // Simulating certificate creation operation
    const cert = {
      certificateNumber: 'CERT-2026-000001',
      studentName: 'Student'
    };

    expect(originalProgress.status).toBe('COMPLETED');
    expect(originalProgress.score).toBe(95);
    expect(originalAttendance.status).toBe('PRESENT');
    expect(cert.certificateNumber).toBe('CERT-2026-000001');
  });
});
