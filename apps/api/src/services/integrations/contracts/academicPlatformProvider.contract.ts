import {
  IntegrationProvider,
  ExternalSyncDirection,
  GradeSyncPolicy,
  ISyncRunCounts
} from '@edtech/types';
import { IIntegrationConnectionDocument } from '@edtech/database';
import { HealthCheckResult } from './liveMeetingProvider.contract';

export interface ExternalCourseItem {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  creationTime?: string;
  updateTime?: string;
}

export interface ExternalTeacherItem {
  userId: string;
  profile: {
    id: string;
    name: { fullName: string; givenName?: string; familyName?: string };
    emailAddress: string;
    photoUrl?: string;
  };
}

export interface ExternalStudentItem {
  userId: string;
  profile: {
    id: string;
    name: { fullName: string; givenName?: string; familyName?: string };
    emailAddress: string;
    photoUrl?: string;
  };
  studentWorkFolder?: { id: string; alternateLink?: string };
}

export interface ExternalCourseworkAssignment {
  id: string;
  title: string;
  description?: string;
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
}

export interface ExternalSubmissionItem {
  id: string;
  courseWorkId: string;
  userId: string;
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT';
  late?: boolean;
  draftGrade?: number;
  assignedGrade?: number;
  alternateLink?: string;
  updateTime?: string;
}

export interface SyncRosterResult {
  teachersAdded: number;
  teachersRemoved: number;
  studentsAdded: number;
  studentsRemoved: number;
  unresolvedTeachers: Array<{ email: string; reason: string }>;
  unresolvedStudents: Array<{ email: string; reason: string }>;
}

export interface SyncCourseworkResult {
  courseworkSynced: number;
  submissionsSynced: number;
  gradesSynced: number;
  conflicts: Array<{ key: string; description: string; didmValue: any; externalValue: any }>;
}

export interface ListCoursesPagination {
  pageSize?: number;
  pageToken?: string;
}

export interface ListCoursesResult {
  courses: ExternalCourseItem[];
  nextPageToken?: string;
}

export interface AcademicPlatformProvider {
  readonly provider: IntegrationProvider;

  listExternalCourses(
    connection: IIntegrationConnectionDocument,
    pagination?: ListCoursesPagination
  ): Promise<ListCoursesResult>;

  getExternalCourse(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalCourseItem | null>;

  createExternalCourse(
    connection: IIntegrationConnectionDocument,
    input: { name: string; section?: string; description?: string }
  ): Promise<ExternalCourseItem>;

  getTeachers(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalTeacherItem[]>;

  getStudents(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalStudentItem[]>;

  addTeacher(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    email: string
  ): Promise<ExternalTeacherItem>;

  addStudent(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    email: string
  ): Promise<ExternalStudentItem>;

  removeTeacher(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    externalUserId: string
  ): Promise<boolean>;

  removeStudent(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    externalUserId: string
  ): Promise<boolean>;

  listCoursework(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string
  ): Promise<ExternalCourseworkAssignment[]>;

  createCoursework(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    coursework: { title: string; description?: string; maxPoints?: number; dueDate?: Date }
  ): Promise<ExternalCourseworkAssignment>;

  listSubmissions(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    courseWorkId: string
  ): Promise<ExternalSubmissionItem[]>;

  patchGrade(
    connection: IIntegrationConnectionDocument,
    externalCourseId: string,
    courseWorkId: string,
    submissionId: string,
    assignedGrade: number
  ): Promise<ExternalSubmissionItem>;

  healthCheck(
    connection: IIntegrationConnectionDocument
  ): Promise<HealthCheckResult>;
}
