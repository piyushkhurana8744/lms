import { spawn } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const files = process.argv.slice(2);
const repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
const uri = repl.getUri('edtech_lms_test');
const args = ['exec', 'vitest', 'run', ...(files.length ? files : ['apps/api/src/services/__tests__', 'apps/worker/src/services/__tests__']), '--reporter=dot', '--no-file-parallelism'];
const child = spawn('pnpm', args, { stdio: 'inherit', env: { ...process.env, RUN_MONGO_INTEGRATION: '1', MONGO_INTEGRATION_URI: uri } });
const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) process.on(signal, () => child.kill(signal));
const code = await new Promise((resolve) => child.on('exit', (value) => resolve(value ?? 1)));
await repl.stop();
process.exit(code);
