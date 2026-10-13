/**
 * Granular Permission Identifiers & RBAC Matrix (@edtech/permissions)
 * Foundation for DIDM LMS Platform Authorization
 */

export const PERMISSIONS = {
  // Tenant-Scoped User & Role Permissions
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  TENANT_VIEW: 'tenant.view',
  TENANT_MANAGE: 'tenant.manage',

  ROLE_VIEW: 'role.view',
  ROLE_MANAGE: 'role.manage',

  // Course Domain Permissions (STEP 3A & STEP 3F)
  COURSE_VIEW: 'course.view',
  COURSE_CREATE: 'course.create',
  COURSE_UPDATE: 'course.update',
  COURSE_ARCHIVE: 'course.archive',
  COURSE_PUBLISH: 'course.publish',
  COURSE_SUBMIT_REVIEW: 'course.submit_review',

  // Course Module Domain Permissions (STEP 3B)
  COURSE_MODULE_VIEW: 'course.module.view',
  COURSE_MODULE_CREATE: 'course.module.create',
  COURSE_MODULE_UPDATE: 'course.module.update',
  COURSE_MODULE_ARCHIVE: 'course.module.archive',

  // Lesson Domain Permissions (STEP 3C)
  LESSON_VIEW: 'lesson.view',
  LESSON_CREATE: 'lesson.create',
  LESSON_UPDATE: 'lesson.update',
  LESSON_ARCHIVE: 'lesson.archive',

  // Media Management Permissions (STEP 3E)
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',

  // Enrollment & Student Progress Permissions (STEP 4)
  ENROLLMENT_VIEW: 'enrollment.view',
  ENROLLMENT_CREATE: 'enrollment.create',
  ENROLLMENT_UPDATE: 'enrollment.update',
  PROGRESS_VIEW: 'progress.view',
  PROGRESS_UPDATE: 'progress.update',

  // Organization Settings & Website CMS Permissions (STEP 4A, 4C & 4D)
  ORGANIZATION_SETTINGS_VIEW: 'organization.settings.view',
  ORGANIZATION_SETTINGS_UPDATE: 'organization.settings.update',
  ORGANIZATION_BRANDING_VIEW: 'organization.branding.view',
  ORGANIZATION_BRANDING_UPDATE: 'organization.branding.update',
  ORGANIZATION_WEBSITE_VIEW: 'organization.website.view',
  ORGANIZATION_WEBSITE_UPDATE: 'organization.website.update',
  ORGANIZATION_WEBSITE_PUBLISH: 'organization.website.publish',

  // Organization Team & Member Permissions (STEP 4F)
  ORGANIZATION_MEMBERS_VIEW: 'organization.members.view',
  ORGANIZATION_MEMBERS_INVITE: 'organization.members.invite',
  ORGANIZATION_MEMBERS_UPDATE: 'organization.members.update',
  ORGANIZATION_MEMBERS_SUSPEND: 'organization.members.suspend',
  ORGANIZATION_MEMBERS_REMOVE: 'organization.members.remove',

  // Organization Email & Notification Permissions (STEP 4G)
  ORGANIZATION_EMAIL_VIEW: 'organization.email.view',
  ORGANIZATION_EMAIL_UPDATE: 'organization.email.update',
  ORGANIZATION_EMAIL_TEST: 'organization.email.test',
  ORGANIZATION_EMAIL_DELETE: 'organization.email.delete',
  ORGANIZATION_NOTIFICATIONS_UPDATE: 'organization.notifications.update',

  // Organization Custom Domain & White-label Permissions (STEP 4H)
  ORGANIZATION_DOMAIN_VIEW: 'organization.domain.view',
  ORGANIZATION_DOMAIN_UPDATE: 'organization.domain.update',
  ORGANIZATION_DOMAIN_VERIFY: 'organization.domain.verify',
  ORGANIZATION_DOMAIN_DISCONNECT: 'organization.domain.disconnect',
  ORGANIZATION_WHITELABEL_UPDATE: 'organization.whitelabel.update',

  // Organization Onboarding Permissions (STEP 4I)
  ORGANIZATION_ONBOARDING_VIEW: 'organization.onboarding.view',
  ORGANIZATION_ONBOARDING_UPDATE: 'organization.onboarding.update',

  // Batch & Class Domain Permissions
  BATCH_VIEW: 'batch.view',
  BATCH_CREATE: 'batch.create',
  BATCH_UPDATE: 'batch.update',
  BATCH_DELETE: 'batch.delete',

  CLASS_VIEW: 'class.view',
  CLASS_CREATE: 'class.create',
  CLASS_UPDATE: 'class.update',
  CLASS_DELETE: 'class.delete',
  CLASS_ENROLL: 'class.enroll',

  WEBSITE_SETTINGS_VIEW: 'website.settings.view',
  WEBSITE_SETTINGS_UPDATE: 'website.settings.update',
  WEBSITE_SETTINGS_PUBLISH: 'website.settings.publish',

  // Assessment & Quiz Domain Permissions
  ASSESSMENT_VIEW: 'assessment.view',
  ASSESSMENT_CREATE: 'assessment.create',
  ASSESSMENT_UPDATE: 'assessment.update',
  ASSESSMENT_DELETE: 'assessment.delete',
  ASSESSMENT_GRADE: 'assessment.grade',
  ASSESSMENT_SUBMIT: 'assessment.submit',

  // Phase 10: CRM & Admissions Domain Permissions
  CRM_VIEW: 'crm.view',
  LEAD_CREATE: 'lead.create',
  LEAD_UPDATE: 'lead.update',
  LEAD_ASSIGN: 'lead.assign',
  LEAD_DELETE: 'lead.delete',
  LEAD_ACTIVITY_CREATE: 'lead.activity.create',
  FOLLOW_UP_MANAGE: 'followup.manage',
  ADMISSION_VIEW: 'admission.view',
  ADMISSION_CREATE: 'admission.create',
  ADMISSION_UPDATE: 'admission.update',
  ADMISSION_APPROVE: 'admission.approve',
  ADMISSION_CONVERT: 'admission.convert',

  // Phase 11: Finance, Fees & Payments Domain Permissions
  FEE_VIEW: 'fee.view',
  FEE_STRUCTURE_MANAGE: 'fee.structure.manage',
  FEE_PLAN_CREATE: 'fee.plan.create',
  FEE_PLAN_UPDATE: 'fee.plan.update',
  DISCOUNT_APPLY: 'fee.discount.apply',
  DISCOUNT_APPROVE: 'fee.discount.approve',
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_COLLECT: 'payment.collect',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_RECONCILE: 'payment.reconcile',
  PAYMENT_GATEWAY_MANAGE: 'payment.gateway.manage',
  FINANCE_REPORT_VIEW: 'finance.report.view',
  ATTENDANCE_VIEW: 'attendance.view',
  ATTENDANCE_MARK: 'attendance.mark',
  ATTENDANCE_FINALIZE: 'attendance.finalize',
  ATTENDANCE_CORRECT: 'attendance.correct',
  ATTENDANCE_REPORT_VIEW: 'attendance.report.view',
  CERTIFICATE_VIEW: 'certificate.view',
  CERTIFICATE_OWN_VIEW: 'certificate.own.view',
  CERTIFICATE_ISSUE: 'certificate.issue',
  CERTIFICATE_REVOKE: 'certificate.revoke',
  CERTIFICATE_ARTIFACT_RETRY: 'certificate.artifact.retry',
  ACADEMIC_CALENDAR_VIEW: 'academic.calendar.view',
  ACADEMIC_CALENDAR_MANAGE: 'academic.calendar.manage',
  TIMETABLE_VIEW: 'timetable.view',
  TIMETABLE_CREATE: 'timetable.create',
  TIMETABLE_UPDATE: 'timetable.update',
  TIMETABLE_PUBLISH: 'timetable.publish',
  SCHEDULE_CLASS_CREATE: 'schedule.class.create',
  SCHEDULE_CLASS_RESCHEDULE: 'schedule.class.reschedule',
  SCHEDULE_CLASS_CANCEL: 'schedule.class.cancel',
  ROOM_VIEW: 'room.view',
  ROOM_MANAGE: 'room.manage',

  // Phase 18: Branch Management (combined with tenant and branch scope)
  BRANCH_VIEW: 'branch.view',
  BRANCH_MANAGE: 'branch.manage',
  BRANCH_STAFF_MANAGE: 'branch.staff.manage',
  BRANCH_DASHBOARD_VIEW: 'branch.dashboard.view',
  STUDENT_BRANCH_TRANSFER: 'student.branch.transfer',

  // Phase 16: Student Lifecycle & Academic Journey Domain Permissions
  STUDENT_DIRECTORY_VIEW: 'student.directory.view',
  STUDENT_LIFECYCLE_VIEW: 'student.lifecycle.view',
  STUDENT_LIFECYCLE_MANAGE: 'student.lifecycle.manage',
  STUDENT_LIFECYCLE_ACTIVATE: 'student.lifecycle.activate',
  STUDENT_LIFECYCLE_TRANSFER: 'student.lifecycle.transfer',
  STUDENT_LIFECYCLE_HOLD: 'student.lifecycle.hold',
  STUDENT_LIFECYCLE_RESUME: 'student.lifecycle.resume',
  STUDENT_LIFECYCLE_WITHDRAW: 'student.lifecycle.withdraw',
  STUDENT_LIFECYCLE_DROP: 'student.lifecycle.drop',
  STUDENT_LIFECYCLE_COMPLETE: 'student.lifecycle.complete',
  STUDENT_LIFECYCLE_REACTIVATE: 'student.lifecycle.reactivate',
  STUDENT_OWN_LIFECYCLE_VIEW: 'student.own.lifecycle.view',

  // Phase 19: Analytics & Reporting Permissions
  ANALYTICS_DASHBOARD_VIEW: 'analytics.dashboard.view',
  ANALYTICS_STUDENTS_VIEW: 'analytics.students.view',
  ANALYTICS_CRM_VIEW: 'analytics.crm.view',
  ANALYTICS_FINANCE_VIEW: 'analytics.finance.view',
  ANALYTICS_ATTENDANCE_VIEW: 'analytics.attendance.view',
  ANALYTICS_ACADEMICS_VIEW: 'analytics.academics.view',
  ANALYTICS_LEARNING_VIEW: 'analytics.learning.view',
  ANALYTICS_INSTRUCTORS_VIEW: 'analytics.instructors.view',
  ANALYTICS_REPORTS_EXPORT: 'analytics.reports.export',

  // Phase 20: Communication System Permissions
  COMMUNICATION_ANNOUNCEMENT_VIEW: 'communication.announcement.view',
  COMMUNICATION_ANNOUNCEMENT_CREATE: 'communication.announcement.create',
  COMMUNICATION_ANNOUNCEMENT_PUBLISH: 'communication.announcement.publish',
  COMMUNICATION_ANNOUNCEMENT_SCHEDULE: 'communication.announcement.schedule',
  COMMUNICATION_ANNOUNCEMENT_CANCEL: 'communication.announcement.cancel',
  COMMUNICATION_ANNOUNCEMENT_ARCHIVE: 'communication.announcement.archive',
  COMMUNICATION_INBOX_VIEW: 'communication.inbox.view',
  COMMUNICATION_CONVERSATION_VIEW: 'communication.conversation.view',
  COMMUNICATION_CONVERSATION_CREATE: 'communication.conversation.create',
  COMMUNICATION_MESSAGE_SEND: 'communication.message.send',
  COMMUNICATION_MODERATE: 'communication.moderate',

  AUTOMATION_VIEW: 'automation.view',
  AUTOMATION_CREATE: 'automation.create',
  AUTOMATION_EDIT: 'automation.edit',
  AUTOMATION_ACTIVATE: 'automation.activate',
  AUTOMATION_PAUSE: 'automation.pause',
  AUTOMATION_ARCHIVE: 'automation.archive',
  AUTOMATION_EXECUTION_VIEW: 'automation.execution.view',
  AUTOMATION_EXECUTION_RETRY: 'automation.execution.retry',
  AUTOMATION_EXECUTION_CANCEL: 'automation.execution.cancel',
  AUTOMATION_REPLAY: 'automation.replay',

  AI_USE: 'ai.use',
  AI_CRM_READ: 'ai.crm.read',
  AI_CRM_GENERATE: 'ai.crm.generate',
  AI_COMMUNICATION_GENERATE: 'ai.communication.generate',
  AI_STUDENT_USE: 'ai.student.use',
  AI_INSTRUCTOR_USE: 'ai.instructor.use',
  AI_ANALYTICS_USE: 'ai.analytics.use',
  AI_SETTINGS_READ: 'ai.settings.read',
  AI_SETTINGS_MANAGE: 'ai.settings.manage',
  AI_USAGE_READ: 'ai.usage.read',
  AI_EXECUTIONS_READ: 'ai.executions.read',

  // Phase 22: External Academic & Live-Class Integration Platform
  INTEGRATIONS_READ: 'integrations.read',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE: 'integrations.google_classroom.manage',
  INTEGRATIONS_LIVE_CLASSES_MANAGE: 'integrations.live_classes.manage',
  INTEGRATIONS_SYNC: 'integrations.sync',
  INTEGRATIONS_AUDIT_READ: 'integrations.audit.read',

  // Platform-Scoped Permissions

  PLATFORM_TENANT_VIEW: 'platform.tenant.view',
  PLATFORM_TENANT_MANAGE: 'platform.tenant.manage',
  PLATFORM_TENANT_SWITCH: 'platform.tenant.switch',
  PLATFORM_ANALYTICS_VIEW: 'platform.tenant.analytics.view',
  PLATFORM_AUDIT_VIEW: 'platform.audit.view',
  PLATFORM_USERS_IMPERSONATE: 'platform.users.impersonate',

  // Platform Super Admin Wildcard
  SUPERADMIN_ALL: 'superadmin.all'
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Built-in Default System Roles Matrix
export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    PERMISSIONS.SUPERADMIN_ALL
  ],
  TENANT_ADMIN: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_MANAGE,
    PERMISSIONS.BRANCH_STAFF_MANAGE,
    PERMISSIONS.BRANCH_DASHBOARD_VIEW,
    PERMISSIONS.STUDENT_BRANCH_TRANSFER,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.COURSE_ARCHIVE,
    PERMISSIONS.COURSE_PUBLISH,
    PERMISSIONS.COURSE_SUBMIT_REVIEW,
    PERMISSIONS.COURSE_MODULE_VIEW,
    PERMISSIONS.COURSE_MODULE_CREATE,
    PERMISSIONS.COURSE_MODULE_UPDATE,
    PERMISSIONS.COURSE_MODULE_ARCHIVE,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.LESSON_CREATE,
    PERMISSIONS.LESSON_UPDATE,
    PERMISSIONS.LESSON_ARCHIVE,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_UPDATE,
    PERMISSIONS.PROGRESS_VIEW,
    PERMISSIONS.ORGANIZATION_SETTINGS_VIEW,
    PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE,
    PERMISSIONS.ORGANIZATION_BRANDING_VIEW,
    PERMISSIONS.ORGANIZATION_BRANDING_UPDATE,
    PERMISSIONS.ORGANIZATION_WEBSITE_VIEW,
    PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE,
    PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH,
    PERMISSIONS.ORGANIZATION_MEMBERS_VIEW,
    PERMISSIONS.ORGANIZATION_MEMBERS_INVITE,
    PERMISSIONS.ORGANIZATION_MEMBERS_UPDATE,
    PERMISSIONS.ORGANIZATION_MEMBERS_SUSPEND,
    PERMISSIONS.ORGANIZATION_MEMBERS_REMOVE,
    PERMISSIONS.ORGANIZATION_EMAIL_VIEW,
    PERMISSIONS.ORGANIZATION_EMAIL_UPDATE,
    PERMISSIONS.ORGANIZATION_EMAIL_TEST,
    PERMISSIONS.ORGANIZATION_EMAIL_DELETE,
    PERMISSIONS.ORGANIZATION_NOTIFICATIONS_UPDATE,
    PERMISSIONS.ORGANIZATION_DOMAIN_VIEW,
    PERMISSIONS.ORGANIZATION_DOMAIN_UPDATE,
    PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY,
    PERMISSIONS.ORGANIZATION_DOMAIN_DISCONNECT,
    PERMISSIONS.ORGANIZATION_WHITELABEL_UPDATE,
    PERMISSIONS.ORGANIZATION_ONBOARDING_VIEW,
    PERMISSIONS.ORGANIZATION_ONBOARDING_UPDATE,
    PERMISSIONS.BATCH_VIEW,
    PERMISSIONS.BATCH_CREATE,
    PERMISSIONS.BATCH_UPDATE,
    PERMISSIONS.BATCH_DELETE,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.CLASS_CREATE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.CLASS_DELETE,
    PERMISSIONS.CLASS_ENROLL,
    PERMISSIONS.WEBSITE_SETTINGS_VIEW,
    PERMISSIONS.WEBSITE_SETTINGS_UPDATE,
    PERMISSIONS.WEBSITE_SETTINGS_PUBLISH,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_CREATE,
    PERMISSIONS.ASSESSMENT_UPDATE,
    PERMISSIONS.ASSESSMENT_DELETE,
    PERMISSIONS.ASSESSMENT_GRADE,
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.LEAD_ACTIVITY_CREATE,
    PERMISSIONS.FOLLOW_UP_MANAGE,
    PERMISSIONS.ADMISSION_VIEW,
    PERMISSIONS.ADMISSION_CREATE,
    PERMISSIONS.ADMISSION_UPDATE,
    PERMISSIONS.ADMISSION_APPROVE,
    PERMISSIONS.ADMISSION_CONVERT,
    PERMISSIONS.FEE_VIEW,
    PERMISSIONS.FEE_STRUCTURE_MANAGE,
    PERMISSIONS.FEE_PLAN_CREATE,
    PERMISSIONS.FEE_PLAN_UPDATE,
    PERMISSIONS.DISCOUNT_APPLY,
    PERMISSIONS.DISCOUNT_APPROVE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_COLLECT,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYMENT_RECONCILE,
    PERMISSIONS.PAYMENT_GATEWAY_MANAGE,
    PERMISSIONS.FINANCE_REPORT_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MARK, PERMISSIONS.ATTENDANCE_FINALIZE, PERMISSIONS.ATTENDANCE_CORRECT, PERMISSIONS.ATTENDANCE_REPORT_VIEW,
    PERMISSIONS.CERTIFICATE_VIEW, PERMISSIONS.CERTIFICATE_ISSUE, PERMISSIONS.CERTIFICATE_REVOKE, PERMISSIONS.CERTIFICATE_ARTIFACT_RETRY,
    PERMISSIONS.ACADEMIC_CALENDAR_VIEW, PERMISSIONS.ACADEMIC_CALENDAR_MANAGE, PERMISSIONS.TIMETABLE_VIEW, PERMISSIONS.TIMETABLE_CREATE, PERMISSIONS.TIMETABLE_UPDATE, PERMISSIONS.TIMETABLE_PUBLISH, PERMISSIONS.SCHEDULE_CLASS_CREATE, PERMISSIONS.SCHEDULE_CLASS_RESCHEDULE, PERMISSIONS.SCHEDULE_CLASS_CANCEL, PERMISSIONS.ROOM_VIEW, PERMISSIONS.ROOM_MANAGE,
    PERMISSIONS.STUDENT_DIRECTORY_VIEW, PERMISSIONS.STUDENT_LIFECYCLE_VIEW, PERMISSIONS.STUDENT_LIFECYCLE_MANAGE, PERMISSIONS.STUDENT_LIFECYCLE_ACTIVATE, PERMISSIONS.STUDENT_LIFECYCLE_TRANSFER, PERMISSIONS.STUDENT_LIFECYCLE_HOLD, PERMISSIONS.STUDENT_LIFECYCLE_RESUME, PERMISSIONS.STUDENT_LIFECYCLE_WITHDRAW, PERMISSIONS.STUDENT_LIFECYCLE_DROP, PERMISSIONS.STUDENT_LIFECYCLE_COMPLETE, PERMISSIONS.STUDENT_LIFECYCLE_REACTIVATE,
    PERMISSIONS.ANALYTICS_DASHBOARD_VIEW, PERMISSIONS.ANALYTICS_STUDENTS_VIEW, PERMISSIONS.ANALYTICS_CRM_VIEW, PERMISSIONS.ANALYTICS_FINANCE_VIEW, PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW, PERMISSIONS.ANALYTICS_ACADEMICS_VIEW, PERMISSIONS.ANALYTICS_LEARNING_VIEW, PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW, PERMISSIONS.ANALYTICS_REPORTS_EXPORT,
    PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW, PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE, PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH, PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_SCHEDULE, PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CANCEL, PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_ARCHIVE, PERMISSIONS.COMMUNICATION_INBOX_VIEW, PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW, PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE, PERMISSIONS.COMMUNICATION_MESSAGE_SEND, PERMISSIONS.COMMUNICATION_MODERATE,
    PERMISSIONS.AUTOMATION_VIEW, PERMISSIONS.AUTOMATION_CREATE, PERMISSIONS.AUTOMATION_EDIT, PERMISSIONS.AUTOMATION_ACTIVATE, PERMISSIONS.AUTOMATION_PAUSE, PERMISSIONS.AUTOMATION_ARCHIVE, PERMISSIONS.AUTOMATION_EXECUTION_VIEW, PERMISSIONS.AUTOMATION_EXECUTION_RETRY, PERMISSIONS.AUTOMATION_EXECUTION_CANCEL, PERMISSIONS.AUTOMATION_REPLAY,
    PERMISSIONS.AI_USE, PERMISSIONS.AI_CRM_READ, PERMISSIONS.AI_CRM_GENERATE, PERMISSIONS.AI_COMMUNICATION_GENERATE, PERMISSIONS.AI_STUDENT_USE, PERMISSIONS.AI_INSTRUCTOR_USE, PERMISSIONS.AI_ANALYTICS_USE, PERMISSIONS.AI_SETTINGS_READ, PERMISSIONS.AI_SETTINGS_MANAGE, PERMISSIONS.AI_USAGE_READ, PERMISSIONS.AI_EXECUTIONS_READ,
    PERMISSIONS.INTEGRATIONS_READ, PERMISSIONS.INTEGRATIONS_MANAGE, PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE, PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE, PERMISSIONS.INTEGRATIONS_SYNC, PERMISSIONS.INTEGRATIONS_AUDIT_READ
  ],

  BRANCH_ADMIN: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.BRANCH_VIEW,
    PERMISSIONS.BRANCH_DASHBOARD_VIEW,
    PERMISSIONS.STUDENT_BRANCH_TRANSFER,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.COURSE_MODULE_VIEW,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_UPDATE,
    PERMISSIONS.PROGRESS_VIEW,
    PERMISSIONS.BATCH_VIEW,
    PERMISSIONS.BATCH_CREATE,
    PERMISSIONS.BATCH_UPDATE,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.CLASS_CREATE,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.CLASS_ENROLL,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_GRADE,
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_ACTIVITY_CREATE,
    PERMISSIONS.FOLLOW_UP_MANAGE,
    PERMISSIONS.ADMISSION_VIEW,
    PERMISSIONS.ADMISSION_CREATE,
    PERMISSIONS.ADMISSION_UPDATE,
    PERMISSIONS.ADMISSION_CONVERT,
    PERMISSIONS.FEE_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_COLLECT,
    PERMISSIONS.FINANCE_REPORT_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_FINALIZE,
    PERMISSIONS.ATTENDANCE_REPORT_VIEW,
    PERMISSIONS.CERTIFICATE_VIEW,
    PERMISSIONS.ACADEMIC_CALENDAR_VIEW,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.ROOM_VIEW,
    PERMISSIONS.STUDENT_DIRECTORY_VIEW,
    PERMISSIONS.STUDENT_LIFECYCLE_VIEW,
    PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
    PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
    PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
    PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
    PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
    PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
    PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
    PERMISSIONS.AI_USE,
    PERMISSIONS.AI_CRM_READ,
    PERMISSIONS.INTEGRATIONS_READ
  ],

  INSTRUCTOR: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.PROGRESS_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.COURSE_MODULE_VIEW,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.MEDIA_VIEW,
    PERMISSIONS.BATCH_VIEW,
    PERMISSIONS.BATCH_UPDATE,
    PERMISSIONS.CLASS_VIEW,
    PERMISSIONS.CLASS_UPDATE,
    PERMISSIONS.CLASS_ENROLL,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_CREATE,
    PERMISSIONS.ASSESSMENT_UPDATE,
    PERMISSIONS.ASSESSMENT_DELETE,
    PERMISSIONS.ASSESSMENT_GRADE,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_FINALIZE,
    PERMISSIONS.ATTENDANCE_CORRECT,
    PERMISSIONS.ATTENDANCE_REPORT_VIEW,
    PERMISSIONS.ACADEMIC_CALENDAR_VIEW, PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.ANALYTICS_DASHBOARD_VIEW, PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW, PERMISSIONS.ANALYTICS_ACADEMICS_VIEW, PERMISSIONS.ANALYTICS_LEARNING_VIEW,
    PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW, PERMISSIONS.COMMUNICATION_INBOX_VIEW, PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW, PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE, PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
    PERMISSIONS.AI_USE, PERMISSIONS.AI_INSTRUCTOR_USE, PERMISSIONS.AI_COMMUNICATION_GENERATE,
    PERMISSIONS.INTEGRATIONS_READ, PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE
  ],
  STUDENT: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.COURSE_MODULE_VIEW,
    PERMISSIONS.ENROLLMENT_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.PROGRESS_VIEW,
    PERMISSIONS.PROGRESS_UPDATE,
    PERMISSIONS.ASSESSMENT_VIEW,
    PERMISSIONS.ASSESSMENT_SUBMIT,
    PERMISSIONS.FEE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.CERTIFICATE_OWN_VIEW,
    PERMISSIONS.ACADEMIC_CALENDAR_VIEW,
    PERMISSIONS.STUDENT_OWN_LIFECYCLE_VIEW,
    PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
    PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
    PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
    PERMISSIONS.AI_USE, PERMISSIONS.AI_STUDENT_USE
  ]
};

