import { BranchModel, OrganizationMemberModel, getAuthorizedExecutionContext } from '@edtech/database';
import { Types } from 'mongoose';
import { tenantContextStorage } from '@edtech/utils';
import { ForbiddenError, NotFoundError } from '../errors/appError';

export type BranchActor = { userId: string; isSuperAdmin?: boolean; roles?: string[] };
export type BranchScope = { mode: 'ALL' | 'SELECTED'; branchIds: string[] };

export class BranchAccessService {
  private static isVerifiedSuperAdmin(actor: BranchActor): boolean {
    if (!actor.isSuperAdmin) return false;
    const authExec = getAuthorizedExecutionContext();
    const store = tenantContextStorage.getStore();
    return authExec?.mode === 'PLATFORM' || store?.isPlatformContext === true;
  }

  static async executeWithVerifiedTenantAuthority<T>(
    tenantId: string,
    actor: BranchActor,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new ForbiddenError('Invalid tenant identifier');
    }

    const store = tenantContextStorage.getStore();
    const authExec = getAuthorizedExecutionContext();

    // 1. If an active ambient tenant context exists:
    if (store?.currentTenantId) {
      if (store.isPlatformContext || authExec?.mode === 'PLATFORM') {
        return tenantContextStorage.run(
          { ...store, currentTenantId: tenantId, isPlatformContext: true },
          operation
        );
      }

      if (store.currentTenantId === tenantId) {
        return operation();
      }

      if (store.allowedTenantIds && store.allowedTenantIds.includes(tenantId)) {
        return tenantContextStorage.run(
          { ...store, currentTenantId: tenantId },
          operation
        );
      }

      // Explicit rejection of cross-tenant context switch attempt
      throw new ForbiddenError('Cross-tenant access forbidden: tenant mismatch');
    }

    // 2. If no ambient store, check for verified PLATFORM authority
    if (authExec?.mode === 'PLATFORM') {
      return tenantContextStorage.run(
        { currentTenantId: tenantId, currentUserId: actor.userId, isPlatformContext: true, allowedTenantIds: [tenantId] },
        operation
      );
    }

    // 3. If no ambient store, check for verified SYSTEM authority
    if (authExec?.mode === 'SYSTEM') {
      if (authExec.tenantId && authExec.tenantId !== tenantId) {
        throw new ForbiddenError('System execution tenant mismatch');
      }
      return tenantContextStorage.run(
        { currentTenantId: tenantId, currentUserId: authExec.principal, isPlatformContext: false, allowedTenantIds: [tenantId] },
        operation
      );
    }

    // 4. If no ambient store and no SYSTEM/PLATFORM authority:
    // Caller cannot establish context from arbitrary tenantId without verified active membership
    if (!Types.ObjectId.isValid(actor.userId)) {
      throw new ForbiddenError('Invalid actor identity');
    }

    const membership = await OrganizationMemberModel.collection.findOne({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(actor.userId),
      status: 'ACTIVE'
    });

    if (!membership) {
      throw new ForbiddenError('Active tenant membership required');
    }

    return tenantContextStorage.run(
      { currentTenantId: tenantId, currentUserId: actor.userId, isPlatformContext: false, allowedTenantIds: [tenantId] },
      operation
    );
  }

  static async getScope(tenantId: string, actor: BranchActor): Promise<BranchScope> {
    if (this.isVerifiedSuperAdmin(actor)) {
      return { mode: 'ALL' as const, branchIds: [] as string[] };
    }

    return this.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      const member = await OrganizationMemberModel.findOne({ tenantId, userId: actor.userId, status: 'ACTIVE' })
        .select('role branchAccessMode branchIds').lean();
      if (!member) throw new ForbiddenError('Active tenant membership required');
      if (member.branchAccessMode === 'ALL') {
        return { mode: 'ALL' as const, branchIds: [] as string[] };
      }
      return { mode: 'SELECTED' as const, branchIds: (member.branchIds || []).map(String) };
    });
  }

  static async assertBranchAccess(tenantId: string, actor: BranchActor, branchId: string, options: { requireActive?: boolean } = {}) {
    if (!Types.ObjectId.isValid(branchId)) throw new NotFoundError('Branch not found');

    return this.executeWithVerifiedTenantAuthority(tenantId, actor, async () => {
      const branch = await BranchModel.findOne({ _id: branchId, tenantId }).lean();
      if (!branch) throw new NotFoundError('Branch not found');
      const scope = await this.getScope(tenantId, actor);
      if (scope.mode !== 'ALL' && !scope.branchIds.includes(branchId)) throw new NotFoundError('Branch not found');
      if (options.requireActive && branch.status !== 'ACTIVE') throw new ForbiddenError('Branch is not active');
      return branch;
    });
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
