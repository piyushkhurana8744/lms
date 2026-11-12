import { Schema, Types } from 'mongoose';
import { tryGetWorkspaceContext } from '@edtech/utils';
import {
  assertAuthorizedSystemQuery,
  assertAuthorizedPlatformQuery,
  assertPublicReadPolicy,
  SystemOperationKind,
  PublicReadPolicy
  ,assertAuthBootstrapQuery,
  AuthBootstrapPolicy,
  assertAuthBootstrapDocument,
  getAuthorizedExecutionContext
} from '../authorizedExecutionContext';
import { isModelFailClosed } from '../tenantModelPolicyRegistry';

const LEGACY_BYPASS_OPTIONS = ['bypassTenantFilter', '__bypassTenantIsolation'];
// Incremental activation: expand only after each model group's bootstrap,
// population and direct-driver paths have database-backed proofs.

function modelName(target: any): string | undefined {
  return target?.model?.modelName || target?._model?.modelName || target?.constructor?.modelName || target?.modelName;
}

function contextFor(target: any) {
  if (getAuthorizedExecutionContext()?.mode === 'PLATFORM') return undefined;
  const context = tryGetWorkspaceContext();
  if (!isModelFailClosed(modelName(target))) return context;
  if (!context?.currentTenantId) throw new Error(`Tenant context is required for tenant-owned model operation (${modelName(target)})`);
  if (!Types.ObjectId.isValid(context.currentTenantId)) throw new Error('Tenant context is malformed');
  return context;
}

function rejectLegacyOptions(target: any, options: any) {
  for (const option of LEGACY_BYPASS_OPTIONS) {
    if (options?.[option] !== undefined) throw new Error(`Legacy tenant isolation option ${option} is forbidden`);
  }
}

function tenantValues(value: any, found: string[] = []): string[] {
  if (!value || typeof value !== 'object') return found;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'tenantId') {
      if (child instanceof Types.ObjectId) {
        found.push(child.toString());
      } else if (child && typeof child === 'object') {
        for (const operatorValue of Object.values(child as object)) {
          if (Array.isArray(operatorValue)) operatorValue.forEach((item) => found.push(String(item)));
          else if (operatorValue != null) found.push(String(operatorValue));
        }
      } else if (child != null) found.push(String(child));
    } else if (child && typeof child === 'object') tenantValues(child, found);
  }
  return found;
}

function assertTenantPredicate(query: any, tenantId: string) {
  const values = tenantValues(query);
  if (values.some((value) => value !== tenantId)) throw new Error('Query tenant predicate conflicts with workspace context');
}

function assertTenantImmutable(update: any, contextTenantId?: string) {
  if (!update || typeof update !== 'object') return;
  const mutatingOperators = ['$set', '$unset', '$rename'];
  if ('tenantId' in update || mutatingOperators.some((operator) => update[operator] && 'tenantId' in update[operator])) {
    throw new Error('Tenant identity is immutable');
  }
  if (update.$setOnInsert && 'tenantId' in update.$setOnInsert) {
    if (contextTenantId && String(update.$setOnInsert.tenantId) !== contextTenantId) {
      throw new Error('Insert tenant identity conflicts with workspace context');
    }
  }
  if (Array.isArray(update)) throw new Error('Pipeline updates are forbidden on tenant-owned models');
}

