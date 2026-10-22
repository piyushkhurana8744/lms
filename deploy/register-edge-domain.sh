#!/bin/sh
# Register DOMAIN on shared veblika-edge with automatic Let's Encrypt SSL.
# Proxies https://DOMAIN → host.docker.internal:${LMS_HOST_PORT:-5012}
#
# Usage on VPS:
#   sudo sh deploy/register-edge-domain.sh
# Or automatic via: docker compose up -d  (edge-register service)
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"

# Safe KEY=VALUE loader — never `source` .env (bare lines / secrets become shell commands).
load_env_file() {
  env_file="$1"
  [ -f "${env_file}" ] || return 0
  while IFS= read -r line || [ -n "${line}" ]; do
    line="$(printf '%s' "${line}" | tr -d '\r')"
    case "${line}" in
      ''|\#*) continue ;;
    esac
    case "${line}" in
      *=*) ;;
      *) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    key="$(printf '%s' "${key}" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    case "${key}" in
      ''|*[!A-Za-z0-9_]*) continue ;;
    esac
    case "${value}" in
      \"*\") value="${value#\"}"; value="${value%\"}" ;;
      \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    export "${key}=${value}"
  done < "${env_file}"
}

load_env_file "${ROOT_DIR}/.env"

DOMAIN="$(printf '%s' "${DOMAIN:-}" | tr '[:upper:]' '[:lower:]' | sed 's#^https\{0,1\}://##; s#/.*##; s/\.$//')"
HOST_PORT="${LMS_HOST_PORT:-5012}"
EDGE_DIR="${EDGE_DIR:-/etc/veblika/edge}"
EDGE_CONTAINER="${EDGE_CONTAINER_NAME:-veblika-edge}"
TENANTS_DIR="${EDGE_TENANTS_DIR:-${EDGE_DIR}/tenants/_engines}"
CONF_PATH="${TENANTS_DIR}/lms.conf"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
SKIP_SSL="$(printf '%s' "${SKIP_SSL:-false}" | tr '[:upper:]' '[:lower:]')"
ACME_WEBROOT="/var/www/certbot"
LIVE="/etc/letsencrypt/live/${DOMAIN:-_}"
LE_OPTIONS="/etc/letsencrypt/options-ssl-nginx.conf"
LE_DHPARAM="/etc/letsencrypt/ssl-dhparams.pem"

if [ -z "${DOMAIN}" ]; then
  echo "DOMAIN is not set — skip edge registration."
  echo "Add to .env: DOMAIN=lms.bubududuworld.fun"
  exit 0
fi

if [ -z "${CERTBOT_EMAIL}" ]; then
  CERTBOT_EMAIL="admin@${DOMAIN}"
  echo "CERTBOT_EMAIL not set — using ${CERTBOT_EMAIL}"
fi

mkdir -p "${TENANTS_DIR}" "${ACME_WEBROOT}" /var/www/html /etc/letsencrypt /var/lib/letsencrypt

ensure_ssl_helpers() {
  if [ ! -f "${LE_OPTIONS}" ]; then
    echo "Writing ${LE_OPTIONS}"
    cat > "${LE_OPTIONS}" <<'EOF'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384";
EOF
  fi

  if [ ! -f "${LE_DHPARAM}" ]; then
    echo "Generating ${LE_DHPARAM} (one-time, may take a minute)..."
    if command -v openssl > /dev/null 2>&1; then
      openssl dhparam -out "${LE_DHPARAM}" 2048
    else
      docker run --rm -v /etc/letsencrypt:/etc/letsencrypt alpine/openssl \
        dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
    fi
  fi
}

write_http_acme_conf() {
  cat > "${CONF_PATH}" <<EOF
# managed-by: lms deploy/register-edge-domain.sh
# DOMAIN=${DOMAIN}
# phase: acme-http

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${ACME_WEBROOT};
    }

    location / {
        proxy_pass http://host.docker.internal:${HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 120s;
        client_max_body_size 500m;
    }
}
EOF
}

write_tls_conf() {
  ensure_ssl_helpers
  cat > "${CONF_PATH}" <<EOF
# managed-by: lms deploy/register-edge-domain.sh
# DOMAIN=${DOMAIN}
# phase: tls

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${ACME_WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};

    ssl_certificate ${LIVE}/fullchain.pem;
    ssl_certificate_key ${LIVE}/privkey.pem;
    include ${LE_OPTIONS};
    ssl_dhparam ${LE_DHPARAM};

    client_max_body_size 500m;

    location / {
        proxy_pass http://host.docker.internal:${HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 120s;
    }
}
EOF
}

reload_edge() {
  if docker ps --format '{{.Names}}' | grep -qx "${EDGE_CONTAINER}"; then
    docker exec "${EDGE_CONTAINER}" nginx -t
    docker exec "${EDGE_CONTAINER}" nginx -s reload
    echo "Reloaded ${EDGE_CONTAINER}"
  else
    echo "ERROR: ${EDGE_CONTAINER} is not running. Start veblika-edge first." >&2
    exit 1
  fi
}

issue_cert() {
  echo "Requesting Let's Encrypt certificate for ${DOMAIN}..."
  echo "  email: ${CERTBOT_EMAIL}"
  echo "  DNS must already point to this server."

  docker pull certbot/certbot > /dev/null 2>&1 || true
  docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/lib/letsencrypt:/var/lib/letsencrypt \
    -v "${ACME_WEBROOT}:${ACME_WEBROOT}" \
    certbot/certbot certonly \
    --webroot -w "${ACME_WEBROOT}" \
    -d "${DOMAIN}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring \
    --rsa-key-size 2048
}

echo "Registering ${DOMAIN} → host.docker.internal:${HOST_PORT} (with SSL)"
echo "  conf: ${CONF_PATH}"

if [ "${SKIP_SSL}" = "true" ] || [ "${SKIP_SSL}" = "1" ] || [ "${SKIP_SSL}" = "yes" ]; then
  echo "SKIP_SSL=true — HTTP only (not recommended for production)."
  write_http_acme_conf
  reload_edge
  echo "Done. LMS URL (HTTP): http://${DOMAIN}"
  exit 0
fi

if [ -f "${LIVE}/fullchain.pem" ] && [ -f "${LIVE}/privkey.pem" ]; then
  write_tls_conf
  reload_edge
  echo "TLS already present — enabled https://${DOMAIN}"
  exit 0
fi

write_http_acme_conf
reload_edge

if ! issue_cert; then
  echo "ERROR: Let's Encrypt failed. Check DNS A record for ${DOMAIN} → this VPS, then re-run:" >&2
  echo "  sudo sh deploy/register-edge-domain.sh" >&2
  echo "  # or: docker compose run --rm edge-register" >&2
  exit 1
fi

if [ ! -f "${LIVE}/fullchain.pem" ] || [ ! -f "${LIVE}/privkey.pem" ]; then
  echo "ERROR: Certificate files missing under ${LIVE}" >&2
  exit 1
fi

write_tls_conf
reload_edge

echo "TLS enabled for https://${DOMAIN}"
echo "LMS is live at https://${DOMAIN}"
