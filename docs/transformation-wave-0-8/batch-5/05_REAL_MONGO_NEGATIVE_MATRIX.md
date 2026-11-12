# Real-Mongo negative matrix

PASS: 1 file / 11 tests. Covers missing/malformed Course context, NotificationIntent insertion/mixed tenants, exact domain resolution, bootstrap forgery/key mismatch, PLATFORM forged/revoked/mismatch/non-admin, legacy bypass, cross-tenant mutations, aggregate safety and positive tenant operations.

Missing: full authentication contract, User missing-context activation, population authorization, discriminator, explicit upsert/bulk concurrency and all high-risk groups.
