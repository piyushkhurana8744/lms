import { MongoMemoryReplSet } from 'mongodb-memory-server';

const repl = await MongoMemoryReplSet.create({
  instanceOpts: [{ port: Number(process.env.PHASE22_MONGO_PORT || 27019) }],
  replSet: { count: 1, name: 'testset', storageEngine: 'wiredTiger' }
});
console.log(`PHASE22_MONGO_READY=${repl.getUri('edtech_lms_e2e')}`);
const stop = async () => { await repl.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => undefined);
