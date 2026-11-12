# Repository baseline

Captured 2026-10-28 before Wave 0 edits.

- Branch: `deployment`
- Commit: `6f68e5de7d2308e5f4639eff8beec846ce53c9a6`
- Git: 2.15.0; Node: 24.22.1; pnpm: 10.24.0
- Installed root tools: Playwright 1.64.0, mongodb-memory-server 10.4.3, Vitest 2.1.9, TypeScript 5.9.3, Turbo package 2.10.9 (platform binary 2.10.12).
- Product versions are recorded in `package.json` files; the current build resolves Next 14.2.35.

The worktree was already dirty: 20 tracked files modified and recording-related files untracked, plus the prior audit directory. No user changes were reset or overwritten. Relevant existing diffs included auth async error forwarding, database-unavailable classification, real-vs-demo integration constraints, recording UI/navigation and demo-seed changes.

Commands: `pnpm test`, `pnpm test:integration:mongo`, `node scripts/run-redis-proofs.mjs`, `pnpm build`, `pnpm test:e2e`; startup: `pnpm dev` or per-app `dev:web`, `dev:api`, `dev:worker`.

Safe infrastructure: `run-mongo-integration.mjs` creates/stops an ephemeral replica set and injects `MONGO_INTEGRATION_URI`. `run-redis-proofs.mjs` uses ephemeral Mongo plus disposable Redis on localhost:6391. Docker Compose is production-oriented (persistent volumes, production mode, nginx and edge registration) and was deliberately not used.