export function tenantIsolationPlugin(schema: Schema) {
  if (!schema.path('tenantId')) {
    schema.add({
      tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        default: null,
        index: true
      }
    });
  }

  // Pre-query hook enforcing active workspace context boundary
  const applyTenantFilter = function (this: any) {
    rejectLegacyOptions(this, this.options);
    if (this.options?.authorizedSystemOperation) {
      const query = typeof this.getQuery === 'function' ? this.getQuery() : {};
      assertAuthorizedSystemQuery(this.options.authorizedSystemOperation as SystemOperationKind, query.tenantId);
      return;
    }

    if (this.options?.authorizedPlatformOperation || getAuthorizedExecutionContext()?.mode === 'PLATFORM') {
      assertAuthorizedPlatformQuery();
      return;
    }

    if (this.options?.publicReadPolicy) {
      const query = typeof this.getQuery === 'function' ? this.getQuery() : {};
      assertPublicReadPolicy(this.options.publicReadPolicy as PublicReadPolicy, query);
      return;
    }
    if (this.options?.authBootstrapPolicy) {
      const query = typeof this.getQuery === 'function' ? this.getQuery() : {};
      assertAuthBootstrapQuery(this.options.authBootstrapPolicy as AuthBootstrapPolicy, query);
      return;
    }

    const context = contextFor(this);

    if (context && context.currentTenantId && Types.ObjectId.isValid(context.currentTenantId)) {
      if (typeof this.getQuery === 'function') {
        const query = this.getQuery();
        assertTenantPredicate(query, context.currentTenantId);
        if (!query.tenantId) {
          this.where({ tenantId: context.currentTenantId });
        }
      }
      if (typeof this.getUpdate === 'function') assertTenantImmutable(this.getUpdate(), context.currentTenantId);
    }
  };

  schema.pre('find', applyTenantFilter);
  schema.pre('findOne', applyTenantFilter);
  schema.pre('countDocuments', applyTenantFilter);
  schema.pre('findOneAndUpdate', applyTenantFilter);
  schema.pre('updateOne', applyTenantFilter);
  schema.pre('updateMany', applyTenantFilter);
  schema.pre('deleteOne', applyTenantFilter);
  schema.pre('deleteMany', applyTenantFilter);
  schema.pre('findOneAndDelete', applyTenantFilter);
  schema.pre('replaceOne', applyTenantFilter);
  schema.pre('distinct', applyTenantFilter);

  schema.pre('aggregate', function (this: any) {
    rejectLegacyOptions(this, this.options);
    if (this.options?.authorizedSystemOperation) {
      assertAuthorizedSystemQuery(this.options.authorizedSystemOperation as SystemOperationKind);
      return;
    }
    if (this.options?.authorizedPlatformOperation || getAuthorizedExecutionContext()?.mode === 'PLATFORM') {
      assertAuthorizedPlatformQuery();
      return;
    }
    if (this.options?.publicReadPolicy) {
      return;
    }
    const context = contextFor(this);
    if (context && context.currentTenantId && Types.ObjectId.isValid(context.currentTenantId)) {
      const pipeline = this.pipeline();
      for (const stage of pipeline) {
        if (stage?.$lookup || stage?.$unionWith || stage?.$graphLookup || stage?.$out || stage?.$merge) {
          throw new Error('Unsafe cross-collection aggregation stage is forbidden on tenant-owned models');
        }
      }
      pipeline.filter((stage: any) => stage?.$match).forEach((stage: any) => assertTenantPredicate(stage.$match, context.currentTenantId));
      this.pipeline().unshift({ $match: { tenantId: new Types.ObjectId(context.currentTenantId) } });
    }
  });

  const applyDocumentTenant = function (this: any) {
    if (assertAuthBootstrapDocument(this)) return;
    const authExec = getAuthorizedExecutionContext();
    if (authExec?.mode === 'PLATFORM') {
      if (this.isSuperAdmin && this.tenantId) {
        throw new Error('Platform SuperAdmin must have null tenantId');
      }
      return;
    }
    const context = contextFor(this);
    if (!context?.currentTenantId || !Types.ObjectId.isValid(context.currentTenantId)) return;
    if (this.constructor?.modelName === 'User') {
      if (this.isSuperAdmin === true) {
        throw new Error('Tenant user cannot be platform SuperAdmin');
      }
      if (this.tenantId === null) {
        throw new Error('Tenant user must have a non-null tenantId');
      }
    }
    if (this.tenantId && String(this.tenantId) !== context.currentTenantId) throw new Error('Document tenant identity conflicts with workspace context');
    if (!this.tenantId) this.tenantId = new Types.ObjectId(context.currentTenantId);
    if (!this.isNew && this.isModified('tenantId')) throw new Error('Tenant identity is immutable');
  };
  schema.pre('validate', applyDocumentTenant);
  schema.pre('save', applyDocumentTenant);

  schema.pre('insertMany', function (this: any, next: any, docs: any[]) {
    const context = contextFor(this);
    if (!context?.currentTenantId || !Types.ObjectId.isValid(context.currentTenantId)) return next();
    try {
      for (const doc of docs || []) {
        if (doc.tenantId && String(doc.tenantId) !== context.currentTenantId) throw new Error('Document tenant identity conflicts with workspace context');
        if (!doc.tenantId) doc.tenantId = new Types.ObjectId(context.currentTenantId);
      }
      next();
    } catch (error) { next(error); }
  });

  schema.pre('bulkWrite', function (this: any, next: any, operations: any[]) {
    const context = contextFor(this);
    if (!context?.currentTenantId || !Types.ObjectId.isValid(context.currentTenantId)) return next();
    try {
      for (const operation of operations || []) {
        const [kind, spec]: any = Object.entries(operation)[0] || [];
        if (!spec) throw new Error('Invalid tenant bulk operation');
        if (kind === 'insertOne') {
          if (spec.document?.tenantId && String(spec.document.tenantId) !== context.currentTenantId) throw new Error('Bulk insert tenant conflicts with workspace context');
          spec.document.tenantId ||= new Types.ObjectId(context.currentTenantId);
          continue;
        }
        if (!['updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'replaceOne'].includes(kind)) throw new Error(`Unsupported tenant bulk operation: ${kind}`);
        assertTenantPredicate(spec.filter || {}, context.currentTenantId);
        spec.filter = { ...(spec.filter || {}), tenantId: new Types.ObjectId(context.currentTenantId) };
        if (spec.update) assertTenantImmutable(spec.update, context.currentTenantId);
        if (spec.replacement) throw new Error('Bulk replacement is forbidden on tenant-owned models');
      }
      next();
    } catch (error) { next(error); }
  });
}
