# Test personas and seed

`scripts/demo-data.ts` and `scripts/demo-seed.ts` define synthetic Super Admin, Tenant Admin, two Branch Admins, multiple Instructors and Students, three branches, courses, batches, academic operations, finance, CRM and integrations. The five canonical browser identities are already referenced by `portal-navigation.spec.ts`.

Passwords are intentionally not reproduced here. Use `E2E_DEMO_PASSWORD` in a local secret store. Never use the fallback credential in shared environments.

Safety caveat: `demo-seed.ts` blocks `NODE_ENV=production`, but defaults to a non-test local database and logs the connection URI. Wave 0 did not execute it because no isolated, persistent browser-test runtime had been established. Before use, require an `edtech_lms_e2e_*` database name, redact URI credentials, and add explicit opt-in such as `ALLOW_DEMO_SEED=1`.

The seed contains multiple branches but only one tenant dataset. Cross-tenant negative browser coverage should seed a second synthetic tenant; API integration suites already create two tenants for attack tests.
