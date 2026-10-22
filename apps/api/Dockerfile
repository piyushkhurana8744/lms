# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10 turbo

# Copy workspace manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edtech/api build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json

# Production deps only (skip devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Local upload volume (for STORAGE_PROVIDER=local)
VOLUME ["/app/apps/api/uploads"]

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
