FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm turbo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edtech/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@edtech/api", "start"]
