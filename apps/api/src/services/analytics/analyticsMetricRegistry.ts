import { AnalyticsReportKey } from '@edtech/types';
import { PERMISSIONS } from '@edtech/permissions';

export interface MetricDefinition {
  key: string;
  label: string;
  description: string;
  sourceDomain: 'STUDENTS' | 'CRM' | 'FINANCE' | 'ATTENDANCE' | 'ACADEMICS' | 'LEARNING' | 'ASSESSMENTS' | 'CERTIFICATES' | 'INSTRUCTORS';
  sourceModels: string[];
  numeratorDescription?: string;
  denominatorDescription?: string;
  includedStates?: string[];
  excludedStates?: string[];
  dateField: string;
  timezoneSemantics: string;
  branchSemantics: string;
  requiredPermission: string;
  currencySemantics?: 'INR' | 'MINOR_UNITS';
  emptyDataBehavior: string;
  drillDownReportKey?: AnalyticsReportKey;
}

export const ANALYTICS_METRIC_REGISTRY: Record<string, MetricDefinition> = {
  // --- Students Domain ---
  'students.active': {
    key: 'students.active',
    label: 'Active Students',
    description: 'Total number of students with an active academic standing in the institution.',
    sourceDomain: 'STUDENTS',
    sourceModels: ['StudentLifecycle'],
    includedStates: ['ACTIVE'],
    excludedStates: ['PENDING_ACTIVATION', 'ON_HOLD', 'WITHDRAWN', 'DROPPED', 'COMPLETED'],
    dateField: 'activatedAt',
    timezoneSemantics: 'Instant evaluation in tenant/branch timezone',
    branchSemantics: 'Current branch assignment or effective branch at instant',
    requiredPermission: PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
    emptyDataBehavior: 'Returns 0 count',
    drillDownReportKey: 'STUDENT_ROSTER'
  },
  'students.new_admissions': {
    key: 'students.new_admissions',
    label: 'New Admissions',
    description: 'Students who were activated or admitted during the specified period.',
    sourceDomain: 'STUDENTS',
    sourceModels: ['StudentLifecycle'],
    dateField: 'activatedAt',
    timezoneSemantics: 'Local calendar day boundaries in tenant/branch timezone',
    branchSemantics: 'Branch at time of activation',
    requiredPermission: PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
    emptyDataBehavior: 'Returns 0 count',
    drillDownReportKey: 'STUDENT_LIFECYCLE_HISTORY'
  },
  'students.on_hold': {
    key: 'students.on_hold',
    label: 'Students on Hold',
    description: 'Students whose academic studies are currently paused.',
    sourceDomain: 'STUDENTS',
    sourceModels: ['StudentLifecycle'],
    includedStates: ['ON_HOLD'],
    dateField: 'currentHold.effectiveFrom',
    timezoneSemantics: 'Current snapshot',
    branchSemantics: 'Current branch',
    requiredPermission: PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
    emptyDataBehavior: 'Returns 0 count',
    drillDownReportKey: 'STUDENT_ROSTER'
  },

  // --- CRM & Admissions ---
  'crm.leads.created': {
    key: 'crm.leads.created',
    label: 'Leads Created',
    description: 'Prospective leads registered in the CRM within the selected date range.',
    sourceDomain: 'CRM',
    sourceModels: ['Lead'],
    dateField: 'createdAt',
    timezoneSemantics: 'Local calendar day boundaries',
    branchSemantics: 'Assigned lead branch',
    requiredPermission: PERMISSIONS.ANALYTICS_CRM_VIEW,
    emptyDataBehavior: 'Returns 0 count',
    drillDownReportKey: 'LEAD_ACQUISITION'
  },
  'crm.leads.converted': {
    key: 'crm.leads.converted',
    label: 'Leads Converted to Admissions',
    description: 'Leads who completed admission and enrollment in the period.',
    sourceDomain: 'CRM',
    sourceModels: ['Admission', 'Lead'],
    includedStates: ['ENROLLED', 'APPROVED'],
    dateField: 'convertedAt',
    timezoneSemantics: 'Local calendar day boundaries',
    branchSemantics: 'Admission branch attribution',
    requiredPermission: PERMISSIONS.ANALYTICS_CRM_VIEW,
    emptyDataBehavior: 'Returns 0 count',
    drillDownReportKey: 'ADMISSION_CONVERSIONS'
  },
  'crm.conversion_rate': {
    key: 'crm.conversion_rate',
    label: 'Lead-to-Admission Conversion Rate',
    description: 'Percentage of leads created in cohort that reached enrolled/converted standing.',
    sourceDomain: 'CRM',
    sourceModels: ['Lead', 'Admission'],
    numeratorDescription: 'Converted Leads in cohort',
    denominatorDescription: 'Total Leads created in cohort',
    dateField: 'createdAt',
    timezoneSemantics: 'Cohort creation period',
    branchSemantics: 'Lead branch attribution',
    requiredPermission: PERMISSIONS.ANALYTICS_CRM_VIEW,
    emptyDataBehavior: 'Returns 0 percentage if 0 leads created',
    drillDownReportKey: 'ADMISSION_CONVERSIONS'
  },

  // --- Finance ---
  'finance.collected': {
    key: 'finance.collected',
    label: 'Collected Fees',
    description: 'Total monetary collections received through manual or online payment gateways.',
    sourceDomain: 'FINANCE',
    sourceModels: ['Payment', 'FinancialLedger'],
    includedStates: ['SUCCESS'],
    dateField: 'receivedAt',
    timezoneSemantics: 'Local payment timestamp in branch timezone',
    branchSemantics: 'Canonical payment branch (immutable across student transfer)',
    requiredPermission: PERMISSIONS.ANALYTICS_FINANCE_VIEW,
    currencySemantics: 'MINOR_UNITS',
    emptyDataBehavior: 'Returns 0 minor units',
    drillDownReportKey: 'FINANCE_COLLECTIONS'
  },
  'finance.outstanding': {
    key: 'finance.outstanding',
    label: 'Outstanding Dues',
    description: 'Total outstanding contract balance across all active student fee plans.',
    sourceDomain: 'FINANCE',
    sourceModels: ['StudentFeePlan'],
    dateField: 'updatedAt',
    timezoneSemantics: 'Current balance snapshot',
    branchSemantics: 'Fee plan branch attribution',
    requiredPermission: PERMISSIONS.ANALYTICS_FINANCE_VIEW,
    currencySemantics: 'MINOR_UNITS',
    emptyDataBehavior: 'Returns 0 minor units',
    drillDownReportKey: 'FINANCE_AGING_DUES'
  },
  'finance.refunded': {
    key: 'finance.refunded',
    label: 'Refunded Amount',
    description: 'Total refund disbursements successfully executed during the period.',
    sourceDomain: 'FINANCE',
    sourceModels: ['Refund'],
    includedStates: ['SUCCESS'],
    dateField: 'processedAt',
    timezoneSemantics: 'Local refund execution timestamp',
    branchSemantics: 'Original payment branch',
    requiredPermission: PERMISSIONS.ANALYTICS_FINANCE_VIEW,
    currencySemantics: 'MINOR_UNITS',
    emptyDataBehavior: 'Returns 0 minor units',
    drillDownReportKey: 'FINANCE_COLLECTIONS'
  },

  // --- Attendance ---
  'attendance.percentage': {
    key: 'attendance.percentage',
    label: 'Attendance Rate',
    description: 'Institutional attendance percentage across all finalized class sessions.',
    sourceDomain: 'ATTENDANCE',
    sourceModels: ['AttendanceSession', 'AttendanceRecord'],
    numeratorDescription: 'PRESENT + LATE student marks',
    denominatorDescription: 'PRESENT + LATE + ABSENT student marks (EXCUSED excluded)',
    includedStates: ['FINALIZED'],
    excludedStates: ['CANCELLED', 'DRAFT'],
    dateField: 'sessionDate',
    timezoneSemantics: 'Class scheduled local date',
    branchSemantics: 'Class branch attribution',
    requiredPermission: PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
    emptyDataBehavior: 'Returns null if total valid marks = 0',
    drillDownReportKey: 'ATTENDANCE_SUMMARY'
  },

  // --- Academics & Scheduling ---
  'academics.classes.scheduled': {
    key: 'academics.classes.scheduled',
    label: 'Scheduled Classes',
    description: 'Concrete class occurrences scheduled to take place in the date range.',
    sourceDomain: 'ACADEMICS',
    sourceModels: ['Class'],
    includedStates: ['SCHEDULED', 'COMPLETED'],
    excludedStates: ['CANCELLED'],
    dateField: 'scheduledStartAt',
    timezoneSemantics: 'Class scheduled local start time',
    branchSemantics: 'Batch / Class branch',
    requiredPermission: PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
    emptyDataBehavior: 'Returns 0 count',
    drillDownReportKey: 'ACADEMIC_CLASS_SCHEDULE'
  },

  // --- Learning & Assessments ---
  'learning.course_completion_rate': {
    key: 'learning.course_completion_rate',
    label: 'Course Completion Rate',
    description: 'Percentage of active enrollments that have completed all course requirements.',
    sourceDomain: 'LEARNING',
    sourceModels: ['Enrollment'],
    numeratorDescription: 'Completed enrollments',
    denominatorDescription: 'Total enrollments (excluding cancelled/withdrawn)',
    dateField: 'completedAt',
    timezoneSemantics: 'Calendar date',
    branchSemantics: 'Student branch at completion',
    requiredPermission: PERMISSIONS.ANALYTICS_LEARNING_VIEW,
    emptyDataBehavior: 'Returns 0 percentage if 0 enrollments',
    drillDownReportKey: 'STUDENT_ROSTER'
  },

  // --- Instructors ---
  'instructors.workload_hours': {
    key: 'instructors.workload_hours',
    label: 'Instructor Workload Hours',
    description: 'Total duration in hours of scheduled and conducted classes by faculty.',
    sourceDomain: 'INSTRUCTORS',
    sourceModels: ['Class'],
    dateField: 'scheduledStartAt',
    timezoneSemantics: 'Duration between start and end instant',
    branchSemantics: 'Class branch',
    requiredPermission: PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
    emptyDataBehavior: 'Returns 0 hours',
    drillDownReportKey: 'INSTRUCTOR_WORKLOAD'
  }
};
