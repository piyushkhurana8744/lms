# User authentication proofs

Authentication middleware now verifies JWT subject equals live Session.userId, then uses SESSION_USER_BY_ID. Role population occurs only inside the resolved tenant context. Login uses exact normalized email, rejects multiple matches, and enters tenant context before role population. Refresh uses the session-bound ID policy. Logout and logout-all reject actor mismatch. PLATFORM impersonation remains session verified.

Focused units: 3 files / 19 tests passed. Focused real Mongo bootstrap and PLATFORM policies passed within the 11-test suite. Full login/refresh/register/logout HTTP+Mongo contract matrix remains pending.
