import { BranchModel, OrganizationMemberModel } from '@edtech/database';
import { Types } from 'mongoose';
import { ForbiddenError, NotFoundError } from '../errors/appError';

export type BranchActor = { userId: string; isSuperAdmin?: boolean; roles?: string[] };

export class BranchAccessService {
  static async getScope(tenantId: string, actor: BranchActor) {
    if (actor.isSuperAdmin) return { mode: 'ALL' as const, branchIds: [] as string[] };
    const member = await OrganizationMemberModel.findOne({ tenantId, userId: actor.userId, status: 'ACTIVE' })
      .select('role branchAccessMode branchIds').lean();
    if (!member) throw new ForbiddenError('Active tenant membership required');
    if (member.branchAccessMode === 'ALL') {
      return { mode: 'ALL' as const, branchIds: [] as string[] };
    }
    return { mode: 'SELECTED' as const, branchIds: (member.branchIds || []).map(String) };
  }

  static async assertBranchAccess(tenantId: string, actor: BranchActor, branchId: string, options: { requireActive?: boolean } = {}) {
    if (!Types.ObjectId.isValid(branchId)) throw new NotFoundError('Branch not found');
    const branch = await BranchModel.findOne({ _id: branchId, tenantId }).lean();
    if (!branch) throw new NotFoundError('Branch not found');
    const scope = await this.getScope(tenantId, actor);
    if (scope.mode !== 'ALL' && !scope.branchIds.includes(branchId)) throw new NotFoundError('Branch not found');
    if (options.requireActive && branch.status !== 'ACTIVE') throw new ForbiddenError('Branch is not active');
    return branch;
  }

  static async hasBranchAccess(tenantId: string, actor: BranchActor, branchId: string): Promise<boolean> {
    try {
      await this.assertBranchAccess(tenantId, actor, branchId);
      return true;
    } catch {
      return false;
    }
  }

  static async authorizedFilter(tenantId: string, actor: BranchActor) {
    const scope = await this.getScope(tenantId, actor);
    return scope.mode === 'ALL' ? { tenantId } : { tenantId, _id: { $in: scope.branchIds } };
  }
}

