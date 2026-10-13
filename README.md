# DIDM Enterprise Digital Learning & Education Management Platform

Official production monorepo foundation for the **DIDM LMS Platform**.

## Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TanStack Query, Vanilla CSS Tokens
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO
- **Database**: MongoDB 7.0, Mongoose
- **Queues & Cache**: Redis 7.2, BullMQ
- **Monorepo Engine**: Turborepo & pnpm workspaces
- **Branding**: DIDM Primary Red (`#BE1E2E`), Native Light / Dark / System themes

## Development Commands

```bash
# Install workspace dependencies
pnpm install

# Start local infrastructure (MongoDB & Redis via Docker)
pnpm docker:up

# Start all applications in parallel (Web, API, Worker)
pnpm dev

# Quality & Type Checks
pnpm type-check
pnpm lint
pnpm test
pnpm build
```

## Health Verification

- Web Application: `http://localhost:3000`
- API Platform Health Endpoint: `http://localhost:4000/api/v1/health`

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Environment Setup Guide](docs/environment-setup.md)
