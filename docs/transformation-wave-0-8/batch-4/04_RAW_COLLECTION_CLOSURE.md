# Raw collection closure

Replaced NotificationIntentModel.collection.insertMany in both communicationAnnouncement.service.ts and communicationMessage.service.ts with tenant-enforced insertMany. NotificationIntent now uses tenantIsolationPlugin and is fail-closed. Ordered-false duplicate handling remains. Real Mongo proved missing-context and mixed-tenant batches persist zero records and valid tenant insertion succeeds.
