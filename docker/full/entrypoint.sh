#!/bin/sh
set -eu

CONSOLE_PORT="${CONSOLE_PORT:-3000}"
WEB_INTERNAL_PORT="${WEB_INTERNAL_PORT:-3001}"
API_INTERNAL_PORT="${API_INTERNAL_PORT:-4096}"

node <<'NODE'
const fs = require('fs');
const path = require('path');

const dist = '/app/packages/domain/dist';

function ensureDirBarrels(base) {
  if (!fs.existsSync(base)) return;
  for (const ent of fs.readdirSync(base, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const d = ent.name;
    const idx = path.join(base, d, 'index.js');
    const shim = path.join(base, `${d}.js`);
    if (fs.existsSync(idx) && !fs.existsSync(shim)) {
      fs.writeFileSync(shim, `export * from "./${d}/index.js";\n`);
    }
  }
}

function ensureIndexExportShims(base) {
  const idx = path.join(base, 'index.js');
  if (!fs.existsSync(idx)) return;
  const lines = fs.readFileSync(idx, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = /^export \* from '\.\/(.+)\.js';$/.exec(line.trim());
    if (!m) continue;
    const name = m[1];
    const file = path.join(base, `${name}.js`);
    if (fs.existsSync(file)) continue;
    const target = path.join(base, name, 'index.js');
    if (fs.existsSync(target)) {
      fs.writeFileSync(file, `export * from "./${name}/index.js";\n`);
    }
  }
}

if (fs.existsSync(dist)) {
  ensureDirBarrels(dist);
  ensureDirBarrels(path.join(dist, 'entities'));
  ensureDirBarrels(path.join(dist, 'services'));
  ensureDirBarrels(path.join(dist, 'usecases'));
  ensureIndexExportShims(path.join(dist, 'services', 'ai'));
  ensureIndexExportShims(path.join(dist, 'usecases', 'ai'));
}
NODE

# API server (Hono) listens on internal port
export PORT="$API_INTERNAL_PORT"
export HOSTNAME="127.0.0.1"

mkdir -p /app/data

# Run precompiled server JS to avoid Bun TS decorator mismatch.
bun /app/apps/server/dist/index.js >/tmp/server.log 2>&1 &
SERVER_PID=$!

# Web SSR server listens on internal port
export PORT="$WEB_INTERNAL_PORT"
export HOSTNAME="127.0.0.1"
export SERVER_API_URL="${SERVER_API_URL:-/api}"

# TanStack/React Router server build is meant to be run via @react-router/serve
pnpm -C /app/apps/web exec react-router-serve /app/apps/web/dist/server/server.js >/tmp/web.log 2>&1 &
WEB_PID=$!

cleanup() {
  kill "$SERVER_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

READY_WAIT="${QLM_READY_WAIT_SECONDS:-90}"

if [ "${QLM_WAIT_BACKENDS:-1}" != "0" ]; then
  echo "[entrypoint] waiting for Bun API :${API_INTERNAL_PORT} (skip: QLM_WAIT_BACKENDS=0)" >&2
  i=0
  while [ "$i" -lt "$READY_WAIT" ]; do
    if curl -fsS --max-time 2 "http://127.0.0.1:${API_INTERNAL_PORT}/health" >/dev/null 2>&1; then
      echo "[entrypoint] API ready" >&2
      break
    fi
    i=$((i + 1))
    sleep 1
  done
  if [ "$i" -ge "$READY_WAIT" ]; then
    echo "[entrypoint] timeout API on ${API_INTERNAL_PORT}" >&2
    tail -120 /tmp/server.log 2>/dev/null || true
    exit 1
  fi

  echo "[entrypoint] waiting for SSR :${WEB_INTERNAL_PORT}" >&2
  i=0
  while [ "$i" -lt "$READY_WAIT" ]; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --max-time 5 "http://127.0.0.1:${WEB_INTERNAL_PORT}/" || echo "000")
    if [ "$code" != "000" ]; then
      echo "[entrypoint] SSR accepting (GET / -> HTTP $code)" >&2
      break
    fi
    i=$((i + 1))
    sleep 1
  done
  if [ "$i" -ge "$READY_WAIT" ]; then
    echo "[entrypoint] timeout SSR on ${WEB_INTERNAL_PORT}" >&2
    tail -120 /tmp/web.log 2>/dev/null || true
    exit 1
  fi
fi

# nginx listens publicly on CONSOLE_PORT
sed -i "s/listen 3000;/listen ${CONSOLE_PORT};/g" /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'

