FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm turbo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edtech/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@edtech/web", "start"]