// Permission Categories & Display Metadata for RBAC UI Matrix
export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'student_lifecycle',
    name: 'Student Lifecycle & Academic Journey',
    description: 'Student directory, activation, batch transfers, holds, withdrawals, academic completion, and timeline',
    permissions: [
      { key: PERMISSIONS.STUDENT_DIRECTORY_VIEW, label: 'View Student Directory', description: 'Browse institution-wide student roster and statuses' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_VIEW, label: 'View Student Profile & Lifecycle', description: 'Inspect academic standing, hold status, and lifecycle events' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_MANAGE, label: 'Manage Student Lifecycle', description: 'Full authority to perform lifecycle transitions' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_ACTIVATE, label: 'Activate Students', description: 'Activate admitted student accounts for learning' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_TRANSFER, label: 'Transfer Batch', description: 'Move students across cohorts/batches preserving history' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_HOLD, label: 'Place Student on Hold', description: 'Temporarily pause academic participation' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_RESUME, label: 'Resume Student', description: 'Restore paused student to active standing' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_WITHDRAW, label: 'Withdraw Student', description: 'Formal student-requested withdrawal' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_DROP, label: 'Drop Student', description: 'Institution-initiated academic discontinuation' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_COMPLETE, label: 'Complete Student', description: 'Mark academic completion upon fulfilling requirements' },
      { key: PERMISSIONS.STUDENT_LIFECYCLE_REACTIVATE, label: 'Reactivate Student', description: 'Readmit withdrawn/dropped students into new episode' },
      { key: PERMISSIONS.STUDENT_OWN_LIFECYCLE_VIEW, label: 'View Own Academic Standing', description: 'Student self-view of lifecycle status and timeline' }
    ]
  },
  {
    id: 'certificates', name: 'Certificates', description: 'Issue, verify, revoke, and recover course completion credentials', permissions: [
      { key: PERMISSIONS.CERTIFICATE_VIEW, label: 'View Certificates', description: 'View certificate records and eligibility' },
      { key: PERMISSIONS.CERTIFICATE_OWN_VIEW, label: 'View Own Certificates', description: 'View and download the signed-in student’s own certificates' },
      { key: PERMISSIONS.CERTIFICATE_ISSUE, label: 'Issue Certificates', description: 'Issue credentials for completed enrollments' },
      { key: PERMISSIONS.CERTIFICATE_REVOKE, label: 'Revoke Certificates', description: 'Explicitly invalidate issued credentials' },
      { key: PERMISSIONS.CERTIFICATE_ARTIFACT_RETRY, label: 'Retry Certificate PDFs', description: 'Retry failed certificate artifact generation' }
    ]
  },
  {
    id: 'finance_payments',
    name: 'Fees, Payments & Finance',
    description: 'Fee structures, student fee plans, installment tracking, payment collection, and refunds',
    permissions: [
      { key: PERMISSIONS.FEE_VIEW, label: 'View Fees & Dues', description: 'Inspect student fee plans, due dates, and receipts' },
      { key: PERMISSIONS.FEE_STRUCTURE_MANAGE, label: 'Manage Fee Structures', description: 'Create and edit course fee plans and installment templates' },
      { key: PERMISSIONS.FEE_PLAN_CREATE, label: 'Create Student Fee Plans', description: 'Assign contractual fee structures to admitted students' },
      { key: PERMISSIONS.FEE_PLAN_UPDATE, label: 'Edit Student Fee Plans', description: 'Adjust installments and fee schedules' },
      { key: PERMISSIONS.DISCOUNT_APPLY, label: 'Apply Discounts', description: 'Add scholarships or fee reductions to student plans' },
      { key: PERMISSIONS.DISCOUNT_APPROVE, label: 'Approve Discounts', description: 'Grant formal authorization for discount concessions' },
      { key: PERMISSIONS.PAYMENT_VIEW, label: 'View Transactions', description: 'Browse payment history and transaction records' },
      { key: PERMISSIONS.PAYMENT_COLLECT, label: 'Collect Payments', description: 'Record manual cash, UPI, bank, or gateway collections' },
      { key: PERMISSIONS.PAYMENT_REFUND, label: 'Process Refunds', description: 'Authorize and execute partial or full payment refunds' },
      { key: PERMISSIONS.PAYMENT_RECONCILE, label: 'Reconcile Payments', description: 'Resolve gateway webhook discrepancies and pending payments' },
      { key: PERMISSIONS.PAYMENT_GATEWAY_MANAGE, label: 'Manage Payment Gateways', description: 'Configure Razorpay/Stripe API credentials and webhooks' },
      { key: PERMISSIONS.FINANCE_REPORT_VIEW, label: 'Finance Reports & Analytics', description: 'View collection dashboards, revenue metrics, and aging dues' }
    ]
  },
  {
    id: 'crm_admissions',
    name: 'CRM & Admissions Engine',
    description: 'Manage prospective leads, follow-ups, counsellor assignment, and student admissions',
    permissions: [
      { key: PERMISSIONS.CRM_VIEW, label: 'View CRM & Leads', description: 'Browse leads list, activity timeline, and CRM dashboard' },
      { key: PERMISSIONS.LEAD_CREATE, label: 'Create Leads', description: 'Capture new student inquiries and prospect records' },
      { key: PERMISSIONS.LEAD_UPDATE, label: 'Edit Leads', description: 'Update contact info, interest, and pipeline stages' },
      { key: PERMISSIONS.LEAD_ASSIGN, label: 'Assign Counsellors', description: 'Assign or reassign lead ownership to team members' },
      { key: PERMISSIONS.LEAD_DELETE, label: 'Archive / Delete Leads', description: 'Soft-delete or mark invalid leads' },
      { key: PERMISSIONS.LEAD_ACTIVITY_CREATE, label: 'Add Notes & Activities', description: 'Record call logs, notes, and meeting summaries' },
      { key: PERMISSIONS.FOLLOW_UP_MANAGE, label: 'Manage Follow-Ups', description: 'Schedule and complete client follow-up tasks' },
      { key: PERMISSIONS.ADMISSION_VIEW, label: 'View Admissions', description: 'Inspect submitted applications and admission statuses' },
      { key: PERMISSIONS.ADMISSION_CREATE, label: 'Create Admissions', description: 'Draft admission applications from qualified leads' },
      { key: PERMISSIONS.ADMISSION_UPDATE, label: 'Edit Admissions', description: 'Modify applicant profile and course allocations' },
      { key: PERMISSIONS.ADMISSION_APPROVE, label: 'Approve Admissions', description: 'Review and grant approval for student admissions' },
      { key: PERMISSIONS.ADMISSION_CONVERT, label: 'Convert to Student', description: 'Finalize admission, create student account, and auto-enroll' }
    ]
  },
  {
    id: 'assessments',
    name: 'Quizzes, Tests & Assignments',
    description: 'Create quizzes, standalone mock tests, assignments, and grade submissions',
    permissions: [
      { key: PERMISSIONS.ASSESSMENT_VIEW, label: 'View Assessments', description: 'Browse quizzes, tests, and assignments' },
      { key: PERMISSIONS.ASSESSMENT_CREATE, label: 'Create Quizzes & Assignments', description: 'Author new quizzes, questions, and assignments' },
      { key: PERMISSIONS.ASSESSMENT_UPDATE, label: 'Edit Assessments', description: 'Update questions, time limits, and passing scores' },
      { key: PERMISSIONS.ASSESSMENT_DELETE, label: 'Delete Assessments', description: 'Archive or remove quizzes and assignments' },
      { key: PERMISSIONS.ASSESSMENT_GRADE, label: 'Grade Submissions', description: 'Review student submissions and assign grades' },
      { key: PERMISSIONS.ASSESSMENT_SUBMIT, label: 'Take Quizzes & Submit Work', description: 'Attempt tests and submit assignment files' }
    ]
  },
  {
    id: 'courses',
    name: 'Course & Curriculum Management',
    description: 'Manage courses, modules, lessons, and digital assets',
    permissions: [
      { key: PERMISSIONS.COURSE_VIEW, label: 'View Courses', description: 'View course list and curriculum outlines' },
      { key: PERMISSIONS.COURSE_CREATE, label: 'Create Courses', description: 'Draft new courses and syllabi' },
      { key: PERMISSIONS.COURSE_UPDATE, label: 'Edit Courses', description: 'Update course info, settings, and curriculum' },
      { key: PERMISSIONS.COURSE_PUBLISH, label: 'Publish Courses', description: 'Publish or unpublish courses to students' },
      { key: PERMISSIONS.COURSE_ARCHIVE, label: 'Archive Courses', description: 'Archive or retire existing courses' },
      { key: PERMISSIONS.COURSE_MODULE_VIEW, label: 'View Modules', description: 'Browse modules inside courses' },
      { key: PERMISSIONS.COURSE_MODULE_CREATE, label: 'Create Modules', description: 'Add new modules to courses' },
      { key: PERMISSIONS.COURSE_MODULE_UPDATE, label: 'Edit Modules', description: 'Update and reorder modules' },
      { key: PERMISSIONS.COURSE_MODULE_ARCHIVE, label: 'Archive Modules', description: 'Remove or archive modules' },
      { key: PERMISSIONS.LESSON_VIEW, label: 'View Lessons', description: 'Access lesson contents and video links' },
      { key: PERMISSIONS.LESSON_CREATE, label: 'Create Lessons', description: 'Author new lessons and exercises' },
      { key: PERMISSIONS.LESSON_UPDATE, label: 'Edit Lessons', description: 'Edit lesson content and attachments' },
      { key: PERMISSIONS.LESSON_ARCHIVE, label: 'Archive Lessons', description: 'Delete or archive lessons' },
      { key: PERMISSIONS.MEDIA_VIEW, label: 'View Media Assets', description: 'Browse uploaded media assets' },
      { key: PERMISSIONS.MEDIA_UPLOAD, label: 'Upload Media', description: 'Upload videos, PDFs, and images' },
      { key: PERMISSIONS.MEDIA_DELETE, label: 'Delete Media', description: 'Permanently remove media items' }
    ]
  },
  {
    id: 'batches_classes',
    name: 'Batches & Live Classes',
    description: 'Schedule batches, cohorts, and live class meetings',
    permissions: [
      { key: PERMISSIONS.BATCH_VIEW, label: 'View Batches', description: 'View batch lists and schedules' },
      { key: PERMISSIONS.BATCH_CREATE, label: 'Create Batches', description: 'Create new student cohorts and batches' },
      { key: PERMISSIONS.BATCH_UPDATE, label: 'Edit Batches', description: 'Update batch details and timing' },
      { key: PERMISSIONS.BATCH_DELETE, label: 'Delete Batches', description: 'Delete or archive batches' },
      { key: PERMISSIONS.CLASS_VIEW, label: 'View Live Classes', description: 'View scheduled live classes' },
      { key: PERMISSIONS.CLASS_CREATE, label: 'Schedule Classes', description: 'Create live class links and schedules' },
      { key: PERMISSIONS.CLASS_UPDATE, label: 'Edit Classes', description: 'Modify class agenda, time, and join links' },
      { key: PERMISSIONS.CLASS_DELETE, label: 'Cancel Classes', description: 'Delete or cancel scheduled live classes' },
      { key: PERMISSIONS.CLASS_ENROLL, label: 'Enroll Students in Class', description: 'Manage batch and class attendees' }
    ]
  },
  {
    id: 'team_members',
    name: 'Team, Members & Roles',
    description: 'Manage staff, instructors, custom roles, and access rights',
    permissions: [
      { key: PERMISSIONS.ORGANIZATION_MEMBERS_VIEW, label: 'View Team Members', description: 'View list of instructors and staff' },
      { key: PERMISSIONS.ORGANIZATION_MEMBERS_INVITE, label: 'Invite Members', description: 'Send invitations to new team members' },
      { key: PERMISSIONS.ORGANIZATION_MEMBERS_UPDATE, label: 'Update Member Profiles', description: 'Edit member roles and employee data' },
      { key: PERMISSIONS.ORGANIZATION_MEMBERS_SUSPEND, label: 'Suspend Members', description: 'Temporarily suspend staff accounts' },
      { key: PERMISSIONS.ORGANIZATION_MEMBERS_REMOVE, label: 'Remove Members', description: 'Revoke access and remove from team' },
      { key: PERMISSIONS.ROLE_VIEW, label: 'View Roles', description: 'View system and custom tenant roles' },
      { key: PERMISSIONS.ROLE_MANAGE, label: 'Manage Roles', description: 'Create, edit, and delete custom roles' },
      { key: PERMISSIONS.USER_VIEW, label: 'View Users', description: 'View user accounts across organization' }
    ]
  },
  {
    id: 'students_enrollment',
    name: 'Students & Progress',
    description: 'Enrollment oversight and student learning analytics',
    permissions: [
      { key: PERMISSIONS.ENROLLMENT_VIEW, label: 'View Enrollments', description: 'View student enrollment records' },
      { key: PERMISSIONS.ENROLLMENT_CREATE, label: 'Enroll Students', description: 'Directly enroll students in courses' },
      { key: PERMISSIONS.ENROLLMENT_UPDATE, label: 'Update Enrollments', description: 'Change student enrollment status' },
      { key: PERMISSIONS.PROGRESS_VIEW, label: 'View Progress', description: 'Track lesson and course completion rates' },
      { key: PERMISSIONS.PROGRESS_UPDATE, label: 'Manage Progress', description: 'Reset or override student progress milestones' }
    ]
  },
  {
    id: 'settings_cms',
    name: 'Organization Settings & CMS',
    description: 'Branding, landing pages, email gateway, and custom domains',
    permissions: [
      { key: PERMISSIONS.ORGANIZATION_SETTINGS_VIEW, label: 'View Settings', description: 'View organization configuration' },
      { key: PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE, label: 'Edit Settings', description: 'Update organization profile & details' },
      { key: PERMISSIONS.ORGANIZATION_BRANDING_VIEW, label: 'View Branding', description: 'Inspect brand logos, colors, and themes' },
      { key: PERMISSIONS.ORGANIZATION_BRANDING_UPDATE, label: 'Update Branding', description: 'Change brand logo, color palette, and assets' },
      { key: PERMISSIONS.ORGANIZATION_WEBSITE_VIEW, label: 'View Website CMS', description: 'Preview public landing pages' },
      { key: PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE, label: 'Edit Website CMS', description: 'Modify page hero, sections, and testimonials' },
      { key: PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH, label: 'Publish Website', description: 'Publish CMS changes to live public site' },
      { key: PERMISSIONS.ORGANIZATION_EMAIL_VIEW, label: 'View Email Settings', description: 'View SMTP and notification settings' },
      { key: PERMISSIONS.ORGANIZATION_EMAIL_UPDATE, label: 'Configure SMTP', description: 'Update email server and credentials' },
      { key: PERMISSIONS.ORGANIZATION_EMAIL_TEST, label: 'Test Email Delivery', description: 'Trigger test email notifications' },
      { key: PERMISSIONS.ORGANIZATION_DOMAIN_VIEW, label: 'View Custom Domains', description: 'Inspect custom domain records' },
      { key: PERMISSIONS.ORGANIZATION_DOMAIN_UPDATE, label: 'Manage Custom Domains', description: 'Connect custom white-label domain' },
      { key: PERMISSIONS.ORGANIZATION_DOMAIN_VERIFY, label: 'Verify DNS', description: 'Check DNS propagation for custom domain' }
    ]
  },
  {
    id: 'analytics_reporting',
    name: 'Analytics & Reporting',
    description: 'Executive overview, student lifecycle, CRM funnel, finance reconciliation, attendance rates, academic metrics, and export',
    permissions: [
      { key: PERMISSIONS.ANALYTICS_DASHBOARD_VIEW, label: 'View Executive Dashboard', description: 'View high-level analytics overview across permitted domains' },
      { key: PERMISSIONS.ANALYTICS_STUDENTS_VIEW, label: 'View Student Analytics', description: 'Analyze student lifecycle transitions, active cohorts, and trends' },
      { key: PERMISSIONS.ANALYTICS_CRM_VIEW, label: 'View CRM & Admissions Analytics', description: 'Inspect lead sources, conversion rates, and pipeline funnels' },
      { key: PERMISSIONS.ANALYTICS_FINANCE_VIEW, label: 'View Financial Analytics', description: 'Access revenue, collections, outstanding dues, and branch finance' },
      { key: PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW, label: 'View Attendance Analytics', description: 'Analyze attendance percentages, trends, and low attendance lists' },
      { key: PERMISSIONS.ANALYTICS_ACADEMICS_VIEW, label: 'View Academic Analytics', description: 'Inspect class volumes, schedule adherence, and room utilization' },
      { key: PERMISSIONS.ANALYTICS_LEARNING_VIEW, label: 'View Learning & Assessment Analytics', description: 'Track course completion, progress distribution, and quiz submissions' },
      { key: PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW, label: 'View Instructor Workload Analytics', description: 'View teaching hours, scheduled classes, and evaluation workload' },
      { key: PERMISSIONS.ANALYTICS_REPORTS_EXPORT, label: 'Export Analytics Reports', description: 'Download CSV reports and detailed audit summaries' }
    ]
  },
  {
    id: 'communication_system',
    name: 'Institutional Communication',
    description: 'Announcements, audience targeting, conversations, messaging, and inbox management',
    permissions: [
      { key: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW, label: 'View Announcements', description: 'Browse and inspect institutional announcements' },
      { key: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE, label: 'Create Announcements', description: 'Draft institutional communications' },
      { key: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH, label: 'Publish Announcements', description: 'Publish announcements to resolved audiences' },
      { key: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_SCHEDULE, label: 'Schedule Announcements', description: 'Schedule future automated publication' },
      { key: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CANCEL, label: 'Cancel Announcements', description: 'Cancel pending scheduled announcements' },
      { key: PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_ARCHIVE, label: 'Archive Announcements', description: 'Archive past announcements' },
      { key: PERMISSIONS.COMMUNICATION_INBOX_VIEW, label: 'View Inbox', description: 'Access personal communication inbox and read items' },
      { key: PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW, label: 'View Conversations', description: 'Access conversation threads' },
      { key: PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE, label: 'Start Conversations', description: 'Initiate authorized direct or support message threads' },
      { key: PERMISSIONS.COMMUNICATION_MESSAGE_SEND, label: 'Send Messages', description: 'Send messages within conversation threads' },
      { key: PERMISSIONS.COMMUNICATION_MODERATE, label: 'Moderate Communication', description: 'Moderate institutional messaging and manage threads' }
    ]
  },
  {
    id: 'integrations_platform',
    name: 'External Academic & Live-Class Integrations',
    description: 'Google Classroom, Google Meet, Zoom, and Microsoft Teams integration connections and synchronization',
    permissions: [
      { key: PERMISSIONS.INTEGRATIONS_READ, label: 'View Integrations', description: 'View connected external providers and sync status' },
      { key: PERMISSIONS.INTEGRATIONS_MANAGE, label: 'Manage Integrations', description: 'Connect, disconnect, and configure external providers' },
      { key: PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE, label: 'Manage Google Classroom', description: 'Link courses, sync rosters, coursework, and grades' },
      { key: PERMISSIONS.INTEGRATIONS_LIVE_CLASSES_MANAGE, label: 'Manage Live Meetings', description: 'Schedule and manage Google Meet, Zoom, and Teams meetings' },
      { key: PERMISSIONS.INTEGRATIONS_SYNC, label: 'Trigger Sync Operations', description: 'Execute manual and scheduled synchronization runs' },
      { key: PERMISSIONS.INTEGRATIONS_AUDIT_READ, label: 'View Integration Audit Logs', description: 'Inspect integration operations and audit trails' }
    ]
  }
];

