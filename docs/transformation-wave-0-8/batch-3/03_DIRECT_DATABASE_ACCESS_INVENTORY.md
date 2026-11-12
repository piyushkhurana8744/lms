# Direct database access inventory

Production escape hatches found:

- communicationAnnouncement.service.ts: NotificationIntentModel.collection.insertMany.
- migratePhase18BranchAccess.ts: OrganizationMemberModel.collection.updateOne.
- migratePhase22IntegrationIndexes.ts: raw collection aggregate/index/count operations.
- authorizedExecutionContext.ts: narrowly projected Session/User collection reads for verified PLATFORM issuance.
- database health/transaction code: admin hello command only.
- seedDemoData.ts: extensive upserts.

Additionally, production contains many populate chains, insertMany/bulkWrite calls, and upserts. The communication raw insert and migration scripts require explicit adapters or conversion before global closure.
