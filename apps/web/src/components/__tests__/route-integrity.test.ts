import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  ADMIN_NAVIGATION_CONFIG,
  INSTRUCTOR_NAVIGATION_CONFIG,
  STUDENT_NAVIGATION_CONFIG
} from '../../config/navigation';
import {
  PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  filterNavigationTree,
  NavigationItem
} from '@edtech/permissions';

describe('Cross-Portal Route Integrity & Navigation Target Audit', () => {
  const webAppDir = path.resolve(__dirname, '../../app');

  function resolveRouteToFile(href: string): boolean {
    const cleanHref = href.split('?')[0].split('#')[0];
    if (cleanHref === '/') {
      return fs.existsSync(path.join(webAppDir, 'page.tsx'));
    }

    // Direct match: apps/web/src/app${cleanHref}/page.tsx
    const directPath = path.join(webAppDir, cleanHref, 'page.tsx');
    if (fs.existsSync(directPath)) return true;

    // Check with route groups, e.g. apps/web/src/app/(public)${cleanHref}/page.tsx
    const publicGroupPath = path.join(webAppDir, '(public)', cleanHref, 'page.tsx');
    if (fs.existsSync(publicGroupPath)) return true;

    return false;
  }

  function collectAllHrefs(items: NavigationItem[]): string[] {
    const hrefs: string[] = [];
    for (const item of items) {
      if (item.href) hrefs.push(item.href);
      if (item.children) {
        for (const child of item.children) {
          if (child.href) hrefs.push(child.href);
        }
      }   
    }
    return hrefs;
  }

  it('verifies every Instructor Portal navigation link maps to a real Next.js page', () => {
    const instructorHrefs = collectAllHrefs(INSTRUCTOR_NAVIGATION_CONFIG);
    expect(instructorHrefs).toContain('/instructor/students');
    expect(instructorHrefs).toContain('/instructor/batches');
    expect(instructorHrefs).toContain('/instructor/classes');
    expect(instructorHrefs).toContain('/instructor/calendar');
    expect(instructorHrefs).toContain('/instructor/grading');

    for (const href of instructorHrefs) {
      const exists = resolveRouteToFile(href);
      expect(exists, `Instructor navigation href "${href}" must resolve to an existing Next.js page.tsx`).toBe(true);
    }
  });

  it('verifies /instructor/students page exists and is visible to Instructor persona', () => {
    const exists = resolveRouteToFile('/instructor/students');
    expect(exists).toBe(true);

    const instructorPerms = SYSTEM_ROLE_PERMISSIONS.INSTRUCTOR;
    const filtered = filterNavigationTree(INSTRUCTOR_NAVIGATION_CONFIG, instructorPerms, false);
    const names = filtered.map(item => item.name);
    expect(names).toContain('Students');

    const studentsItem = filtered.find(item => item.name === 'Students');
    expect(studentsItem?.href).toBe('/instructor/students');
  });

  it('verifies every Student Portal navigation link maps to a real Next.js page', () => {
    const studentHrefs = collectAllHrefs(STUDENT_NAVIGATION_CONFIG);
    expect(studentHrefs).toContain('/student');
    expect(studentHrefs).toContain('/student/courses');
    expect(studentHrefs).toContain('/student/calendar');

    for (const href of studentHrefs) {
      const exists = resolveRouteToFile(href);
      expect(exists, `Student navigation href "${href}" must resolve to an existing Next.js page.tsx`).toBe(true);
    }
  });

  it('verifies every Admin Portal navigation link maps to a real Next.js page', () => {
    const adminHrefs = collectAllHrefs(ADMIN_NAVIGATION_CONFIG);

    for (const href of adminHrefs) {
      const exists = resolveRouteToFile(href);
      expect(exists, `Admin navigation href "${href}" must resolve to an existing Next.js page.tsx`).toBe(true);
    }
  });
});
