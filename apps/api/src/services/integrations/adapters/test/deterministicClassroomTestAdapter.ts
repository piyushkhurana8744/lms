import {
  AcademicPlatformProvider,
  ExternalCourseItem,
  ExternalTeacherItem,
  ExternalStudentItem,
  ExternalCourseworkAssignment,
  ExternalSubmissionItem,
  ListCoursesPagination,
  ListCoursesResult
} from '../../contracts/academicPlatformProvider.contract';
import { HealthCheckResult } from '../../contracts/liveMeetingProvider.contract';
import { IIntegrationConnectionDocument } from '@edtech/database';
import { IntegrationProvider } from '@edtech/types';

export interface ClassroomInjectedFailureConfig {
  errorType?: '429' | '503' | 'AUTH_EXPIRED' | 'FAIL_ON_PAGE_2' | 'NOT_FOUND';
  remainingCount?: number;
}

export class DeterministicClassroomTestAdapter implements AcademicPlatformProvider {
  public readonly provider: IntegrationProvider = 'GOOGLE_CLASSROOM';

  public coursesStore = new Map<string, ExternalCourseItem>();
  public teachersStore = new Map<string, ExternalTeacherItem[]>(); // courseId -> teachers
  public studentsStore = new Map<string, ExternalStudentItem[]>(); // courseId -> students
  public courseworkStore = new Map<string, ExternalCourseworkAssignment[]>(); // courseId -> coursework
  public submissionsStore = new Map<string, ExternalSubmissionItem[]>(); // courseworkId -> submissions

  private injectedFailure: ClassroomInjectedFailureConfig | null = null;

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData() {
    this.coursesStore.set('gc_course_101', {
      id: 'gc_course_101',
      name: 'Digital Marketing Masterclass - Alpha Batch',
      section: 'Batch 2026-A',
      courseState: 'ACTIVE',
      alternateLink: 'https://classroom.google.com/c/gc_course_101'
    });
  }

  public setInjectedFailure(config: ClassroomInjectedFailureConfig | null) {
    this.injectedFailure = config;
  }

  public clearStore() {
    this.coursesStore.clear();
    this.teachersStore.clear();
    this.studentsStore.clear();
    this.courseworkStore.clear();
    this.submissionsStore.clear();
    this.injectedFailure = null;
    this.seedDefaultData();
  }

  private checkInjectedFailure(pagination?: ListCoursesPagination) {
    if (!this.injectedFailure || (this.injectedFailure.remainingCount !== undefined && this.injectedFailure.remainingCount <= 0)) {
      return;
    }

    const { errorType } = this.injectedFailure;

    if (errorType === 'FAIL_ON_PAGE_2' && pagination?.pageToken === 'page_token_2') {
      if (this.injectedFailure.remainingCount !== undefined) {
        this.injectedFailure.remainingCount -= 1;
      }
      const err: any = new Error('Injected failure on pagination page 2');
      err.code = 'PAGINATION_PAGE_ERROR';
      throw err;
    }

    if (errorType === '429') {
      if (this.injectedFailure.remainingCount !== undefined) {
        this.injectedFailure.remainingCount -= 1;
      }
      const err: any = new Error('Google Classroom rate limit exceeded (HTTP 429)');
      err.status = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }

    if (errorType === '503') {
      if (this.injectedFailure.remainingCount !== undefined) {
        this.injectedFailure.remainingCount -= 1;
      }
      const err: any = new Error('Google Classroom service unavailable (HTTP 503)');
      err.status = 503;
      err.code = 'TEMPORARY_PROVIDER_FAILURE';
      throw err;
    }
  }

  public async listExternalCourses(
    connection: IIntegrationConnectionDocument,
    pagination?: ListCoursesPagination
  ): Promise<ListCoursesResult> {
    this.checkInjectedFailure(pagination);
    const all = Array.from(this.coursesStore.values());
    const pageSize = pagination?.pageSize || 20;

    if (pagination?.pageToken === 'page_token_2') {
      return {
        courses: all.slice(pageSize, pageSize * 2),
        nextPageToken: all.length > pageSize * 2 ? 'page_token_3' : undefined
      };
    }

    return {
      courses: all.slice(0, pageSize),
      nextPageToken: all.length > pageSize ? 'page_token_2' : undefined
    };
  }

