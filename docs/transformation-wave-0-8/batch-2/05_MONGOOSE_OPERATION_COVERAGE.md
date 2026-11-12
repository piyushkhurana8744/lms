# Mongoose operation coverage

Covered: find/findOne/count/distinct, updates/deletes/findOneAndDelete/replace, aggregate unsafe joins, save, insertMany and bulkWrite tenant conflict/mutation guards. Bulk operations inject the current tenant and reject replacement/unsupported forms.

Still open: fail-closed missing context, full upsert matrix, population, discriminators, raw collection access and malformed-context behavior across every operation.
