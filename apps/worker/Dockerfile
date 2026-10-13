FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm turbo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edtech/worker build

CMD ["pnpm", "--filter", "@edtech/worker", "start"]
