import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  IntegrationConnectionModel,
  IntegrationOAuthStateModel,
  LiveMeetingAssociationHistoryModel
} from '@edtech/database';

dotenv.config();

type DuplicateCheck = {
  label: string;
  model: typeof IntegrationConnectionModel | typeof IntegrationOAuthStateModel | typeof LiveMeetingAssociationHistoryModel;
  match?: Record<string, unknown>;
  group: Record<string, string>;
};

const duplicateChecks: DuplicateCheck[] = [
  { label: 'OAuth nonce', model: IntegrationOAuthStateModel, group: { nonceHash: '$nonceHash' } },
  {
    label: 'active meeting association', model: LiveMeetingAssociationHistoryModel,
    match: { status: 'ACTIVE' }, group: { tenantId: '$tenantId', classId: '$classId' }
  },
  {
    label: 'meeting association identity', model: LiveMeetingAssociationHistoryModel,
    group: { tenantId: '$tenantId', classId: '$classId', provider: '$provider', externalMeetingId: '$externalMeetingId' }
  },
  {
    label: 'integration connection scope', model: IntegrationConnectionModel,
    group: { tenantId: '$tenantId', provider: '$provider', scopeType: '$scopeType', userId: '$userId', branchId: '$branchId' }
  }
];

async function assertNoDuplicates(check: DuplicateCheck): Promise<void> {
  const pipeline: Record<string, unknown>[] = [];
  if (check.match) pipeline.push({ $match: check.match });
  pipeline.push({ $group: { _id: check.group, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 1 });
  const duplicate = await check.model.collection.aggregate(pipeline).next();
  if (duplicate) throw new Error(`Cannot create Phase 22 indexes: duplicate ${check.label} records exist`);
}

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');

  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  try {
    for (const check of duplicateChecks) await assertNoDuplicates(check);

    await IntegrationOAuthStateModel.collection.createIndexes([
      { name: 'nonceHash_1', key: { nonceHash: 1 }, unique: true },
      { name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
      { name: 'tenantId_1_userId_1_provider_1_createdAt_-1', key: { tenantId: 1, userId: 1, provider: 1, createdAt: -1 } }
    ]);
    await LiveMeetingAssociationHistoryModel.collection.createIndexes([
      {
        name: 'tenantId_1_classId_1_status_1', key: { tenantId: 1, classId: 1, status: 1 }, unique: true,
        partialFilterExpression: { status: 'ACTIVE' }
      },
      {
        name: 'tenantId_1_classId_1_provider_1_externalMeetingId_1',
        key: { tenantId: 1, classId: 1, provider: 1, externalMeetingId: 1 }, unique: true
      }
    ]);
    await IntegrationConnectionModel.collection.createIndexes([
      {
        name: 'tenantId_1_provider_1_scopeType_1_userId_1_branchId_1',
        key: { tenantId: 1, provider: 1, scopeType: 1, userId: 1, branchId: 1 }, unique: true
      },
      { name: 'tenantId_1_status_1', key: { tenantId: 1, status: 1 } },
      { name: 'tenantId_1_provider_1_status_1', key: { tenantId: 1, provider: 1, status: 1 } }
    ]);

    const evidence = await Promise.all([
      IntegrationOAuthStateModel.collection.indexes(),
      LiveMeetingAssociationHistoryModel.collection.indexes(),
      IntegrationConnectionModel.collection.indexes()
    ]);
    const readableCounts = await Promise.all([
      IntegrationOAuthStateModel.collection.countDocuments({}),
      LiveMeetingAssociationHistoryModel.collection.countDocuments({}),
      IntegrationConnectionModel.collection.countDocuments({})
    ]);
    console.log(JSON.stringify({
      status: 'PHASE_22_INDEXES_READY',
      collections: {
        integration_oauth_states: { readableRecords: readableCounts[0], indexes: evidence[0].map(({ name }) => name) },
        live_meeting_association_history: { readableRecords: readableCounts[1], indexes: evidence[1].map(({ name }) => name) },
        integration_connections: { readableRecords: readableCounts[2], indexes: evidence[2].map(({ name }) => name) }
      }
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
