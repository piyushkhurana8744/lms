# Local Environment Setup Guide

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Docker Desktop (for local MongoDB & Redis services)

## Quick Start Guide

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Local Infrastructure (MongoDB & Redis)**:
   ```bash
   pnpm docker:up
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in root and applications:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   cp apps/worker/.env.example apps/worker/.env
   ```

4. **Start Development Services**:
   ```bash
   # Run Web, API, and Worker simultaneously in parallel
   pnpm dev

   # Or run individual applications:
   pnpm dev:api     # Express API (port 4000)
   pnpm dev:web     # Next.js Web (port 3000)
   pnpm dev:worker  # BullMQ Worker engine
   ```

5. **Verify API Health**:
   Visit `http://localhost:4000/api/v1/health` in browser or curl:
   ```bash
   curl http://localhost:4000/api/v1/health
   ```
