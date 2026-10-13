import { spawn } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const redisPort = 6391;
const redisUrl = `redis://127.0.0.1:${redisPort}`;
const repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
const mongoUri = repl.getUri('edtech_lms_redis_proofs');
let redis = null;

const run = (file, extraEnv) => new Promise((resolve, reject) => {
  const child = spawn('pnpm', ['exec', 'vitest', 'run', file, '--reporter=dot', '--no-file-parallelism'], {
    stdio: 'inherit', env: { ...process.env, RUN_MONGO_INTEGRATION: '1', MONGO_INTEGRATION_URI: mongoUri, REDIS_URL: redisUrl, ...extraEnv }
  });
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`)));
});
const startRedis = async () => {
  redis = spawn('/opt/homebrew/bin/redis-server', ['--port', String(redisPort), '--bind', '127.0.0.1', '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
  await new Promise(resolve => setTimeout(resolve, 300));
};
const stopRedis = async () => { if (redis) { redis.kill('SIGKILL'); redis = null; await new Promise(resolve => setTimeout(resolve, 200)); } };

try {
  await stopRedis();
  await run('apps/worker/src/services/__tests__/notification-redis-recovery.integration.test.ts', { REDIS_RECOVERY_PROOF: 'OUTAGE' });
  await startRedis();
  await run('apps/worker/src/services/__tests__/notification-redis-recovery.integration.test.ts', { REDIS_RECOVERY_PROOF: 'RECOVERY' });
  await run('apps/api/src/services/__tests__/notification-redis-finalize.integration.test.ts', { REDIS_RECOVERY_PROOF: 'FINALIZE' });
  await stopRedis();
  await run('apps/api/src/services/__tests__/student-lifecycle-redis-proof.integration.test.ts', { PHASE16_REDIS_PROOF: 'OUTAGE' });
  await startRedis();
  await run('apps/api/src/services/__tests__/student-lifecycle-redis-proof.integration.test.ts', { PHASE16_REDIS_PROOF: 'RECOVERY' });
  await stopRedis();
  await run('apps/api/src/services/__tests__/instructor-operating-redis-proof.integration.test.ts', { PHASE17_REDIS_PROOF: 'OUTAGE' });
  await startRedis();
  await run('apps/api/src/services/__tests__/instructor-operating-redis-proof.integration.test.ts', { PHASE17_REDIS_PROOF: 'RECOVERY' });
  await stopRedis();
  await run('apps/api/src/services/__tests__/integrations-redis-proof.integration.test.ts', { PHASE22_REDIS_PROOF: 'OUTAGE' });
  await startRedis();
  await run('apps/api/src/services/__tests__/integrations-redis-proof.integration.test.ts', { PHASE22_REDIS_PROOF: 'RECOVERY' });
} finally {
  await stopRedis();
  await repl.stop();
}
