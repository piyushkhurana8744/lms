import { connectDatabase, disconnectDatabase, OrganizationMemberModel } from '@edtech/database';
import { SYSTEM_ROLE_PERMISSIONS, PERMISSIONS } from '@edtech/permissions';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');
  await connectDatabase(uri);
  const cursor = OrganizationMemberModel.find({ branchAccessMode: { $exists: false } }).setOptions({ bypassTenantFilter: true }).cursor();
  let all = 0, selected = 0;
  for await (const member of cursor) {
    const effective = SYSTEM_ROLE_PERMISSIONS[member.role] || [];
    const mode = effective.includes(PERMISSIONS.BRANCH_MANAGE) ? 'ALL' : 'SELECTED';
    await OrganizationMemberModel.collection.updateOne({ _id: member._id }, { $set: { branchAccessMode: mode, branchIds: [] } });
    mode === 'ALL' ? all++ : selected++;
  }
  console.log(JSON.stringify({ migrated: all + selected, all, selected }));
  await disconnectDatabase();
}
main().catch(async (error) => { console.error(error); await disconnectDatabase(); process.exit(1); });
