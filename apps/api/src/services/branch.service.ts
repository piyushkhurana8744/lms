import { BranchModel, OrganizationMemberModel, BatchModel, ClassModel, TimetableModel, StudentLifecycleModel } from '@edtech/database';
import { getWorkspaceContext } from '@edtech/utils';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuditService } from './audit.service';
import { BranchAccessService, BranchActor } from './branchAccess.service';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/appError';

const objectId = z.string().refine(Types.ObjectId.isValid, 'Invalid identifier');
const timezone = z.string().trim().refine((value) => { try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; } catch { return false; } }, 'Invalid IANA timezone');
const address = z.object({ line1: z.string().trim().max(200).optional(), line2: z.string().trim().max(200).optional(), city: z.string().trim().max(100).optional(), state: z.string().trim().max(100).optional(), postalCode: z.string().trim().max(20).optional(), country: z.string().trim().max(100).optional() }).optional();
const createSchema = z.object({ code: z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/), name: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), timezone: timezone.default('Asia/Kolkata'), isPrimary: z.boolean().default(false), address, contact: z.object({ email: z.string().email().optional(), phone: z.string().trim().max(30).optional() }).optional() });
const updateSchema = createSchema.partial().extend({ revision: z.number().int().nonnegative(), status: z.enum(['ACTIVE', 'INACTIVE']).optional() }).refine((v) => Object.keys(v).some((key) => key !== 'revision'), 'No update supplied');
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional() });
const accessSchema = z.object({ mode: z.enum(['ALL', 'SELECTED']), branchIds: z.array(objectId).max(100).default([]) });

export class BranchService {
  private static tenant() { const id = getWorkspaceContext().currentTenantId; if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestError('Tenant context required'); return id; }
  private static normalizeCode(code: string) { return code.trim().toUpperCase(); }
  private static slug(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  private static duplicate(error: any): never { if (error?.code === 11000) throw new ConflictError('Branch code, slug, or primary designation conflicts'); throw error; }

  static async list(raw: unknown, actor: BranchActor) {
    const tenantId = this.tenant(), q = listSchema.parse(raw), filter: any = await BranchAccessService.authorizedFilter(tenantId, actor);
    if (q.status) filter.status = q.status;
    if (q.search) filter.$or = [{ name: { $regex: q.search, $options: 'i' } }, { code: { $regex: q.search, $options: 'i' } }];
    const [items, total] = await Promise.all([BranchModel.find(filter).sort({ isPrimary: -1, name: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), BranchModel.countDocuments(filter)]);
    return { items, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
  }

  static async get(id: string, actor: BranchActor) { return BranchAccessService.assertBranchAccess(this.tenant(), actor, id); }

  static async create(raw: unknown, actor: BranchActor) {
    const tenantId = this.tenant(), data = createSchema.parse(raw), count = await BranchModel.countDocuments({ tenantId });
    const isPrimary = count === 0 ? true : data.isPrimary;
    try {
      const branch = await BranchModel.create({ ...data, tenantId, code: this.normalizeCode(data.code), slug: data.slug ? this.slug(data.slug) : this.slug(data.name), isPrimary });
      await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'BRANCH_CREATED', resource: 'Branch', resourceId: branch.id, metadata: { code: branch.code } });
      return branch;
    } catch (error) { return this.duplicate(error); }
  }

  static async update(id: string, raw: unknown, actor: BranchActor) {
    const tenantId = this.tenant(), data = updateSchema.parse(raw); await BranchAccessService.assertBranchAccess(tenantId, actor, id);
    const { revision, ...changes } = data; const update: any = { ...changes };
    if (changes.code) update.code = this.normalizeCode(changes.code);
    if (changes.slug) update.slug = this.slug(changes.slug);
    try {
      const branch = await BranchModel.findOneAndUpdate({ _id: id, tenantId, revision, status: { $ne: 'ARCHIVED' } }, { $set: update, $inc: { revision: 1 } }, { new: true, runValidators: true });
      if (!branch) throw new ConflictError('Branch was modified or is archived');
      await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'BRANCH_UPDATED', resource: 'Branch', resourceId: id, metadata: { fromRevision: revision } });
      return branch;
    } catch (error) { return this.duplicate(error); }
  }

  static async archive(id: string, raw: unknown, actor: BranchActor) {
    const tenantId = this.tenant(), { revision } = z.object({ revision: z.number().int().nonnegative() }).parse(raw);
    const branch = await BranchAccessService.assertBranchAccess(tenantId, actor, id);
    if (branch.isPrimary) throw new ConflictError('Primary branch cannot be archived');
    const now = new Date();
    const [batches, classes, timetables, students] = await Promise.all([
      BatchModel.countDocuments({ tenantId, branchId: id, status: { $in: ['UPCOMING', 'ONGOING'] } }),
      ClassModel.countDocuments({ tenantId, branchId: id, status: { $in: ['SCHEDULED', 'ACTIVE'] }, $or: [{ scheduledStartAt: { $gte: now } }, { scheduledStartAt: { $exists: false } }] }),
      TimetableModel.countDocuments({ tenantId, branchId: id, status: { $in: ['DRAFT', 'PUBLISHED'] }, effectiveTo: { $gte: now } }),
      StudentLifecycleModel.countDocuments({ tenantId, currentBranchId: id, currentStatus: { $in: ['PENDING_ACTIVATION', 'ACTIVE', 'ON_HOLD'] } })
    ]);
    if (batches || classes || timetables || students) throw new ConflictError('Resolve active branch dependencies before archival', { batches, classes, timetables, students });
    const updated = await BranchModel.findOneAndUpdate({ _id: id, tenantId, revision, status: { $ne: 'ARCHIVED' } }, { $set: { status: 'ARCHIVED', archivedAt: new Date(), isPrimary: false }, $inc: { revision: 1 } }, { new: true });
    if (!updated) throw new ConflictError('Branch was modified or already archived');
    await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'BRANCH_ARCHIVED', resource: 'Branch', resourceId: id }); return updated;
  }

  static async setMemberAccess(memberId: string, raw: unknown, actor: BranchActor) {
    const tenantId = this.tenant(), data = accessSchema.parse(raw);
    const member = await OrganizationMemberModel.findOne({ _id: memberId, tenantId, status: { $ne: 'REMOVED' } });
    if (!member) throw new NotFoundError('Member not found');
    if (data.mode === 'SELECTED') {
      const count = await BranchModel.countDocuments({ tenantId, _id: { $in: data.branchIds }, status: 'ACTIVE' });
      if (count !== new Set(data.branchIds).size) throw new BadRequestError('Every assigned branch must be active and in this tenant');
    }
    const previous = { mode: member.branchAccessMode, branchIds: member.branchIds?.map(String) || [] };
    member.branchAccessMode = data.mode; member.branchIds = data.mode === 'ALL' ? [] : [...new Set(data.branchIds)].map((id) => new Types.ObjectId(id)); await member.save();
    await AuditService.logEvent({ actorId: actor.userId, tenantId, action: 'MEMBER_BRANCH_ACCESS_UPDATED', resource: 'OrganizationMember', resourceId: memberId, metadata: { previous, next: data } });
    return { memberId, branchAccessMode: member.branchAccessMode, branchIds: member.branchIds.map(String) };
  }
}
