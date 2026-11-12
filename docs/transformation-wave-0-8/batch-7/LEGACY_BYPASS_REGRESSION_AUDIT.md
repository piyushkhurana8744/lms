# Batch 7 — Legacy Bypass Regression Audit

## 1. Overview & Verification

As part of Wave 0.8 Batch 7 Priority 2, the conditional relaxation of legacy bypass options was completely eliminated. The production tenant isolation plugin unconditionally enforces rejection of all legacy bypass options across **all 68 models** registered in the application.

---

## 2. Unconditional Rejection Contract

In `packages/database/src/plugin/tenantIsolationPlugin.ts`:

```typescript
function rejectLegacyOptions(options: Record<string, any> | undefined, modelName: string): void {
  if (!options) return;
  if (options.bypassTenantFilter || options.__bypassTenantIsolation) {
    throw new Error(
      `[SECURITY VIOLATION] Legacy tenant isolation option bypassTenantFilter is forbidden. ` +
      `Model: ${modelName}. Use authorizedExecutionContext with an explicit trusted capability instead.`
    );
  }
}
```

This function is invoked unconditionally at the entry point of:
1. `applyTenantFilter` (Pre-hook for `find`, `findOne`, `findOneAndUpdate`, `updateMany`, `deleteOne`, `deleteMany`, `countDocuments`)
2. `applyAggregateTenantFilter` (Pre-hook for `aggregate`)
3. `applyDocumentTenant` (Pre-hook for document `save`)
4. `applyInsertManyTenant` (Pre-hook for `insertMany`)

Regardless of whether a model is classified as `FAIL_CLOSED`, `STAGED`, or `UNCLASSIFIED`, any attempt to pass `bypassTenantFilter: true` or `__bypassTenantIsolation: true` immediately throws an unhandled security violation error.

---

## 3. Static Audit & Verification

Running `pnpm security:check:wave07` executes both:
- `scripts/check-wave07-bypass.mjs` (verifies zero unauthorized bypass usage across all production TypeScript modules)
- `scripts/report-wave08-model-policies.mjs --check` (verifies registration count and policy integrity)

### Results:
- **Production raw bypass textual count**: Verified 0 raw bypasses in protected production modules.
- **Legacy bypass options forbidden**: Verified across all 68 model schemas.
- **Fail-closed models**: 5 (`Course`, `NotificationIntent`, `OrganizationDomain`, `User`, `OrganizationMember`).
- **Staged models**: 0.
- **Unclassified models**: 63 (all protected against legacy options).
- **Static check exit code**: `0`.

