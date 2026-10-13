import { PERMISSIONS, NavigationItem } from '@edtech/permissions';
import {
  LayoutDashboard,
  Calendar,
  Users,
  IndianRupee,
  Video,
  ClipboardCheck,
  BookOpen,
  Award,
  Building2,
  SlidersHorizontal,
  Settings,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Megaphone,
  Workflow,
  Clock,
  Compass,
  MessageSquare,
  User,
  GraduationCap
} from 'lucide-react';

/**
 * Single source of truth for Admin & Staff Workspace Navigation.
 * All destinations are mapped to authoritative RBAC permissions.
 */
export const ADMIN_NAVIGATION_CONFIG: NavigationItem[] = [
  {
    name: 'Platform Console',
    href: '/platform',
    icon: ShieldAlert,
    badge: 'SuperAdmin',
    superAdminOnly: true,
    requiredPermissions: [
      PERMISSIONS.SUPERADMIN_ALL,
      PERMISSIONS.PLATFORM_TENANT_VIEW,
      PERMISSIONS.PLATFORM_TENANT_MANAGE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    name: 'Automations', href: '/admin/automations', icon: Workflow,
    requiredPermissions: [PERMISSIONS.AUTOMATION_VIEW, PERMISSIONS.AUTOMATION_CREATE, PERMISSIONS.AUTOMATION_EXECUTION_VIEW], permissionMode: 'ANY',
    children: [
      { name: 'Automations', href: '/admin/automations', requiredPermissions: [PERMISSIONS.AUTOMATION_VIEW] },
      { name: 'Create Automation', href: '/admin/automations/new', requiredPermissions: [PERMISSIONS.AUTOMATION_CREATE] }
    ]
  },
  {
    name: 'Communications',
    href: '/admin/communications',
    icon: Megaphone,
    requiredPermissions: [
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE,
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW
    ],
    permissionMode: 'ANY',
    children: [
      {
        name: 'Announcements',
        href: '/admin/communications',
        requiredPermissions: [PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW]
      },
      {
        name: 'Create Announcement',
        href: '/admin/communications/new',
        requiredPermissions: [PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE]
      },
      {
        name: 'Conversations',
        href: '/admin/communications/conversations',
        requiredPermissions: [PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW]
      }
    ]
  },
  {
    name: 'Analytics & Reports',
    href: '/admin/analytics',
    icon: BarChart3,
    requiredPermissions: [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
      PERMISSIONS.ANALYTICS_CRM_VIEW,
      PERMISSIONS.ANALYTICS_FINANCE_VIEW,
      PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
      PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
      PERMISSIONS.ANALYTICS_LEARNING_VIEW,
      PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
      PERMISSIONS.ANALYTICS_REPORTS_EXPORT
    ],
    permissionMode: 'ANY',
    children: [
      {
        name: 'Overview',
        href: '/admin/analytics',
        requiredPermissions: [PERMISSIONS.ANALYTICS_DASHBOARD_VIEW]
      },
      {
        name: 'Students',
        href: '/admin/analytics/students',
        requiredPermissions: [PERMISSIONS.ANALYTICS_STUDENTS_VIEW]
      },
      {
        name: 'CRM & Admissions',
        href: '/admin/analytics/crm',
        requiredPermissions: [PERMISSIONS.ANALYTICS_CRM_VIEW]
      },
      {
        name: 'Finance & Payments',
        href: '/admin/analytics/finance',
        requiredPermissions: [PERMISSIONS.ANALYTICS_FINANCE_VIEW]
      },
      {
        name: 'Attendance',
        href: '/admin/analytics/attendance',
        requiredPermissions: [PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW]
      },
      {
        name: 'Academic Operations',
        href: '/admin/analytics/academics',
        requiredPermissions: [PERMISSIONS.ANALYTICS_ACADEMICS_VIEW]
      },
      {
        name: 'Learning Progress',
        href: '/admin/analytics/learning',
        requiredPermissions: [PERMISSIONS.ANALYTICS_LEARNING_VIEW]
      },
      {
        name: 'Instructors',
        href: '/admin/analytics/instructors',
        requiredPermissions: [PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW]
      },
      {
        name: 'Branch Comparison',
        href: '/admin/analytics/branches',
        requiredPermissions: [PERMISSIONS.ANALYTICS_DASHBOARD_VIEW]
      },
      {
        name: 'Reports & Exports',
        href: '/admin/analytics/reports',
        requiredPermissions: [
          PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
          PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
          PERMISSIONS.ANALYTICS_CRM_VIEW,
          PERMISSIONS.ANALYTICS_FINANCE_VIEW,
          PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
          PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
          PERMISSIONS.ANALYTICS_LEARNING_VIEW,
          PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
          PERMISSIONS.ANALYTICS_REPORTS_EXPORT
        ],
        permissionMode: 'ANY'
      }
    ]
  },
  {
    name: 'Branches',
    href: '/admin/branches',
    icon: Building2,
    requiredPermissions: [PERMISSIONS.BRANCH_VIEW, PERMISSIONS.BRANCH_MANAGE],
    permissionMode: 'ANY'
  },
  {
    name: 'Students',
    href: '/admin/students',
    icon: Users,
    requiredPermissions: [
      PERMISSIONS.STUDENT_DIRECTORY_VIEW,
      PERMISSIONS.STUDENT_LIFECYCLE_VIEW,
      PERMISSIONS.STUDENT_LIFECYCLE_MANAGE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Batches',
    href: '/admin/batches',
    icon: Calendar,
    requiredPermissions: [
      PERMISSIONS.BATCH_VIEW,
      PERMISSIONS.BATCH_CREATE,
      PERMISSIONS.BATCH_UPDATE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'CRM & Admissions',
    href: '/admin/crm',
    icon: Users,
    requiredPermissions: [
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
      PERMISSIONS.ADMISSION_CONVERT
    ],
    permissionMode: 'ANY',
    children: [
      {
        name: 'Dashboard',
        href: '/admin/crm',
        requiredPermissions: [PERMISSIONS.CRM_VIEW]
      },
      {
        name: 'Leads Directory',
        href: '/admin/crm/leads',
        requiredPermissions: [PERMISSIONS.CRM_VIEW, PERMISSIONS.LEAD_CREATE, PERMISSIONS.LEAD_UPDATE],
        permissionMode: 'ANY'
      },
      {
        name: 'Follow-Ups',
        href: '/admin/crm/follow-ups',
        requiredPermissions: [PERMISSIONS.FOLLOW_UP_MANAGE, PERMISSIONS.CRM_VIEW],
        permissionMode: 'ANY'
      },
      {
        name: 'Admissions',
        href: '/admin/crm/admissions',
        requiredPermissions: [
          PERMISSIONS.ADMISSION_VIEW,
          PERMISSIONS.ADMISSION_CREATE,
          PERMISSIONS.ADMISSION_UPDATE,
          PERMISSIONS.ADMISSION_APPROVE,
          PERMISSIONS.ADMISSION_CONVERT
        ],
        permissionMode: 'ANY'
      }
    ]
  },
  {
    name: 'Finance & Payments',
    href: '/admin/finance',
    icon: IndianRupee,
    requiredPermissions: [
      PERMISSIONS.FINANCE_REPORT_VIEW,
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
      PERMISSIONS.PAYMENT_GATEWAY_MANAGE
    ],
    permissionMode: 'ANY',
    children: [
      {
        name: 'Dashboard',
        href: '/admin/finance',
        requiredPermissions: [PERMISSIONS.FINANCE_REPORT_VIEW]
      },
      {
        name: 'Student Fees',
        href: '/admin/finance/student-fees',
        requiredPermissions: [PERMISSIONS.FEE_VIEW, PERMISSIONS.FEE_PLAN_CREATE, PERMISSIONS.FEE_PLAN_UPDATE],
        permissionMode: 'ANY'
      },
      {
        name: 'Fee Structures',
        href: '/admin/finance/fee-structures',
        requiredPermissions: [PERMISSIONS.FEE_STRUCTURE_MANAGE, PERMISSIONS.FEE_VIEW],
        permissionMode: 'ANY'
      },
      {
        name: 'Payments',
        href: '/admin/finance/payments',
        requiredPermissions: [PERMISSIONS.PAYMENT_VIEW, PERMISSIONS.PAYMENT_COLLECT],
        permissionMode: 'ANY'
      },
      {
        name: 'Dues & Overdue',
        href: '/admin/finance/dues',
        requiredPermissions: [PERMISSIONS.FEE_VIEW]
      },
      {
        name: 'Refunds',
        href: '/admin/finance/refunds',
        requiredPermissions: [PERMISSIONS.PAYMENT_REFUND, PERMISSIONS.PAYMENT_VIEW],
        permissionMode: 'ANY'
      },
      {
        name: 'Gateway Settings',
        href: '/admin/finance/settings',
        requiredPermissions: [PERMISSIONS.PAYMENT_GATEWAY_MANAGE]
      }
    ]
  },
  {
    name: 'Classes',
    href: '/admin/classes',
    icon: Video,
    requiredPermissions: [
      PERMISSIONS.CLASS_VIEW,
      PERMISSIONS.CLASS_CREATE,
      PERMISSIONS.CLASS_UPDATE,
      PERMISSIONS.CLASS_ENROLL
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Attendance',
    href: '/admin/attendance',
    icon: ClipboardCheck,
    requiredPermissions: [
      PERMISSIONS.ATTENDANCE_VIEW,
      PERMISSIONS.ATTENDANCE_MARK,
      PERMISSIONS.ATTENDANCE_FINALIZE,
      PERMISSIONS.ATTENDANCE_CORRECT,
      PERMISSIONS.ATTENDANCE_REPORT_VIEW
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Academic Operations', href: '/admin/timetable', icon: Calendar,
    requiredPermissions: [PERMISSIONS.ACADEMIC_CALENDAR_VIEW, PERMISSIONS.ACADEMIC_CALENDAR_MANAGE, PERMISSIONS.TIMETABLE_VIEW, PERMISSIONS.TIMETABLE_CREATE, PERMISSIONS.TIMETABLE_PUBLISH], permissionMode: 'ANY',
    children: [
      { name: 'Timetable', href: '/admin/timetable', requiredPermissions: [PERMISSIONS.TIMETABLE_VIEW, PERMISSIONS.TIMETABLE_CREATE], permissionMode: 'ANY' },
      { name: 'Academic Calendar', href: '/admin/academic-calendar', requiredPermissions: [PERMISSIONS.ACADEMIC_CALENDAR_VIEW] }
    ]
  },
  {
    name: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    requiredPermissions: [
      PERMISSIONS.COURSE_VIEW,
      PERMISSIONS.COURSE_CREATE,
      PERMISSIONS.COURSE_UPDATE,
      PERMISSIONS.COURSE_PUBLISH,
      PERMISSIONS.COURSE_ARCHIVE,
      PERMISSIONS.COURSE_MODULE_VIEW,
      PERMISSIONS.LESSON_VIEW
    ],
    permissionMode: 'ANY',
    children: [
      {
        name: 'All Courses',
        href: '/admin/courses',
        requiredPermissions: [PERMISSIONS.COURSE_VIEW]
      },
      {
        name: 'Create Course',
        href: '/admin/courses/create',
        requiredPermissions: [PERMISSIONS.COURSE_CREATE]
      }
    ]
  },
  {
    name: 'Quizzes & Assignments',
    href: '/admin/assessments',
    icon: Award,
    requiredPermissions: [
      PERMISSIONS.ASSESSMENT_VIEW,
      PERMISSIONS.ASSESSMENT_CREATE,
      PERMISSIONS.ASSESSMENT_UPDATE,
      PERMISSIONS.ASSESSMENT_GRADE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Certificates',
    href: '/admin/certificates',
    icon: Award,
    requiredPermissions: [
      PERMISSIONS.CERTIFICATE_VIEW,
      PERMISSIONS.CERTIFICATE_ISSUE,
      PERMISSIONS.CERTIFICATE_REVOKE,
      PERMISSIONS.CERTIFICATE_ARTIFACT_RETRY
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Media Library',
    href: '/admin/media',
    icon: Building2,
    requiredPermissions: [
      PERMISSIONS.MEDIA_VIEW,
      PERMISSIONS.MEDIA_UPLOAD,
      PERMISSIONS.MEDIA_DELETE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Organization Settings',
    href: '/admin/organization',
    icon: SlidersHorizontal,
    requiredPermissions: [
      PERMISSIONS.ORGANIZATION_SETTINGS_VIEW,
      PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE,
      PERMISSIONS.ORGANIZATION_BRANDING_VIEW,
      PERMISSIONS.ORGANIZATION_BRANDING_UPDATE,
      PERMISSIONS.ORGANIZATION_EMAIL_VIEW,
      PERMISSIONS.ORGANIZATION_DOMAIN_VIEW,
      PERMISSIONS.ORGANIZATION_ONBOARDING_VIEW
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Website CMS',
    href: '/admin/cms',
    icon: Settings,
    requiredPermissions: [
      PERMISSIONS.ORGANIZATION_WEBSITE_VIEW,
      PERMISSIONS.ORGANIZATION_WEBSITE_UPDATE,
      PERMISSIONS.ORGANIZATION_WEBSITE_PUBLISH,
      PERMISSIONS.WEBSITE_SETTINGS_VIEW,
      PERMISSIONS.WEBSITE_SETTINGS_UPDATE,
      PERMISSIONS.WEBSITE_SETTINGS_PUBLISH
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Team & Members',
    href: '/admin/team',
    icon: Users,
    requiredPermissions: [
      PERMISSIONS.ORGANIZATION_MEMBERS_VIEW,
      PERMISSIONS.ORGANIZATION_MEMBERS_INVITE,
      PERMISSIONS.ORGANIZATION_MEMBERS_UPDATE,
      PERMISSIONS.ORGANIZATION_MEMBERS_SUSPEND,
      PERMISSIONS.ORGANIZATION_MEMBERS_REMOVE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Roles & Permissions',
    href: '/admin/roles',
    icon: ShieldCheck,
    requiredPermissions: [
      PERMISSIONS.ROLE_VIEW,
      PERMISSIONS.ROLE_MANAGE
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Integrations',
    href: '/admin/settings/integrations',
    icon: SlidersHorizontal,
    requiredPermissions: [
      PERMISSIONS.INTEGRATIONS_READ,
      PERMISSIONS.INTEGRATIONS_MANAGE,
      PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE,
      PERMISSIONS.SUPERADMIN_ALL
    ],
    permissionMode: 'ANY',
    children: [
      {
        name: 'Provider Connections',
        href: '/admin/settings/integrations',
        requiredPermissions: [PERMISSIONS.INTEGRATIONS_READ, PERMISSIONS.INTEGRATIONS_MANAGE]
      },
      {
        name: 'Google Classroom',
        href: '/admin/academics/classroom-sync',
        requiredPermissions: [PERMISSIONS.INTEGRATIONS_GOOGLE_CLASSROOM_MANAGE, PERMISSIONS.INTEGRATIONS_READ]
      }
    ]
  }
];

/**
 * Single source of truth for Instructor OS Workspace Navigation.
 * Maps all Phase 17 trainer capabilities to authoritative RBAC permissions.
 */
export const INSTRUCTOR_NAVIGATION_CONFIG: NavigationItem[] = [
  {
    name: 'Trainer Dashboard',
    href: '/instructor',
    icon: LayoutDashboard,
    requiredPermissions: [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.CLASS_VIEW,
      PERMISSIONS.USER_VIEW
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'My Batches',
    href: '/instructor/batches',
    icon: BookOpen,
    requiredPermissions: [PERMISSIONS.BATCH_VIEW, PERMISSIONS.BATCH_UPDATE],
    permissionMode: 'ANY'
  },
  {
    name: 'My Classes',
    href: '/instructor/classes',
    icon: Calendar,
    requiredPermissions: [PERMISSIONS.CLASS_VIEW, PERMISSIONS.CLASS_UPDATE],
    permissionMode: 'ANY'
  },
  {
    name: 'Calendar & Schedule',
    href: '/instructor/calendar',
    icon: Calendar,
    requiredPermissions: [PERMISSIONS.ACADEMIC_CALENDAR_VIEW, PERMISSIONS.TIMETABLE_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Grading & Submissions',
    href: '/instructor/grading',
    icon: ClipboardCheck,
    requiredPermissions: [PERMISSIONS.ASSESSMENT_GRADE, PERMISSIONS.ASSESSMENT_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Assessments',
    href: '/instructor/assessments',
    icon: Award,
    requiredPermissions: [PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.ASSESSMENT_CREATE],
    permissionMode: 'ANY'
  },
  {
    name: 'Students',
    href: '/instructor/students',
    icon: Users,
    requiredPermissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.PROGRESS_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Availability',
    href: '/instructor/availability',
    icon: Clock,
    requiredPermissions: [PERMISSIONS.TIMETABLE_VIEW, PERMISSIONS.ACADEMIC_CALENDAR_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Communications',
    href: '/instructor/communications',
    icon: Megaphone,
    requiredPermissions: [
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Users
  }
];

/**
 * Single source of truth for Student Learning Portal Navigation.
 * Maps all student portal destinations to authoritative RBAC permissions.
 */
export const STUDENT_NAVIGATION_CONFIG: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/student',
    icon: LayoutDashboard,
    requiredPermissions: [PERMISSIONS.PROGRESS_VIEW, PERMISSIONS.USER_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Inbox & Updates',
    href: '/student/inbox',
    icon: Megaphone,
    requiredPermissions: [
      PERMISSIONS.COMMUNICATION_INBOX_VIEW,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW
    ],
    permissionMode: 'ANY'
  },
  {
    name: 'Messages',
    href: '/student/conversations',
    icon: MessageSquare,
    requiredPermissions: [PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'My Courses',
    href: '/student/courses',
    icon: BookOpen,
    requiredPermissions: [PERMISSIONS.COURSE_VIEW, PERMISSIONS.ENROLLMENT_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'My Fees & Receipts',
    href: '/student/fees',
    icon: IndianRupee,
    requiredPermissions: [PERMISSIONS.FEE_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'My Attendance',
    href: '/student/attendance',
    icon: ClipboardCheck,
    requiredPermissions: [PERMISSIONS.ATTENDANCE_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'My Calendar',
    href: '/student/calendar',
    icon: Calendar,
    requiredPermissions: [PERMISSIONS.ACADEMIC_CALENDAR_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Quizzes & Assignments',
    href: '/student/assessments',
    icon: Award,
    requiredPermissions: [PERMISSIONS.ASSESSMENT_VIEW, PERMISSIONS.ASSESSMENT_SUBMIT],
    permissionMode: 'ANY'
  },
  {
    name: 'My Certificates',
    href: '/student/certificates',
    icon: Award,
    requiredPermissions: [PERMISSIONS.CERTIFICATE_OWN_VIEW, PERMISSIONS.CERTIFICATE_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'My Profile',
    href: '/student/profile',
    icon: User,
    requiredPermissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.STUDENT_OWN_LIFECYCLE_VIEW],
    permissionMode: 'ANY'
  },
  {
    name: 'Explore Catalog',
    href: '/courses',
    icon: Compass
  }
];

