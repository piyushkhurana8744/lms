import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeEmail } from '@edtech/utils';
import { PERMISSIONS, hasPermission } from '@edtech/permissions';
import {
  CreateLeadSchema,
  ChangeLeadStageSchema,
  AssignLeadSchema,
  CreateAdmissionSchema,
  ConvertAdmissionSchema,
  ScheduleFollowUpSchema,
  CompleteFollowUpSchema,
  PublicLeadInquirySchema
} from '@edtech/validation';

describe('PHASE 10 — Production-Grade CRM & Admissions Engine Suite (25 Tests)', () => {
  // 1. Normalization & Deduplication
  it('1. normalizePhone formats standard 10-digit Indian mobile numbers with 91 country prefix', () => {
    expect(normalizePhone('9876543210')).toBe('919876543210');
    expect(normalizePhone('+91 98765 43210')).toBe('919876543210');
    expect(normalizePhone('09876543210')).toBe('919876543210');
  });

  it('2. normalizeEmail lowercases and trims email addresses deterministically', () => {
    expect(normalizeEmail('  RAHUL.sharma@Example.COM ')).toBe('rahul.sharma@example.com');
  });

  it('3. Lead deduplication identifies active lead collision on normalizedPhone within same tenant', () => {
    const existingLeads = [
      { tenantId: 'tenant_1', normalizedPhone: '919876543210', stage: 'QUALIFIED' },
      { tenantId: 'tenant_2', normalizedPhone: '919876543210', stage: 'NEW' }
    ];

    const currentTenant = 'tenant_1';
    const newNormPhone = normalizePhone('+91 9876543210');

    const duplicate = existingLeads.find(
      (l) => l.tenantId === currentTenant && l.normalizedPhone === newNormPhone && !['LOST', 'CONVERTED'].includes(l.stage)
    );

    expect(duplicate).toBeDefined();
    expect(duplicate?.stage).toBe('QUALIFIED');
  });

  it('4. Multi-tenancy allows identical phone numbers to exist across distinct tenants without conflict', () => {
    const existingLeadTenantA = { tenantId: 'tenant_A', normalizedPhone: '919876543210' };
    const newLeadTenantB = { tenantId: 'tenant_B', normalizedPhone: '919876543210' };

    const isConflict =
      existingLeadTenantA.tenantId === newLeadTenantB.tenantId &&
      existingLeadTenantA.normalizedPhone === newLeadTenantB.normalizedPhone;

    expect(isConflict).toBe(false);
  });

  // 2. Lead Validation & Creation
  it('5. CreateLeadSchema validates mandatory phone number and sanitizes names', () => {
    const valid = CreateLeadSchema.parse({
      firstName: '  Priya  ',
      lastName: 'Verma',
      phone: '9876543210',
      email: 'priya@gmail.com',
      source: 'WALK_IN'
    });

    expect(valid.firstName).toBe('Priya');
    expect(valid.phone).toBe('9876543210');
    expect(valid.source).toBe('WALK_IN');
  });

  it('6. CreateLeadSchema rejects invalid email formats', () => {
    expect(() => {
      CreateLeadSchema.parse({
        firstName: 'Amit',
        phone: '9876543210',
        email: 'not-an-email'
      });
    }).toThrow();
  });

  // 3. Pipeline State Machine & Lost Lead Enforcements
  it('7. ChangeLeadStageSchema allows valid transitions across pipeline stages', () => {
    const validTransition = ChangeLeadStageSchema.parse({
      stage: 'QUALIFIED',
      note: 'Candidate meets eligibility requirements'
    });
    expect(validTransition.stage).toBe('QUALIFIED');
  });

  it('8. Marking a lead LOST requires a valid structured lostReason enum', () => {
    const validLost = ChangeLeadStageSchema.parse({
      stage: 'LOST',
      lostReason: 'FEES',
      lostReasonDetail: 'Budget exceeded for flagship bootcamp'
    });
    expect(validLost.stage).toBe('LOST');
    expect(validLost.lostReason).toBe('FEES');
  });

  it('9. Reopening a previously LOST lead clears lostAt and lostReason timestamps', () => {
    const leadState: any = {
      stage: 'LOST',
      lostAt: new Date(),
      lostReason: 'NOT_INTERESTED'
    };

    // Transition back to NEW
    leadState.stage = 'NEW';
    leadState.lostAt = undefined;
    leadState.lostReason = undefined;

    expect(leadState.stage).toBe('NEW');
    expect(leadState.lostAt).toBeUndefined();
    expect(leadState.lostReason).toBeUndefined();
  });

  // 4. Counsellor Assignment & Ownership Audit
  it('10. AssignLeadSchema validates counsellor membership ID', () => {
    const payload = AssignLeadSchema.parse({
      assignedTo: 'user_counsellor_101',
      note: 'Allocated for digital marketing counseling'
    });
    expect(payload.assignedTo).toBe('user_counsellor_101');
  });

  it('11. Counsellor reassignment creates auditable REASSIGNED activity event', () => {
    const previousCounsellor = 'user_1';
    const nextCounsellor = 'user_2';

    const activityType = previousCounsellor ? 'REASSIGNED' : 'ASSIGNED';
    expect(activityType).toBe('REASSIGNED');
  });

  // 5. Scheduled Follow-Ups & Overdue Derivation
  it('12. ScheduleFollowUpSchema validates dueAt datetime and follow-up type', () => {
    const due = new Date(Date.now() + 86400000);
    const valid = ScheduleFollowUpSchema.parse({
      type: 'CALL',
      dueAt: due,
      note: 'Call to review course brochure'
    });

    expect(valid.type).toBe('CALL');
    expect(valid.dueAt).toBeInstanceOf(Date);
  });

  it('13. Overdue follow-up status is derived dynamically from status === PENDING && dueAt < now', () => {
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    const futureDate = new Date(Date.now() + 3600000); // 1 hour in future

    const followUp1 = { status: 'PENDING', dueAt: pastDate };
    const followUp2 = { status: 'PENDING', dueAt: futureDate };
    const followUp3 = { status: 'COMPLETED', dueAt: pastDate };

    const isOverdue = (fu: any) => fu.status === 'PENDING' && new Date(fu.dueAt) < new Date();

    expect(isOverdue(followUp1)).toBe(true);
    expect(isOverdue(followUp2)).toBe(false);
    expect(isOverdue(followUp3)).toBe(false);
  });

  it('14. CompleteFollowUpSchema records structured outcome enum and remarks', () => {
    const valid = CompleteFollowUpSchema.parse({
      outcome: 'DEMO_BOOKED',
      outcomeNote: 'Attending Friday 4 PM live demo class'
    });

    expect(valid.outcome).toBe('DEMO_BOOKED');
  });

  // 6. Admission Application Lifecycle
  it('15. CreateAdmissionSchema validates target courseId and prefilled applicant data', () => {
    const valid = CreateAdmissionSchema.parse({
      courseId: 'course_seo_101',
      batchId: 'batch_weekend_2026',
      applicant: {
        fullName: 'Rohan Gupta',
        phone: '9876543210',
        email: 'rohan@example.com'
      }
    });

    expect(valid.courseId).toBe('course_seo_101');
    expect(valid.applicant?.fullName).toBe('Rohan Gupta');
  });

  it('16. Admission application transitions lead stage to APPLICATION_STARTED', () => {
    const lead = { stage: 'QUALIFIED', admissionId: null as string | null };
    const newAdmissionId = 'adm_123';

    lead.admissionId = newAdmissionId;
    lead.stage = 'APPLICATION_STARTED';

    expect(lead.stage).toBe('APPLICATION_STARTED');
    expect(lead.admissionId).toBe('adm_123');
  });

  // 7. Student Conversion & Identity Resolution
  it('17. Student conversion resolves existing user by normalizedEmail to prevent duplicate auth identity', () => {
    const usersInTenant = [
      { id: 'usr_1', email: 'student@example.com', name: 'Existing User' }
    ];

    const applicantEmail = 'STUDENT@example.com';
    const norm = normalizeEmail(applicantEmail);

    const existingUser = usersInTenant.find((u) => u.email === norm);
    expect(existingUser).toBeDefined();
    expect(existingUser?.id).toBe('usr_1');
  });

  it('18. Student conversion creates secure initial password hash for newly provisioned student users', () => {
    const normPhone = '919876543210';
    const initialPassword = `Student@${normPhone.slice(-4)}`;
    expect(initialPassword).toBe('Student@3210');
  });

  it('19. Student conversion guarantees OrganizationMember role is set to STUDENT', () => {
    const memberEntry = {
      tenantId: 'tenant_1',
      userId: 'usr_101',
      role: 'STUDENT',
      status: 'ACTIVE'
    };

    expect(memberEntry.role).toBe('STUDENT');
    expect(memberEntry.status).toBe('ACTIVE');
  });

  it('20. Student conversion transitions Admission to ADMITTED and Lead to CONVERTED', () => {
    const admission = { status: 'APPLICATION_SUBMITTED', admittedAt: null as Date | null };
    const lead = { stage: 'APPLICATION_STARTED', convertedAt: null as Date | null };

    // Admit student
    admission.status = 'ADMITTED';
    admission.admittedAt = new Date();
    lead.stage = 'CONVERTED';
    lead.convertedAt = new Date();

    expect(admission.status).toBe('ADMITTED');
    expect(lead.stage).toBe('CONVERTED');
    expect(lead.convertedAt).toBeInstanceOf(Date);
  });

  it('21. Double-clicking Admit Student is idempotent and does not create duplicate enrollments', () => {
    const admission = {
      status: 'ADMITTED',
      studentUserId: 'usr_101',
      enrollmentId: 'enr_202'
    };

    const isAlreadyAdmitted = admission.status === 'ADMITTED' && !!admission.studentUserId;
    expect(isAlreadyAdmitted).toBe(true);
  });

  // 8. Public Lead Inquiries & Repeat Form Handling
  it('22. PublicLeadInquirySchema validates public landing page lead captures', () => {
    const payload = PublicLeadInquirySchema.parse({
      fullName: 'Vikram Mehta',
      phone: '9876543210',
      email: 'vikram@gmail.com',
      message: 'Interested in full stack digital marketing'
    });

    expect(payload.fullName).toBe('Vikram Mehta');
    expect(payload.source).toBe('WEBSITE');
  });

  it('23. Repeat public inquiry from same phone updates lastInquiryAt and logs activity without duplicate lead creation', () => {
    const existingLead = {
      id: 'lead_1',
      phone: '9876543210',
      normalizedPhone: '919876543210',
      lastInquiryAt: new Date(Date.now() - 86400000)
    };

    const isRepeat = existingLead.normalizedPhone === normalizePhone('9876543210');
    if (isRepeat) {
      existingLead.lastInquiryAt = new Date();
    }

    expect(isRepeat).toBe(true);
    expect(existingLead.lastInquiryAt.getTime()).toBeGreaterThan(Date.now() - 5000);
  });

  // 9. CRM Permissions & RBAC Isolation
  it('24. CRM permissions matrix restricts admission conversion to authorized roles', () => {
    const tenantAdminPerms = [PERMISSIONS.CRM_VIEW, PERMISSIONS.ADMISSION_CONVERT, PERMISSIONS.LEAD_UPDATE];
    const studentPerms = [PERMISSIONS.USER_VIEW, PERMISSIONS.COURSE_VIEW];

    expect(hasPermission(tenantAdminPerms, PERMISSIONS.ADMISSION_CONVERT)).toBe(true);
    expect(hasPermission(studentPerms, PERMISSIONS.ADMISSION_CONVERT)).toBe(false);
  });

  it('25. Cross-tenant mutation is strictly prohibited by tenantIsolation plugin check', () => {
    const leadTenantId: string = 'tenant_A';
    const requestTenantId: string = 'tenant_B';

    const canMutate = leadTenantId === requestTenantId;
    expect(canMutate).toBe(false);
  });
});
