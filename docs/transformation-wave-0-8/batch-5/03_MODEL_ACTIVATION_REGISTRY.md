# Model activation registry

Machine report: `node scripts/report-wave08-model-policies.mjs`.

Current measured coverage: 68 tenant-plugin model registrations; 3 fail-closed; 65 remaining fail-open; 2 explicitly staged; 63 unclassified. Fail-closed: Course, NotificationIntent, OrganizationDomain. Staged: User, OrganizationMember.

Approved exception classes: purpose-bound AUTH_BOOTSTRAP, exact DOMAIN_RESOLUTION, certificate verification, registered SYSTEM operations, verified PLATFORM session.
