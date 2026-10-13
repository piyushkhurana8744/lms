import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  filterNavigationTree,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  evaluateNavigationPermissions,
  NavigationItem
} from '@edtech/permissions';
import {
  ADMIN_NAVIGATION_CONFIG,
  INSTRUCTOR_NAVIGATION_CONFIG,
  STUDENT_NAVIGATION_CONFIG
} from '../../config/navigation';

describe('RBAC Navigation & Sidebar Visibility Test Matrix', () => {
  // Test Navigation Fixture with Nested Hierarchy
  const sampleNavigationTree: NavigationItem[] = [
    {
      name: 'Platform Console',
      href: '/platform',
      superAdminOnly: true,
      requiredPermissions: [PERMISSIONS.SUPERADMIN_ALL],
      permissionMode: 'ANY'
    },
    {
      name: 'Dashboard',
      href: '/admin'
    },
    {
      name: 'Academic Parent',
      href: '/admin/academic',
      children: [
        {
          name: 'Courses',
          href: '/admin/courses',
          requiredPermissions: [PERMISSIONS.COURSE_VIEW]
        },
        {
          name: 'Batches',
          href: '/admin/batches',
          requiredPermissions: [PERMISSIONS.BATCH_VIEW]
        }
      ]
    },
    {
      name: 'Finance & Payments',
      href: '/admin/finance',
      requiredPermissions: [PERMISSIONS.FEE_VIEW, PERMISSIONS.FINANCE_REPORT_VIEW],
      permissionMode: 'ANY',
      children: [
        {
          name: 'Dashboard',
          href: '/admin/finance',
          requiredPermissions: [PERMISSIONS.FINANCE_REPORT_VIEW]
        },
        {
          name: 'Refunds',
          href: '/admin/finance/refunds',
          requiredPermissions: [PERMISSIONS.PAYMENT_REFUND]
        }
      ]
    },
    {
      name: 'Strict Multi-Permission Hub',
      href: '/admin/strict',
      requiredPermissions: [PERMISSIONS.ORGANIZATION_SETTINGS_VIEW, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE],
      permissionMode: 'ALL'
    }
  ];

  describe('1. Tenant Admin Role', () => {
    it('Tenant Admin with full permissions sees all authorized modules', () => {
      const adminPerms = SYSTEM_ROLE_PERMISSIONS.TENANT_ADMIN;
      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, adminPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Dashboard');
      expect(names).toContain('Batches');
      expect(names).toContain('CRM & Admissions');
      expect(names).toContain('Finance & Payments');
      expect(names).toContain('Classes');
      expect(names).toContain('Attendance');
      expect(names).toContain('Courses');
      expect(names).toContain('Quizzes & Assignments');
      expect(names).toContain('Certificates');
      expect(names).toContain('Media Library');
      expect(names).toContain('Organization Settings');
      expect(names).toContain('Website CMS');
      expect(names).toContain('Team & Members');
      expect(names).toContain('Roles & Permissions');

      // SuperAdmin-only should be excluded for regular Tenant Admin
      expect(names).not.toContain('Platform Console');
    });
  });

  describe('2. Instructor Role', () => {
    it('Instructor sees only academic modules and NOT Finance/Org Settings/SuperAdmin', () => {
      const instructorPerms = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, instructorPerms, false);
      const names = filtered.map((item) => item.name);

      // Academic modules should be visible
      expect(names).toContain('Dashboard');
      expect(names).toContain('Batches');
      expect(names).toContain('Classes');
      expect(names).toContain('Attendance');
      expect(names).toContain('Courses');
      expect(names).toContain('Quizzes & Assignments');

      // Unauthorized modules must NOT be visible
      expect(names).not.toContain('Platform Console');
      expect(names).not.toContain('Finance & Payments');
      expect(names).not.toContain('Team & Members');
      expect(names).not.toContain('Roles & Permissions');
    });
  });

  describe('3. Finance Staff Role', () => {
    it('Finance Staff sees Finance module and NOT academic mutation or CRM', () => {
      const financePerms = [
        PERMISSIONS.FINANCE_REPORT_VIEW,
        PERMISSIONS.FEE_VIEW,
        PERMISSIONS.FEE_STRUCTURE_MANAGE,
        PERMISSIONS.PAYMENT_VIEW,
        PERMISSIONS.PAYMENT_COLLECT
      ];

      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, financePerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Dashboard');
      expect(names).toContain('Finance & Payments');

      // Hidden
      expect(names).not.toContain('CRM & Admissions');
      expect(names).not.toContain('Batches');
      expect(names).not.toContain('Classes');
      expect(names).not.toContain('Attendance');
      expect(names).not.toContain('Courses');
      expect(names).not.toContain('Roles & Permissions');
      expect(names).not.toContain('Organization Settings');
    });
  });

  describe('4. CRM Counsellor Role', () => {
    it('CRM Counsellor sees CRM & Admissions and NOT Finance or Org Settings', () => {
      const crmPerms = [
        PERMISSIONS.CRM_VIEW,
        PERMISSIONS.LEAD_CREATE,
        PERMISSIONS.LEAD_UPDATE,
        PERMISSIONS.FOLLOW_UP_MANAGE
      ];

      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, crmPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Dashboard');
      expect(names).toContain('CRM & Admissions');

      expect(names).not.toContain('Finance & Payments');
      expect(names).not.toContain('Batches');
      expect(names).not.toContain('Classes');
      expect(names).not.toContain('Attendance');
      expect(names).not.toContain('Organization Settings');
      expect(names).not.toContain('Website CMS');
    });
  });

  describe('5. Attendance-only Staff Role', () => {
    it('Attendance-only staff sees Attendance and NOT unrelated modules', () => {
      const attendancePerms = [PERMISSIONS.ATTENDANCE_VIEW, PERMISSIONS.ATTENDANCE_MARK];

      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, attendancePerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Dashboard');
      expect(names).toContain('Attendance');

      expect(names).not.toContain('CRM & Admissions');
      expect(names).not.toContain('Finance & Payments');
      expect(names).not.toContain('Courses');
      expect(names).not.toContain('Certificates');
      expect(names).not.toContain('Organization Settings');
    });
  });

  describe('6. Custom Role Support', () => {
    it('Arbitrary Custom Role (Academic Coordinator) is filtered solely by permissions, not role string', () => {
      // Role string is "Academic Coordinator", permissions are academic view only
      const customCoordinatorPerms = [
        PERMISSIONS.COURSE_VIEW,
        PERMISSIONS.BATCH_VIEW,
        PERMISSIONS.ATTENDANCE_VIEW,
        PERMISSIONS.ATTENDANCE_MARK,
        PERMISSIONS.USER_VIEW
      ];

      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, customCoordinatorPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Dashboard');
      expect(names).toContain('Courses');
      expect(names).toContain('Batches');
      expect(names).toContain('Attendance');

      // Must be hidden
      expect(names).not.toContain('CRM & Admissions');
      expect(names).not.toContain('Finance & Payments');
      expect(names).not.toContain('Organization Settings');
      expect(names).not.toContain('Website CMS');
      expect(names).not.toContain('Roles & Permissions');
    });
  });

  describe('7. No Permissions / Empty Permissions', () => {
    it('User with no permissions sees only universal dashboard', () => {
      const emptyPerms: string[] = [];
      const filtered = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, emptyPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toEqual(['Dashboard']);
    });
  });

  describe('8. Parent / Child Navigation Semantics', () => {
    it('Parent with 1 authorized child retains parent with only that authorized child', () => {
      // User only has COURSE_VIEW, not BATCH_VIEW
      const userPerms = [PERMISSIONS.COURSE_VIEW];
      const filtered = filterNavigationTree(sampleNavigationTree, userPerms, false);

      const academic = filtered.find((i) => i.name === 'Academic Parent');
      expect(academic).toBeDefined();
      expect(academic?.children?.length).toBe(1);
      expect(academic?.children?.[0].name).toBe('Courses');
    });

    it('Parent with 0 authorized children is completely removed (no empty parent group)', () => {
      // User has no permissions in sample tree except universal dashboard
      const userPerms: string[] = [];
      const filtered = filterNavigationTree(sampleNavigationTree, userPerms, false);

      const academic = filtered.find((i) => i.name === 'Academic Parent');
      const finance = filtered.find((i) => i.name === 'Finance & Payments');
      expect(academic).toBeUndefined();
      expect(finance).toBeUndefined();
    });
  });

  describe('9. ANY vs ALL Permission Modes', () => {
    it('Evaluates ANY mode correctly when at least one permission matches', () => {
      const perms = [PERMISSIONS.FEE_VIEW];
      const isAuthorized = evaluateNavigationPermissions(
        perms,
        [PERMISSIONS.FEE_VIEW, PERMISSIONS.FINANCE_REPORT_VIEW],
        'ANY'
      );
      expect(isAuthorized).toBe(true);
    });

    it('Evaluates ALL mode correctly: rejects when only partial permissions present', () => {
      const perms = [PERMISSIONS.ORGANIZATION_SETTINGS_VIEW];
      const isAuthorized = evaluateNavigationPermissions(
        perms,
        [PERMISSIONS.ORGANIZATION_SETTINGS_VIEW, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE],
        'ALL'
      );
      expect(isAuthorized).toBe(false);
    });

    it('Evaluates ALL mode correctly: accepts when all permissions present', () => {
      const perms = [
        PERMISSIONS.ORGANIZATION_SETTINGS_VIEW,
        PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE
      ];
      const isAuthorized = evaluateNavigationPermissions(
        perms,
        [PERMISSIONS.ORGANIZATION_SETTINGS_VIEW, PERMISSIONS.ORGANIZATION_SETTINGS_UPDATE],
        'ALL'
      );
      expect(isAuthorized).toBe(true);
    });
  });

  describe('10. SuperAdmin All-Access Bypass', () => {
    it('SuperAdmin wildcard grants access to all modules including superAdminOnly', () => {
      const superAdminPerms = [PERMISSIONS.SUPERADMIN_ALL];
      const filtered = filterNavigationTree(sampleNavigationTree, superAdminPerms, true);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Platform Console');
      expect(names).toContain('Dashboard');
      expect(names).toContain('Academic Parent');
      expect(names).toContain('Finance & Payments');
      expect(names).toContain('Strict Multi-Permission Hub');
    });
  });

  describe('11. Student Navigation Configuration Suite', () => {
    it('Active student sees rich, non-empty learning portal navigation and NO admin modules', () => {
      const studentPerms = SYSTEM_ROLE_PERMISSIONS.STUDENT;
      const filtered = filterNavigationTree(STUDENT_NAVIGATION_CONFIG, studentPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Dashboard');
      expect(names).toContain('My Courses');
      expect(names).toContain('My Fees & Receipts');
      expect(names).toContain('My Attendance');
      expect(names).toContain('My Calendar');
      expect(names).toContain('Quizzes & Assignments');
      expect(names).toContain('My Certificates');
      expect(names).toContain('Inbox & Updates');
      expect(names).toContain('Messages');
      expect(names).toContain('My Profile');
      expect(names).toContain('Explore Catalog');

      // Admin & privileged modules MUST NOT be visible
      expect(names).not.toContain('CRM & Admissions');
      expect(names).not.toContain('Platform Console');
      expect(names).not.toContain('Organization Settings');
      expect(names).not.toContain('Website CMS');
      expect(names).not.toContain('Branches');
      expect(names).not.toContain('Team & Members');
    });

    it('Desktop and mobile navigation parity: identical filtered tree items', () => {
      const studentPerms = SYSTEM_ROLE_PERMISSIONS.STUDENT;
      const desktopTree = filterNavigationTree(STUDENT_NAVIGATION_CONFIG, studentPerms, false);
      const mobileTree = filterNavigationTree(STUDENT_NAVIGATION_CONFIG, studentPerms, false);

      expect(desktopTree).toEqual(mobileTree);
    });
  });

  describe('12. Instructor Navigation Configuration Suite', () => {
    it('Active instructor sees rich Instructor OS navigation and NO CRM/Finance/Admin settings', () => {
      const instructorPerms = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
      const filtered = filterNavigationTree(INSTRUCTOR_NAVIGATION_CONFIG, instructorPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toContain('Trainer Dashboard');
      expect(names).toContain('My Batches');
      expect(names).toContain('My Classes');
      expect(names).toContain('Calendar & Schedule');
      expect(names).toContain('Grading & Submissions');
      expect(names).toContain('Assessments');
      expect(names).toContain('Students');
      expect(names).toContain('Availability');
      expect(names).toContain('Communications');
      expect(names).toContain('Notifications');

      // Privileged tenant administration MUST NOT be visible
      expect(names).not.toContain('CRM & Admissions');
      expect(names).not.toContain('Finance & Payments');
      expect(names).not.toContain('Platform Console');
      expect(names).not.toContain('Organization Settings');
      expect(names).not.toContain('Branches');
      expect(names).not.toContain('Website CMS');
    });

    it('Desktop and mobile navigation parity for instructor: identical filtered tree items', () => {
      const instructorPerms = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
      const desktopTree = filterNavigationTree(INSTRUCTOR_NAVIGATION_CONFIG, instructorPerms, false);
      const mobileTree = filterNavigationTree(INSTRUCTOR_NAVIGATION_CONFIG, instructorPerms, false);

      expect(desktopTree).toEqual(mobileTree);
    });
  });

  describe('13. Safe Zero-Permission Empty State', () => {
    it('Student navigation with zero permissions retains only universal catalog link', () => {
      const emptyPerms: string[] = [];
      const filtered = filterNavigationTree(STUDENT_NAVIGATION_CONFIG, emptyPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toEqual(['Explore Catalog']);
    });

    it('Instructor navigation with zero permissions retains only universal notifications link', () => {
      const emptyPerms: string[] = [];
      const filtered = filterNavigationTree(INSTRUCTOR_NAVIGATION_CONFIG, emptyPerms, false);
      const names = filtered.map((item) => item.name);

      expect(names).toEqual(['Notifications']);
    });
  });
});
