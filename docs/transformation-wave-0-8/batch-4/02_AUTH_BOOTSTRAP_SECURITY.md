# Authentication bootstrap security

Added AsyncLocalStorage-bound LOGIN_USER_BY_EMAIL, REGISTER_USER_BY_EMAIL and SESSION_USER_BY_ID policies. Queries must use one exact identity matching the bound key; nested bootstrap is forbidden. Login uses at most two exact-email results and rejects ambiguity generically, then enters the resolved tenant before role population. Refresh binds the User lookup to the verified session user ID.

User is not yet globally fail-closed because authentication middleware and registration creation still need complete staged conversion.