/**
 * Evaluates whether a user's permissions array grants a required permission key.
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes(PERMISSIONS.SUPERADMIN_ALL)) return true;
  return userPermissions.includes(required);
}

/**
 * Evaluates whether a user's permissions array grants ANY of the required permission keys.
 */
export function hasAnyPermission(userPermissions: string[], required: string[]): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes(PERMISSIONS.SUPERADMIN_ALL)) return true;
  if (!required || required.length === 0) return true;
  return required.some((perm) => userPermissions.includes(perm));
}

/**
 * Evaluates whether a user's permissions array grants ALL of the required permission keys.
 */
export function hasAllPermissions(userPermissions: string[], required: string[]): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes(PERMISSIONS.SUPERADMIN_ALL)) return true;
  if (!required || required.length === 0) return true;
  return required.every((perm) => userPermissions.includes(perm));
}

/**
 * Centralized evaluator for single or multiple navigation permissions with ANY/ALL mode.
 */
export function evaluateNavigationPermissions(
  userPermissions: string[] = [],
  required?: string | string[],
  mode: 'ANY' | 'ALL' = 'ANY',
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin || (userPermissions && userPermissions.includes(PERMISSIONS.SUPERADMIN_ALL))) {
    return true;
  }
  if (!required || (Array.isArray(required) && required.length === 0)) {
    return true;
  }
  const reqArray = Array.isArray(required) ? required : [required];
  return mode === 'ALL'
    ? hasAllPermissions(userPermissions, reqArray)
    : hasAnyPermission(userPermissions, reqArray);
}

