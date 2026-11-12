import { spawn } from 'node:child_process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

if (process.env.MONGO_URI || process.env.MONGODB_URI || process.env.REDIS_URL) throw new Error('Refusing inherited database or Redis endpoints; run with those variables unset');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
const mongoUri = mongo.getUri('edtech_lms_e2e_wave05');
if (!mongoUri.startsWith('mongodb://127.0.0.1:') || !mongoUri.includes('/edtech_lms_e2e_wave05?replicaSet=')) throw new Error('Owned Mongo safety proof failed');
const redisPort = 6392, apiPort = 4400, webPort = 3300;
const redisUrl = `redis://127.0.0.1:${redisPort}/15`;
const owned = { ...process.env, NODE_ENV:'test', WAVE05_E2E_OWNED:'1', MONGO_URI:mongoUri, MONGO_INTEGRATION_URI:mongoUri, REDIS_URL:redisUrl, PORT:String(apiPort), API_INTERNAL_URL:`http://127.0.0.1:${apiPort}`, INTERNAL_WORKER_SECRET:'wave05-owned-worker-secret', NEXT_PUBLIC_API_URL:`http://127.0.0.1:${apiPort}`, E2E_WEB_BASE_URL:`http://127.0.0.1:${webPort}`, E2E_DEMO_PASSWORD:process.env.E2E_DEMO_PASSWORD || 'DemoPass123!', EMAIL_PROVIDER:'mock', ENABLE_INTEGRATION_TEST_ADAPTERS:'true' };
const children = [];
const playwrightArgs = process.argv.slice(2);
if (playwrightArgs[0] === '--') playwrightArgs.shift();
const start = (cmd,args,env=owned,stdio='inherit') => { const child=spawn(cmd,args,{env,stdio}); children.push(child); return child; };
const run = (cmd,args,env=owned) => new Promise((resolve,reject)=>{const p=spawn(cmd,args,{env,stdio:'inherit'});p.on('exit',c=>c===0?resolve():reject(new Error(`${cmd} ${args.join(' ')} exited ${c}`)));});
const waitHttp = async url => { for(let i=0;i<120;i++){try{const r=await fetch(url);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,500));}throw new Error(`Health check failed: ${url}`); };
try {
  start('/opt/homebrew/bin/redis-server',['--port',String(redisPort),'--bind','127.0.0.1','--save','','--appendonly','no']);
  await new Promise(r=>setTimeout(r,500));
  await run('pnpm',['exec','tsx','scripts/demo-seed.ts']);
  await run('pnpm',['exec','tsx','scripts/e2e-secondary-seed.ts']);
  start('pnpm',['--filter','@edtech/api','dev']);
  await waitHttp(`http://127.0.0.1:${apiPort}/api/v1/health`);
  start('pnpm',['--filter','@edtech/worker','dev']);
  start('pnpm',['--filter','@edtech/web','dev','--port',String(webPort)]);
  await waitHttp(`http://127.0.0.1:${webPort}/login`);
  await run('pnpm',['exec','playwright','test',...playwrightArgs]);
} finally {
  for (const child of children.reverse()) child.kill('SIGTERM');
  await new Promise(r=>setTimeout(r,1000));
  for (const child of children) if (child.exitCode===null) child.kill('SIGKILL');
  await mongo.stop();
}
