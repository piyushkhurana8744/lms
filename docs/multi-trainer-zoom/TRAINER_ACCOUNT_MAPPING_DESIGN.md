# Multi-Trainer Zoom Hosting: Trainer Account Provisioning & Mapping Design

## Objective & Security Boundary

The objective is to establish an authoritative, verified binding between LMS faculty instructors and institute-owned Zoom accounts, preventing spoofing, licensing violations, and multi-tenant boundary breaches.

---

## 1. Why Unverified Emails Are Strictly Rejected

A naive integration might simply match `trainer.email === zoom.email` automatically. This presents severe architectural and security vulnerabilities:
1. **Unverified Account Ownership**: Anyone could claim an instructor account by registering an email not yet created in the institute's Zoom organization.
2. **Personal / Free Zoom Confusion**: If an instructor uses their personal Google/Zoom account (`trainer@gmail.com`), Zoom API will fail to schedule under the institute's organization credentials unless the user has been invited into and accepted the institute's Zoom account.
3. **Basic License Traps**: Free Zoom accounts have a 40-minute hard cap and cannot utilize cloud recording or institutional transcripts.
4. **Collision Risks**: Two instructors sharing or mistyping emails could inadvertently overwrite host authority.

### Enforced Rule
**Do not identify Zoom hosts by an unverified email alone.**
Every mapping requires verification against the live Zoom API using the institute's authorized integration connection.

---

## 2. Verification & Provisioning Flow

```
Admin Interface / API                 DIDM API                     Zoom Enterprise API
      │                                  │                                  │
      │ 1. POST /zoom/trainers/:id/verify│                                  │
      │    (with zoomIdentifier)         │                                  │
      ├─────────────────────────────────>│                                  │
      │                                  │ 2. Validate INSTRUCTOR role      │
      │                                  │    & OrganizationMember active   │
      │                                  │                                  │
      │                                  │ 3. Fetch active Zoom Connection  │
      │                                  │                                  │
      │                                  │ 4. GET /users/{zoomIdentifier}   │
      │                                  ├─────────────────────────────────>│
      │                                  │                                  │
      │                                  │ 5. Returns:                      │
      │                                  │    { id, email, type, status,    │
      │                                  │      account_id, pmi }           │
      │                                  │<─────────────────────────────────┤
      │                                  │                                  │
      │                                  │ 6. Verify account_id matches     │
      │                                  │    institute externalTenantId    │
      │                                  │                                  │
      │                                  │ 7. Check Type:                   │
      │                                  │    - Type 2 (Licensed) -> OK     │
      │                                  │    - Type 1 (Basic) -> Ineligible│
      │                                  │                                  │
      │                                  │ 8. Upsert TrainerZoomAccount     │
      │                                  │    AuditLog event emitted        │
      │                                  │                                  │
      │ 9. Returns ITrainerZoomAccountDTO│                                  │
      │<─────────────────────────────────┤                                  │
```

---

## 3. Zoom License Classification Matrix

| Zoom User `type` | Classification | `isHostEligible` | `ineligibilityReason` | LMS Behavior |
|---|---|---|---|---|
| **`2` (Licensed)** | Full Licensed Enterprise User | **`true`** | `null` | Allowed to host institutional live classes. Cloud recording enabled. |
| **`1` (Basic)** | Free Account | **`false`** | `'BASIC_UNLICENSED_USER'` | **Rejected**. Admin alerted to assign a Zoom Pro/Business license. |
| **`3` (On-Prem)** | On-Premises Host | **`true`** | `null` | Allowed if supported by institute infrastructure. |
| **Any (`status != active`)** | Pending / Inactive User | **`false`** | `'ACCOUNT_INACTIVE'` | **Rejected**. User must accept Zoom invite or be activated. |

---

## 4. Bulk License Synchronization

Zoom licenses change outside the LMS (e.g., an IT admin revokes or reassigns licenses in the Zoom Admin Console). To keep the LMS consistent:

1. **Endpoint**: `POST /api/v1/integrations/zoom/trainers/sync`
2. **Workflow**:
   - Queries `TrainerZoomAccountModel.find({ tenantId })`.
   - For each trainer mapping, queries `GET /users/{zoomUserId}`.
   - Re-evaluates license type (`type === 2`) and status (`status === 'active'`).
   - Updates `lastSyncedAt`, `licenseType`, and `isHostEligible`.
   - Returns summary: `{ total, synced, eligible, ineligible }`.

---

## 5. Security & Isolation Invariants

1. **Tenant Scoping**: All queries include `{ tenantId: new Types.ObjectId(tenantId) }`.
2. **Actor Authorization**: Only users with `INTEGRATIONS_MANAGE`, `INTEGRATIONS_LIVE_CLASSES_MANAGE`, or `SUPERADMIN_ALL` can map or delete trainer Zoom accounts.
3. **Audit Trail**:
   - `TRAINER_ZOOM_ACCOUNT_MAPPED`
   - `TRAINER_ZOOM_ACCOUNT_UNMAPPED`
   - `CLASS_TRAINER_REASSIGNED`
   - All events record actor ID, tenant ID, trainer ID, Zoom user ID, and license details.