/**
 * Single source of truth interface for permission-aware navigation items.
 */
export interface NavigationItem {
  name: string;
  href: string;
  icon?: any;
  badge?: string;
  requiredPermissions?: string | string[];
  permissionMode?: 'ANY' | 'ALL';
  superAdminOnly?: boolean;
  children?: NavigationItem[];
  current?: boolean;
}

/**
 * Recursively filters a navigation tree based on user's effective permissions.
 *
 * Rules:
 * 1. SuperAdmin bypass sees all items except superAdminOnly restrictions which apply to non-superadmins.
 * 2. An item with children is visible ONLY if at least 1 child is authorized (never renders empty parent container).
 * 3. An item without children is visible if it is directly authorized.
 * 4. Pure, immutable, and preserves order.
 */
export function filterNavigationTree(
  items: NavigationItem[],
  userPermissions: string[] = [],
  isSuperAdmin = false
): NavigationItem[] {
  if (!Array.isArray(items)) return [];

  const result: NavigationItem[] = [];

  for (const item of items) {
    if (item.superAdminOnly && !isSuperAdmin && !userPermissions.includes(PERMISSIONS.SUPERADMIN_ALL)) {
      continue;
    }

    const isDirectlyAuthorized = evaluateNavigationPermissions(
      userPermissions,
      item.requiredPermissions,
      item.permissionMode || 'ANY',
      isSuperAdmin
    );

    if (item.children && item.children.length > 0) {
      if (!isDirectlyAuthorized) {
        continue;
      }
      const filteredChildren = filterNavigationTree(item.children, userPermissions, isSuperAdmin);

      if (filteredChildren.length > 0) {
        result.push({
          ...item,
          children: filteredChildren
        });
      }
    } else {
      if (isDirectlyAuthorized) {
        result.push({ ...item });
      }
    }
  }

  return result;
}
