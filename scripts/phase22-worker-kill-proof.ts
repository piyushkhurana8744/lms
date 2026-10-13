import mongoose, { Types } from 'mongoose';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { spawn, ChildProcess } from 'node:child_process';
import { ClassModel, ExternalMeetingModel, IntegrationOperationModel } from '@edtech/database';

const root = process.cwd();
const mongoUri = process.env.MONGO_URI!;
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const api = process.env.API_URL || 'http://127.0.0.1:4100';
const secret = process.env.INTERNAL_WORKER_SECRET!;

async function waitFor<T>(read: () => Promise<T>, accept: (value: T) => boolean, timeout = 90_000): Promise<T> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await read();
    if (accept(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Timed out waiting for hard-kill recovery state');
}

function startWorker(): ChildProcess {
  return spawn(process.execPath, ['dist/index.js'], {
    cwd: `${root}/apps/worker`, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test', MONGO_URI: mongoUri, REDIS_URL: redisUrl, API_INTERNAL_URL: api, INTERNAL_WORKER_SECRET: secret }
  });
}

async function main() {
  await mongoose.connect(mongoUri);
  const redis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('queue-integrations', { connection: redis });
  const base: any = await ClassModel.findOne({ classCode: 'DM-CLS-101' }).setOptions({ bypassTenantFilter: true }).lean();
  const classId = new Types.ObjectId();
  const raw = { ...base, _id: classId, name: 'Phase 22 hard-kill recovery', classCode: `P22-KILL-${Date.now()}`, status: 'SCHEDULED', scheduleRevision: 1, createdAt: new Date(), updatedAt: new Date() };
  delete raw.__v;
  await ClassModel.collection.insertOne(raw);
  await fetch(`${api}/api/v1/internal/integrations/test-adapters/GOOGLE_MEET/failure`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-worker-secret': secret }, body: JSON.stringify({ failure: { delayMs: 15_000, remainingCount: 1 } }) });
  const operation: any = await IntegrationOperationModel.create({ tenantId: base.tenantId, provider: 'GOOGLE_MEET', operationType: 'CREATE_MEETING', canonicalResourceType: 'Class', canonicalResourceId: classId.toString(), idempotencyKey: `WORKER_KILL:${classId}`, status: 'PENDING', attempts: 0, payload: {} });
  const jobId = `integration_${operation._id}`;

  const first = startWorker();
  await waitFor(async () => {
    const job = await queue.getJob(jobId);
    const op: any = await IntegrationOperationModel.findById(operation._id).setOptions({ bypassTenantFilter: true }).lean();
    return { state: job ? await job.getState() : 'missing', mongo: op?.status };
  }, (value) => value.state === 'active' && value.mongo === 'PROCESSING');
  first.kill('SIGKILL');
  await new Promise((resolve) => first.once('exit', resolve));

  const afterKill: any = await IntegrationOperationModel.findById(operation._id).setOptions({ bypassTenantFilter: true }).lean();
  const jobAfterKill = await queue.getJob(jobId);
  const bullStateAfterKill = jobAfterKill ? await jobAfterKill.getState() : 'missing';
  const attemptsAfterKill = jobAfterKill?.attemptsMade || 0;
  const second = startWorker();
  const recovered = await waitFor(async () => {
    const job = await queue.getJob(jobId);
    const op: any = await IntegrationOperationModel.findById(operation._id).setOptions({ bypassTenantFilter: true }).lean();
    return { state: job ? await job.getState() : 'missing', attempts: job?.attemptsMade || 0, mongo: op?.status };
  }, (value) => value.state === 'completed' && value.mongo === 'COMPLETED');
  const meeting: any = await ExternalMeetingModel.findOne({ tenantId: base.tenantId, classId }).setOptions({ bypassTenantFilter: true }).lean();
  const count = await ExternalMeetingModel.countDocuments({ tenantId: base.tenantId, classId }).setOptions({ bypassTenantFilter: true });
  second.kill('SIGINT');
  await new Promise((resolve) => second.once('exit', resolve));
  console.log(JSON.stringify({ scenario: 'kill worker during active processing and restart', queueJobId: jobId, atKill: { mongoState: afterKill.status, bullState: bullStateAfterKill, attempts: attemptsAfterKill }, recovered, finalMeetingAssociation: meeting?.externalMeetingId, duplicateExternalOperationCount: count, authorizationResult: 'trusted persisted operation with tenant binding', result: recovered.mongo === 'COMPLETED' && count === 1 ? 'PASS' : 'FAIL' }, null, 2));
  await queue.close(); await redis.quit(); await mongoose.disconnect();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
