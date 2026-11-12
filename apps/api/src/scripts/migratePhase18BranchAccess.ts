import {
  connectDatabase,
  disconnectDatabase,
  OrganizationMemberModel,
  authorizeInternalSystemCaller,
  runAuthorizedSystemOperation
} from '@edtech/database';
import { SYSTEM_ROLE_PERMISSIONS, PERMISSIONS } from '@edtech/permissions';
import { assertMaintenanceSafety } from './maintenanceSafety';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  const maintenance = assertMaintenanceSafety(uri, 'phase18-branch-access');
  const secret = process.env.MIGRATION_SECRET || process.env.INTERNAL_WORKER_SECRET;
  if (!secret) throw new Error('MIGRATION_SECRET or INTERNAL_WORKER_SECRET is required');
  const authority = authorizeInternalSystemCaller(secret, 'phase18-branch-migration');
  if (!authority) throw new Error('Unauthorized migration runner: valid internal secret required');

  await connectDatabase(uri);

  const result = await runAuthorizedSystemOperation(authority, {
    kind: 'DATABASE_MIGRATION',
    reason: 'Migrate Phase 18 branchAccessMode defaults across organizations',
    correlationId: 'migrate-phase18-branch-access'
  }, async () => {
    const cursor = OrganizationMemberModel.find({ branchAccessMode: { $exists: false } })
      .setOptions({ authorizedSystemOperation: 'DATABASE_MIGRATION' })
      .cursor();
    let all = 0, selected = 0;
    for await (const member of cursor) {
      const effective = SYSTEM_ROLE_PERMISSIONS[member.role] || [];
      const mode = effective.includes(PERMISSIONS.BRANCH_MANAGE) ? 'ALL' : 'SELECTED';
      if (!maintenance.dryRun) await OrganizationMemberModel.updateOne({ _id: member._id }, { $set: { branchAccessMode: mode, branchIds: [] } }).setOptions({ authorizedSystemOperation: 'DATABASE_MIGRATION' });
      mode === 'ALL' ? all++ : selected++;
    }
    return { dryRun: maintenance.dryRun, database: maintenance.database, matched: all + selected, all, selected };
  });

  console.log(JSON.stringify(result));
  await disconnectDatabase();
}
main().catch(async (error) => { console.error(error); await disconnectDatabase(); process.exit(1); });
