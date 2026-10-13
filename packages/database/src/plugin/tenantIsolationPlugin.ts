import { Schema, Types } from 'mongoose';
import { tryGetWorkspaceContext } from '@edtech/utils';

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
    const context = tryGetWorkspaceContext();

    if (this.options?.bypassTenantFilter) {
      return;
    }

    if (context && context.currentTenantId && Types.ObjectId.isValid(context.currentTenantId)) {
      const query = this.getQuery();
      if (!query.tenantId) {
        this.where({ tenantId: context.currentTenantId });
      }
    }
  };

  schema.pre('find', applyTenantFilter);
  schema.pre('findOne', applyTenantFilter);
  schema.pre('countDocuments', applyTenantFilter);
  schema.pre('aggregate', function (this: any) {
    const context = tryGetWorkspaceContext();
    if (this.options?.bypassTenantFilter) {
      return;
    }
    if (context && context.currentTenantId && Types.ObjectId.isValid(context.currentTenantId)) {
      this.pipeline().unshift({ $match: { tenantId: new Types.ObjectId(context.currentTenantId) } });
    }
  });
}
