# DIDM LMS Platform Architecture Overview

## Monorepo Layout

```
didm-lms-platform/
├── apps/
│   ├── web/           # Next.js 14 App Router Frontend (Port 3000)
│   ├── api/           # Express.js + Socket.IO Backend API (Port 4000)
│   └── worker/        # BullMQ Background Job Worker Engine
├── packages/
│   ├── config/        # Centralized Constants & System Defaults (@edtech/config)
│   ├── ui/            # Shared React UI Components & Design Tokens (@edtech/ui)
│   ├── types/         # Shared TypeScript Interfaces (@edtech/types)
│   ├── validation/    # Shared Zod Schemas (@edtech/validation)
│   ├── permissions/   # Permission Matrix & Role Constants (@edtech/permissions)
│   ├── utils/         # Structured Logger, Response Helpers, Sanitizers (@edtech/utils)
│   └── database/      # Mongoose Connection Manager & Base Repositories (@edtech/database)
└── docs/              # System Architecture & Setup Guides
```

## Multi-Tenant Database Indexing Strategy

Every tenant-owned collection in MongoDB must index `tenantId`:
```ts
TenantSchema.index({ tenantId: 1, createdAt: -1 });
```
This guarantees indexed, isolated queries per tenant boundary.

## Standardized API Envelopes

- **Success Envelope**:
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "meta": { "page": 1, "total": 100 }
}
```

- **Error Envelope**:
```json
{
  "success": false,
  "error": {
    "code": "ERR_BAD_REQUEST",
    "message": "Human readable error description",
    "details": []
  }
}
```

## Environment & Health Endpoints

- API Versioning: `/api/v1`
- Health Endpoint: `GET /api/v1/health` (Exposes API, MongoDB, and Redis connection states cleanly without sensitive connection strings).
