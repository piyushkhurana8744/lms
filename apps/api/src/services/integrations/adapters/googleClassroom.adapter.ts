import { AcademicPlatformProvider, ExternalCourseItem, ExternalTeacherItem, ExternalStudentItem, ExternalCourseworkAssignment, ExternalSubmissionItem, ListCoursesPagination, ListCoursesResult } from '../contracts/academicPlatformProvider.contract';
import { HealthCheckResult } from '../contracts/liveMeetingProvider.contract';
import { IIntegrationConnectionDocument } from '@edtech/database';
import { IntegrationProvider } from '@edtech/types';
import { TokenManagerService } from '../security/tokenManager.service';

const BASE = 'https://classroom.googleapis.com/v1';

export class GoogleClassroomAdapter implements AcademicPlatformProvider {
  readonly provider: IntegrationProvider = 'GOOGLE_CLASSROOM';

  private async token(c: IIntegrationConnectionDocument) {
    return TokenManagerService.getValidAccessToken(c, async (refreshToken, creds) => {
      if (!creds.clientId || !creds.clientSecret) throw new Error('Google OAuth client configuration is missing');
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: creds.clientId, client_secret: creds.clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
      const data: any = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token) throw new Error(`Google token refresh failed (${response.status})`);
      return { accessToken: data.access_token, expiresInSeconds: data.expires_in || 3600 };
    });
  }

  private async request<T>(c: IIntegrationConnectionDocument, path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.token(c);
    const response = await fetch(`${BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) } });
    if (response.status === 404) throw Object.assign(new Error('Google Classroom resource not found'), { status: 404, category: 'RESOURCE_NOT_FOUND' });
    if (response.status === 401) throw Object.assign(new Error('Google Classroom authorization expired'), { status: 401, category: 'AUTH_REQUIRED' });
    if (response.status === 403) throw Object.assign(new Error('Google Classroom permission or scope denied'), { status: 403, category: 'PERMISSION_DENIED' });
    if (response.status === 429) throw Object.assign(new Error('Google Classroom rate limit exceeded'), { status: 429, category: 'RATE_LIMITED', retryAfter: response.headers.get('retry-after') });
    if (!response.ok) throw Object.assign(new Error(`Google Classroom request failed (${response.status})`), { status: response.status, category: response.status >= 500 ? 'TEMPORARY_PROVIDER_FAILURE' : 'INVALID_REQUEST' });
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async listExternalCourses(c: IIntegrationConnectionDocument, p: ListCoursesPagination = {}): Promise<ListCoursesResult> {
    const q = new URLSearchParams({ pageSize: String(p.pageSize || 20), courseStates: 'ACTIVE' }); if (p.pageToken) q.set('pageToken', p.pageToken);
    const d = await this.request<any>(c, `/courses?${q}`); return { courses: d.courses || [], nextPageToken: d.nextPageToken };
  }
  async getExternalCourse(c: IIntegrationConnectionDocument, id: string): Promise<ExternalCourseItem | null> { try { return await this.request(c, `/courses/${encodeURIComponent(id)}`); } catch (e: any) { if (e.status === 404) return null; throw e; } }
  async createExternalCourse(c: IIntegrationConnectionDocument, input: { name: string; section?: string; description?: string }): Promise<ExternalCourseItem> { return this.request(c, '/courses', { method: 'POST', body: JSON.stringify({ ...input, ownerId: 'me', courseState: 'PROVISIONED' }) }); }
  async getTeachers(c: IIntegrationConnectionDocument, id: string): Promise<ExternalTeacherItem[]> { return this.collect(c, `/courses/${encodeURIComponent(id)}/teachers`, 'teachers'); }
  async getStudents(c: IIntegrationConnectionDocument, id: string): Promise<ExternalStudentItem[]> { return this.collect(c, `/courses/${encodeURIComponent(id)}/students`, 'students'); }
  async addTeacher(c: IIntegrationConnectionDocument, id: string, email: string): Promise<ExternalTeacherItem> { return this.request(c, `/courses/${encodeURIComponent(id)}/teachers`, { method: 'POST', body: JSON.stringify({ userId: email }) }); }
  async addStudent(c: IIntegrationConnectionDocument, id: string, email: string): Promise<ExternalStudentItem> { return this.request(c, `/courses/${encodeURIComponent(id)}/students`, { method: 'POST', body: JSON.stringify({ userId: email }) }); }
  async removeTeacher(c: IIntegrationConnectionDocument, id: string, user: string) { await this.request(c, `/courses/${encodeURIComponent(id)}/teachers/${encodeURIComponent(user)}`, { method: 'DELETE' }); return true; }
  async removeStudent(c: IIntegrationConnectionDocument, id: string, user: string) { await this.request(c, `/courses/${encodeURIComponent(id)}/students/${encodeURIComponent(user)}`, { method: 'DELETE' }); return true; }
  async listCoursework(c: IIntegrationConnectionDocument, id: string): Promise<ExternalCourseworkAssignment[]> { return this.collect(c, `/courses/${encodeURIComponent(id)}/courseWork`, 'courseWork'); }
  async createCoursework(c: IIntegrationConnectionDocument, id: string, work: { title: string; description?: string; maxPoints?: number; dueDate?: Date }): Promise<ExternalCourseworkAssignment> { const due = work.dueDate; return this.request(c, `/courses/${encodeURIComponent(id)}/courseWork`, { method: 'POST', body: JSON.stringify({ title: work.title, description: work.description, maxPoints: work.maxPoints, workType: 'ASSIGNMENT', state: 'PUBLISHED', ...(due ? { dueDate: { year: due.getUTCFullYear(), month: due.getUTCMonth() + 1, day: due.getUTCDate() } } : {}) }) }); }
  async listSubmissions(c: IIntegrationConnectionDocument, id: string, workId: string): Promise<ExternalSubmissionItem[]> { return this.collect(c, `/courses/${encodeURIComponent(id)}/courseWork/${encodeURIComponent(workId)}/studentSubmissions`, 'studentSubmissions'); }
  async patchGrade(c: IIntegrationConnectionDocument, id: string, workId: string, submissionId: string, assignedGrade: number): Promise<ExternalSubmissionItem> { return this.request(c, `/courses/${encodeURIComponent(id)}/courseWork/${encodeURIComponent(workId)}/studentSubmissions/${encodeURIComponent(submissionId)}?updateMask=assignedGrade`, { method: 'PATCH', body: JSON.stringify({ assignedGrade }) }); }
  private async collect<T>(c: IIntegrationConnectionDocument, path: string, key: string): Promise<T[]> { const out: T[] = []; let pageToken: string | undefined; do { const q = new URLSearchParams({ pageSize: '100' }); if (pageToken) q.set('pageToken', pageToken); const d = await this.request<any>(c, `${path}?${q}`); out.push(...(d[key] || [])); pageToken = d.nextPageToken; } while (pageToken); return out; }
  async healthCheck(c: IIntegrationConnectionDocument): Promise<HealthCheckResult> { const start = Date.now(); try { await this.listExternalCourses(c, { pageSize: 1 }); return { healthy: true, message: 'Google Classroom API reachable', externalAccountId: c.externalAccountId, scopes: c.scopes, latencyMs: Date.now() - start }; } catch (e: any) { return { healthy: false, message: e.message, latencyMs: Date.now() - start }; } }
}
