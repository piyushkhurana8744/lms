# Runtime proofs

The focused isolated Mongo suite passed 1 file / 7 tests. It proves legacy bypass rejection, nested conflicts, cross-tenant update/delete, tenant mutation, aggregate isolation, unsafe lookup rejection, valid tenant CRUD, forged PLATFORM rejection and verified authority.

It does not prove global fail-closed behavior because missing context is still accepted.