  public async getExternalCourse(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalCourseItem | null> {
    return this.coursesStore.get(externalCourseId) || null;
  }

  public async createExternalCourse(
    connection: IIntegrationConnectionDocument,
    input: { name: string; section?: string; description?: string }
  ): Promise<ExternalCourseItem> {
    const id = `gc_course_${Date.now()}`;
    const course: ExternalCourseItem = {
      id,
      name: input.name,
      section: input.section,
      descriptionHeading: input.description,
      courseState: 'ACTIVE',
      alternateLink: `https://classroom.google.com/c/${id}`
    };
    this.coursesStore.set(id, course);
    return course;
  }

  public async getTeachers(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalTeacherItem[]> {
    return this.teachersStore.get(externalCourseId) || [];
  }

  public async getStudents(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalStudentItem[]> {
    return this.studentsStore.get(externalCourseId) || [];
  }

  public async addTeacher(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    email: string
  ): Promise<ExternalTeacherItem> {
    const teachers = this.teachersStore.get(externalCourseId) || [];
    const item: ExternalTeacherItem = {
      userId: `teacher_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      profile: {
        id: `teacher_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: { fullName: email.split('@')[0] },
        emailAddress: email
      }
    };
    teachers.push(item);
    this.teachersStore.set(externalCourseId, teachers);
    return item;
  }

  public async addStudent(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    email: string
  ): Promise<ExternalStudentItem> {
    const students = this.studentsStore.get(externalCourseId) || [];
    const item: ExternalStudentItem = {
      userId: `student_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      profile: {
        id: `student_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: { fullName: email.split('@')[0] },
        emailAddress: email
      }
    };
    students.push(item);
    this.studentsStore.set(externalCourseId, students);
    return item;
  }

  public async removeTeacher(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    externalUserId: string
  ): Promise<boolean> {
    const teachers = this.teachersStore.get(externalCourseId) || [];
    this.teachersStore.set(
      externalCourseId,
      teachers.filter((t) => t.userId !== externalUserId)
    );
    return true;
  }

  public async removeStudent(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    externalUserId: string
  ): Promise<boolean> {
    const students = this.studentsStore.get(externalCourseId) || [];
    this.studentsStore.set(
      externalCourseId,
      students.filter((s) => s.userId !== externalUserId)
    );
    return true;
  }

  public async listCoursework(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalCourseworkAssignment[]> {
    return this.courseworkStore.get(externalCourseId) || [];
  }

  public async createCoursework(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    coursework: { title: string; description?: string; maxPoints?: number; dueDate?: Date }
  ): Promise<ExternalCourseworkAssignment> {
    const list = this.courseworkStore.get(externalCourseId) || [];
    const id = `cw_${Date.now()}_${list.length + 1}`;
    const item: ExternalCourseworkAssignment = {
      id,
      title: coursework.title,
      description: coursework.description,
      state: 'PUBLISHED',
      maxPoints: coursework.maxPoints || 100,
      workType: 'ASSIGNMENT',
      alternateLink: `https://classroom.google.com/c/${externalCourseId}/a/${id}`
    };
    list.push(item);
    this.courseworkStore.set(externalCourseId, list);
    return item;
  }

  public async listSubmissions(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    courseWorkId: string
  ): Promise<ExternalSubmissionItem[]> {
    return this.submissionsStore.get(courseWorkId) || [];
  }

  public async patchGrade(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    courseWorkId: string,
    submissionId: string,
    assignedGrade: number
  ): Promise<ExternalSubmissionItem> {
    const list = this.submissionsStore.get(courseWorkId) || [];
    const target = list.find((s) => s.id === submissionId);
    if (target) {
      target.assignedGrade = assignedGrade;
      target.state = 'RETURNED';
      return target;
    }
    const created: ExternalSubmissionItem = {
      id: submissionId,
      courseWorkId,
      userId: 'student_1',
      state: 'RETURNED',
      assignedGrade
    };
    list.push(created);
    this.submissionsStore.set(courseWorkId, list);
    return created;
  }

  public async healthCheck(
    connection: IIntegrationConnectionDocument
  ): Promise<HealthCheckResult> {
    if (this.injectedFailure?.errorType === 'AUTH_EXPIRED') {
      return { healthy: false, message: 'OAuth expired' };
    }
    return {
      healthy: true,
      message: 'Google Classroom test adapter active',
      externalAccountId: connection.externalAccountId || 'test_classroom_account',
      scopes: connection.scopes,
      latencyMs: 5
    };
  }
}
