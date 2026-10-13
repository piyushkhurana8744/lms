import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BranchModel, OrganizationMemberModel, TenantModel, UserModel, AuditLogModel, connectDatabase, disconnectDatabase } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { BranchService } from '../branch.service';
import { BranchAccessService } from '../branchAccess.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;
suite('Phase 18 Branch Management MongoDB Integration', () => {
  const tenantId = new mongoose.Types.ObjectId(), tenantB = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId(), selectedId = new mongoose.Types.ObjectId();
  const admin = { userId: adminId.toString(), isSuperAdmin: false }, selected = { userId: selectedId.toString(), isSuperAdmin: false };
  const run = <T>(fn: () => Promise<T>) => tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminId.toString(), isPlatformContext: false, allowedTenantIds: [tenantId.toString()] }, fn);
  beforeAll(async () => {
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true');
    for (const model of [BranchModel, OrganizationMemberModel, UserModel, TenantModel, AuditLogModel]) await model.collection.deleteMany({});
    await BranchModel.syncIndexes();
    await TenantModel.collection.insertMany([{ _id: tenantId, name: 'Tenant A', slug: 'phase18-a' }, { _id: tenantB, name: 'Tenant B', slug: 'phase18-b' }]);
    await UserModel.collection.insertMany([{ _id: adminId, tenantId, allowedTenantIds: [tenantId], name: 'HQ', email: 'hq@p18.test', passwordHash: 'x', status: 'ACTIVE' }, { _id: selectedId, tenantId, allowedTenantIds: [tenantId], name: 'Scoped', email: 'scoped@p18.test', passwordHash: 'x', status: 'ACTIVE' }]);
    await OrganizationMemberModel.collection.insertMany([{ tenantId, userId: adminId, role: 'TENANT_ADMIN', status: 'ACTIVE', branchAccessMode: 'ALL', branchIds: [], joinedAt: new Date() }, { tenantId, userId: selectedId, role: 'INSTRUCTOR', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [], joinedAt: new Date() }]);
  });
  afterAll(async () => { await disconnectDatabase(); });

  it('creates the first branch as primary with normalized identity', async () => run(async () => { const branch: any = await BranchService.create({ code: ' noida ', name: 'Noida', timezone: 'Asia/Kolkata' }, admin); expect(branch.code).toBe('NOIDA'); expect(branch.slug).toBe('noida'); expect(branch.isPrimary).toBe(true); }));
  it('enforces tenant-scoped normalized code uniqueness in the database', async () => run(async () => { const results = await Promise.allSettled(Array.from({ length: 10 }, () => BranchService.create({ code: 'gurugram', name: `Gurugram ${Math.random()}`, slug: `g-${Math.random().toString(36).slice(2)}`, timezone: 'Asia/Kolkata' }, admin))); expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1); expect(results.filter((r) => r.status === 'rejected')).toHaveLength(9); }));
  it('allows ALL and restricts SELECTED scope without leaking totals', async () => run(async () => { const branches = await BranchModel.find({ tenantId }).sort({ code: 1 }).lean(); await OrganizationMemberModel.updateOne({ tenantId, userId: selectedId }, { $set: { branchIds: [branches[0]._id] } }); const list: any = await BranchService.list({}, selected); expect(list.pagination.total).toBe(1); await expect(BranchAccessService.assertBranchAccess(tenantId.toString(), selected, String(branches[1]._id))).rejects.toMatchObject({ statusCode: 404 }); expect((await BranchService.list({}, admin) as any).pagination.total).toBe(2); }));
  it('uses revision compare-and-set so one concurrent update wins', async () => run(async () => { const branch: any = await BranchModel.findOne({ tenantId, code: 'GURUGRAM' }); const results = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => BranchService.update(branch.id, { revision: branch.revision, name: `Winner ${index}` }, admin))); expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1); expect(results.filter((r) => r.status === 'rejected')).toHaveLength(9); expect((await BranchModel.findById(branch.id).lean())?.revision).toBe(1); }));
  it('validates active same-tenant staff assignments and writes audit history', async () => run(async () => { const branch: any = await BranchModel.findOne({ tenantId, code: 'GURUGRAM' }); const result = await BranchService.setMemberAccess(String((await OrganizationMemberModel.findOne({ tenantId, userId: selectedId }))!._id), { mode: 'SELECTED', branchIds: [branch.id] }, admin); expect(result.branchIds).toEqual([branch.id]); expect(await AuditLogModel.countDocuments({ tenantId: tenantId.toString(), action: 'MEMBER_BRANCH_ACCESS_UPDATED' })).toBe(1); }));
  it('rejects invalid IANA timezones and protects the primary branch from archive', async () => run(async () => { await expect(BranchService.create({ code: 'BAD', name: 'Bad', timezone: 'Mars/Olympus' }, admin)).rejects.toBeTruthy(); const primary: any = await BranchModel.findOne({ tenantId, isPrimary: true }); await expect(BranchService.archive(primary.id, { revision: primary.revision }, admin)).rejects.toMatchObject({ statusCode: 409 }); }));
  it('archives without deletion and rejects archived operational access', async () => run(async () => { const branch: any = await BranchModel.findOne({ tenantId, code: 'GURUGRAM' }); const archived: any = await BranchService.archive(branch.id, { revision: branch.revision }, admin); expect(archived.status).toBe('ARCHIVED'); expect(await BranchModel.findById(branch.id)).not.toBeNull(); await expect(BranchAccessService.assertBranchAccess(tenantId.toString(), admin, branch.id, { requireActive: true })).rejects.toMatchObject({ statusCode: 403 }); }));
});
