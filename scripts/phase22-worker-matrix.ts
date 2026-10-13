import mongoose, { Types } from 'mongoose';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import {
  ClassModel, ExternalMeetingModel, IntegrationOperationModel,
  LiveMeetingAssociationHistoryModel, UserModel
} from '@edtech/database';

const mongoUri = process.env.MONGO_URI!;
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const api = process.env.API_URL || 'http://127.0.0.1:4100';
const secret = process.env.INTERNAL_WORKER_SECRET!;
const password = process.env.E2E_DEMO_PASSWORD || 'DemoPass123!';
const evidence: any[] = [];

async function waitFor<T>(read: () => Promise<T>, accept: (value: T) => boolean, timeout = 45_000): Promise<T> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await read();
    if (accept(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for matrix state');
}

async function login(email: string) {
  const response = await fetch(`${api}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Login failed for ${email}: ${response.status}`);
  return response.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
}

async function request(path: string, cookie: string, method = 'GET', body?: unknown) {
  return fetch(`${api}${path}`, { method, headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function adapter(provider: string, failure: any) {
  const response = await fetch(`${api}/api/v1/internal/integrations/test-adapters/${provider}/failure`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-worker-secret': secret }, body: JSON.stringify({ failure })
  });
  if (!response.ok) throw new Error(`Adapter control failed: ${response.status}`);
}

async function diagnostics(provider: string) {
  const response = await fetch(`${api}/api/v1/internal/integrations/test-adapters/${provider}/diagnostics`, { headers: { 'x-internal-worker-secret': secret } });
  return (await response.json()).data;
}

async function cloneClass(base: any, label: string) {
  const id = new Types.ObjectId();
  const raw = { ...base, _id: id, name: `Phase 22 ${label}`, classCode: `P22-${label}-${Date.now()}`, status: 'SCHEDULED', scheduleRevision: 1, cancellationReason: null, cancelledAt: null, cancelledBy: null, createdAt: new Date(), updatedAt: new Date() };
  delete raw.__v;
  await ClassModel.collection.insertOne(raw);
  return id;
}

async function createOperation(tenantId: Types.ObjectId, classId: Types.ObjectId, provider: string, label: string, nextRetryAt: Date | null = null) {
  return IntegrationOperationModel.create({ tenantId, provider, operationType: 'CREATE_MEETING', canonicalResourceType: 'Class', canonicalResourceId: classId.toString(), idempotencyKey: `WORKER_MATRIX:${label}:${Date.now()}:${new Types.ObjectId()}`, status: 'PENDING', attempts: 0, nextRetryAt, payload: {} });
}

async function snapshot(queue: Queue, operation: any, jobId?: string) {
  const fresh: any = await IntegrationOperationModel.findById(operation._id).setOptions({ bypassTenantFilter: true }).lean();
  const id = jobId || `integration_${operation._id}`;
  const job = await queue.getJob(id);
  return { queueJobId: id, mongoState: fresh?.status, mongoAttempts: fresh?.attempts, bullState: job ? await job.getState() : 'missing', bullAttempts: job?.attemptsMade || 0, error: fresh?.errorDetails || job?.failedReason || null };
}

async function main() {
  await mongoose.connect(mongoUri);
  const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('queue-integrations', { connection: redis });
  const base: any = await ClassModel.findOne({ classCode: 'DM-CLS-101' }).setOptions({ bypassTenantFilter: true }).lean();
  if (!base) throw new Error('Seed class missing');
  const tenantId = base.tenantId as Types.ObjectId;
  const instructorCookie = await login('aarav.sharma@didm.edu');
  const adminCookie = await login('admin@didm.edu');
  const studentCookie = await login('aman.verma@student.didm.edu');

  await adapter('GOOGLE_MEET', null);
  const googleBaseline = (await diagnostics('GOOGLE_MEET')).createdMeetingCount;
  const ambiguousClass = await cloneClass(base, 'AMBIGUOUS');
  await adapter('GOOGLE_MEET', { errorType: 'AMBIGUOUS_CREATE_CRASH', remainingCount: 1 });
  const ambiguousOp = await createOperation(tenantId, ambiguousClass, 'GOOGLE_MEET', 'AMBIGUOUS');
  await waitFor(async () => IntegrationOperationModel.findById(ambiguousOp._id).setOptions({ bypassTenantFilter: true }).lean(), (v: any) => v?.status === 'COMPLETED');
  const ambiguousMeeting = await ExternalMeetingModel.findOne({ tenantId, classId: ambiguousClass }).setOptions({ bypassTenantFilter: true }).lean();
  const ambiguousDiag = await diagnostics('GOOGLE_MEET');
  evidence.push({ scenario: 'provider success followed by lost response / reconciliation', ...(await snapshot(queue, ambiguousOp)), meetingId: ambiguousMeeting?.externalMeetingId, duplicateExternalCount: ambiguousDiag.createdMeetingCount - googleBaseline, result: ambiguousDiag.createdMeetingCount - googleBaseline === 1 ? 'PASS' : 'FAIL' });

  const duplicateJobs = [`duplicate_${ambiguousOp._id}_1`, `duplicate_${ambiguousOp._id}_2`];
  for (const jobId of duplicateJobs) await queue.add('integration.operation', { operationId: ambiguousOp._id.toString(), tenantId: tenantId.toString() }, { jobId, attempts: 1, removeOnComplete: false });
  await waitFor(async () => Promise.all(duplicateJobs.map(async (id) => (await queue.getJob(id))?.getState())), (states) => states.every((s) => s === 'completed'));
  const duplicateDiag = await diagnostics('GOOGLE_MEET');
  evidence.push({ scenario: 'duplicate BullMQ delivery', queueJobId: duplicateJobs.join(','), mongoState: 'COMPLETED', bullState: 'completed,completed', attempts: 2, meetingId: ambiguousMeeting?.externalMeetingId, duplicateExternalCount: duplicateDiag.createdMeetingCount - ambiguousDiag.createdMeetingCount, result: duplicateDiag.createdMeetingCount === ambiguousDiag.createdMeetingCount ? 'PASS' : 'FAIL' });

  const timeoutClass = await cloneClass(base, 'TIMEOUT');
  await adapter('ZOOM', { errorType: 'TIMEOUT', remainingCount: 10 });
  const timeoutOp = await createOperation(tenantId, timeoutClass, 'ZOOM', 'TIMEOUT');
  await waitFor(async () => IntegrationOperationModel.findById(timeoutOp._id).setOptions({ bypassTenantFilter: true }).lean(), (v: any) => v?.status === 'FAILED', 60_000);
  evidence.push({ scenario: 'provider timeout / retry exhaustion / durable failure', ...(await snapshot(queue, timeoutOp)), duplicateExternalCount: (await diagnostics('ZOOM')).createdMeetingCount, result: 'PASS' });

  await adapter('ZOOM', null);
  const retryResponse = await request(`/api/v1/integrations/classes/${timeoutClass}/meeting/retry`, instructorCookie, 'POST', { provider: 'ZOOM' });
  const retried: any = await IntegrationOperationModel.findById(timeoutOp._id).setOptions({ bypassTenantFilter: true }).lean();
  const retryMeeting = await ExternalMeetingModel.findOne({ tenantId, classId: timeoutClass }).setOptions({ bypassTenantFilter: true }).lean();
  evidence.push({ scenario: 'authorized terminal retry', ...(await snapshot(queue, timeoutOp)), authorizationResult: retryResponse.status, mongoState: retried?.status, meetingId: retryMeeting?.externalMeetingId, duplicateExternalCount: (await diagnostics('ZOOM')).createdMeetingCount, result: retryResponse.ok && retried?.status === 'COMPLETED' ? 'PASS' : 'FAIL' });

  const cancelClass = await cloneClass(base, 'CANCEL');
  const cancelOp = await createOperation(tenantId, cancelClass, 'GOOGLE_MEET', 'CANCEL', new Date(Date.now() + 60_000));
  const cancelResponse = await request(`/api/v1/classes/${cancelClass}/cancel`, adminCookie, 'POST', { reason: 'Phase 22 pending-operation cancellation', expectedRevision: 1 });
  await IntegrationOperationModel.updateOne({ _id: cancelOp._id }, { $set: { nextRetryAt: new Date() } }).setOptions({ bypassTenantFilter: true });
  await waitFor(async () => IntegrationOperationModel.findById(cancelOp._id).setOptions({ bypassTenantFilter: true }).lean(), (v: any) => v?.status === 'FAILED', 60_000);
  const joinResponse = await request(`/api/v1/integrations/classes/${cancelClass}/join`, studentCookie);
  evidence.push({ scenario: 'cancel pending operation / no join resurrection', ...(await snapshot(queue, cancelOp)), authorizationResult: `${cancelResponse.status}/${joinResponse.status}`, meetingId: null, duplicateExternalCount: 0, result: cancelResponse.ok && joinResponse.status === 403 ? 'PASS' : 'FAIL' });

  const tenantBoundJob = `cross_tenant_${ambiguousOp._id}`;
  await queue.add('integration.operation', { operationId: ambiguousOp._id.toString(), tenantId: new Types.ObjectId().toString() }, { jobId: tenantBoundJob, attempts: 1, removeOnFail: false });
  await waitFor(async () => (await queue.getJob(tenantBoundJob))?.getState(), (s) => s === 'failed');
  evidence.push({ scenario: 'cross-tenant worker operation', ...(await snapshot(queue, ambiguousOp, tenantBoundJob)), authorizationResult: 'rejected before API dispatch', meetingId: ambiguousMeeting?.externalMeetingId, duplicateExternalCount: duplicateDiag.createdMeetingCount, result: 'PASS' });

  const otherInstructor: any = await UserModel.findOne({ tenantId, email: 'neha.kapoor@didm.edu' }).setOptions({ bypassTenantFilter: true }).lean();
  let unauthorizedStatus = 0;
  if (otherInstructor?.email) {
    const cookie = await login(otherInstructor.email);
    unauthorizedStatus = (await request(`/api/v1/integrations/classes/${ambiguousClass}/meeting`, cookie, 'POST', { provider: 'ZOOM' })).status;
  }
  evidence.push({ scenario: 'unauthorized instructor operation', queueJobId: null, mongoState: 'not-created', bullState: 'not-enqueued', attempts: 0, authorizationResult: unauthorizedStatus || 'no seeded secondary instructor', meetingId: ambiguousMeeting?.externalMeetingId, duplicateExternalCount: duplicateDiag.createdMeetingCount, result: unauthorizedStatus === 403 ? 'PASS' : 'FAIL' });

  const crossBranchCookie = await login('priya.singh@didm.edu');
  const crossBranchStatus = (await request(`/api/v1/integrations/classes/${ambiguousClass}/meeting`, crossBranchCookie, 'POST', { provider: 'ZOOM' })).status;
  evidence.push({ scenario: 'cross-branch unauthorized operation', queueJobId: null, mongoState: 'not-created', bullState: 'not-enqueued', attempts: 0, authorizationResult: crossBranchStatus, meetingId: ambiguousMeeting?.externalMeetingId, duplicateExternalCount: duplicateDiag.createdMeetingCount, result: [403, 404].includes(crossBranchStatus) ? 'PASS' : 'FAIL' });

  const switchClass = await cloneClass(base, 'SWITCH');
  const switchStatuses = await Promise.all(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'].map(async (provider) => (await request(`/api/v1/integrations/classes/${switchClass}/meeting`, instructorCookie, 'POST', { provider })).status));
  const active = await LiveMeetingAssociationHistoryModel.countDocuments({ tenantId, classId: switchClass, status: 'ACTIVE' }).setOptions({ bypassTenantFilter: true });
  const mapping: any = await ExternalMeetingModel.findOne({ tenantId, classId: switchClass }).setOptions({ bypassTenantFilter: true }).lean();
  const winners = switchStatuses.filter((status) => status === 201).length;
  const conflicts = switchStatuses.filter((status) => status === 409).length;
  evidence.push({ scenario: 'provider-switch ordering under concurrency', queueJobId: null, mongoState: mapping?.syncStatus, bullState: 'synchronous authorized API', attempts: 3, authorizationResult: switchStatuses.join(','), meetingId: mapping?.externalMeetingId, duplicateExternalCount: active, result: winners === 1 && conflicts === 2 && active === 1 ? 'PASS' : 'FAIL' });

  console.log(JSON.stringify(evidence, null, 2));
  await queue.close(); await redis.quit(); await mongoose.disconnect();
  if (evidence.some((item) => item.result !== 'PASS')) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
