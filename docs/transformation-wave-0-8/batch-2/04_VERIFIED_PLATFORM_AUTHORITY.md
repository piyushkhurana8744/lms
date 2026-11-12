# Verified platform authority

PlatformAuthority can now be issued only by authorizePlatformSession, which reads the live server-side Session and User records with minimal projections and verifies IDs, expiry, revocation, actor binding, non-nesting, active status and SuperAdmin permission. The capability binds session, actor, reason and correlation. Impersonation exit explicitly verifies the active impersonated session's impersonatedBy binding.

Real Mongo: forged, revoked, mismatched and tenant-admin cases rejected; valid authority and binding verified.
