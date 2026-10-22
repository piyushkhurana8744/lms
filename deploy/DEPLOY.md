# LMS — Veblika Edge Deployment Guide

## Architecture

The LMS platform integrates with the **Veblika Edge Network** (veblika-edge) the same way as all other tenant platforms (webinar-saas, ATS, HRMS, etc.).

```
Internet → veblika-edge (TLS termination, port 443)
              └─► [GATEWAY_ALIAS] on edge-network
                      └─► lms-gateway (nginx, no host port)
                              ├─► /api/v1/*      → lms-api:4000
                              ├─► /socket.io/*   → lms-api:4000
                              ├─► /uploads/*     → lms-api:4000
                              └─► /*             → lms-web:3000
```

### Services

| Service          | Container port | Notes |
|-----------------|----------------|-------|
| `mongodb`       | 27017 (internal) | Replica-set (transactions required) |
| `redis`         | 6379 (internal) | BullMQ queues + cache |
| `api`           | 4000 (internal) | Express API + Socket.IO |
| `worker`        | — (no HTTP) | BullMQ background worker |
| `web`           | 3000 (internal) | Next.js SSR frontend |
| `gateway`       | 80 on edge-network | nginx envsubst routing |

---

## Deployment via Master-Panel (Recommended)

### 1. Configure master-panel `.env`

Add to `/Users/utkarsh/Veblika/Panel Management/master-panel/.env`:

```env
# LMS platform
LMS_GITHUB_REPO=https://github.com/chandan988/lms.git
LMS_GITHUB_BRANCH=for-package
LMS_COMPOSE_PATH=./docker-compose.yml
LMS_FRONTEND_PORT=3012
LMS_BACKEND_PORT=5012

# Optional: prebuilt images (faster deploy, no git clone)
# LMS_FRONTEND_IMAGE=ghcr.io/chandan988/lms-frontend:for-package
# LMS_BACKEND_IMAGE=ghcr.io/chandan988/lms-backend:for-package
```

### 2. Add LMS addon in master-panel UI

1. Go to **Master Panel → Addons**
2. Create a new addon with **Platform = `lms`**
3. Set the deploy mode to `git` (or `image` if you have prebuilt images)

### 3. Deploy a tenant

1. Go to **Tenants → Deploy**
2. Select the LMS addon
3. Enter the domain (e.g., `lms.yourdomain.com`)
4. The orchestrator will:
   - Clone the LMS repo (`for-package` branch)
   - Create a `.env` from the template's `envVars`
   - Run `docker compose up -d`
   - Register `GATEWAY_ALIAS` on `edge-network`
   - Issue a Let's Encrypt cert via certbot (auto-SSL)

### 4. Required env vars for the LMS template

Set these in the master-panel template's **Advanced → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `API_PUBLIC_URL` | `https://lms.yourdomain.com` |
| `WEB_APP_URL` | `https://lms.yourdomain.com` |
| `JWT_SECRET` | Strong random secret |
| `JWT_REFRESH_SECRET` | Strong random secret (different from JWT_SECRET) |
| `EMAIL_ENCRYPTION_KEY` | Exactly 32 random characters |
| `STORAGE_ENCRYPTION_KEY` | At least 32 random characters |
| `OAUTH_STATE_SECRET` | 32 random characters |
| `INTERNAL_WORKER_SECRET` | At least 16 random characters |
| `CORS_ORIGINS` | `https://lms.yourdomain.com` |
| `STORAGE_PROVIDER` | `local` or `r2` |
| `PUBLIC_PLATFORM_DOMAIN` | Your root domain |

---

## Manual / Standalone Deployment

If deploying standalone (without master-panel):

```bash
# 1. Ensure veblika-edge is running (owns ports 80/443)
#    sudo bash master-panel/deploy/edge/install-edge.sh

# 2. Copy and fill in the env file
cp .env.example .env
# Edit .env with your domain, secrets, etc.

# 3. Set a GATEWAY_ALIAS (any unique slug)
echo "GATEWAY_ALIAS=lms-mycompany" >> .env

# 4. Start the stack
docker compose up -d

# 5. Issue SSL via certbot (inside veblika-edge container)
docker exec veblika-edge certbot --nginx \
  -d lms.yourdomain.com \
  --non-interactive --agree-tos -m admin@yourdomain.com
```

---

## First-run: seed super-admin

```bash
docker compose exec api pnpm --filter @edtech/api seed:superadmin
```

---

## Storage

- **`local`** (default): files stored in a Docker volume inside the api container
- **`r2`** (recommended for production): set `STORAGE_PROVIDER=r2` and all `R2_*` vars

For local storage, the upload volume is declared in the Dockerfile. Ensure the volume persists across restarts — it is created automatically by Docker Compose.
