# Public and bootstrap compatibility

Preserved mechanisms: certificate exact-code public read policy, Razorpay identifier-only routing followed by tenant-secret verification, registered SYSTEM discovery, and tenant request middleware.

The global missing-context flip was intentionally not enabled because login/session bootstrap, hostname/domain resolution, worker discovery, population, and direct fixture/setup paths are not fully classified. No fallback tenant or test-wide bypass was introduced.
