#!/usr/bin/env bash
set -euo pipefail

# Build the single-image console container (nginx + web + server),
# loading all VITE_* build args from a .env file.
#
# This script sources the file with bash (quotes and export are handled).
# `docker run --env-file` does not — use a local helper that rewrites the
# file for Docker, or use unquoted KEY=value in env files.
#
# Usage:
#   ./docker/full/build-full.sh [path-to-env] [image-tag]
#
# Examples:
#   ./docker/full/build-full.sh ./.env guepard-console-full:dev
#   ./docker/full/build-full.sh ./apps/server/.env guepard-console-full:local

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${1:-$ROOT_DIR/.env}"
IMAGE_TAG="${2:-guepard-console-full:dev}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "env file not found: $ENV_FILE" >&2
  exit 1
fi

GIT_HASH=""
if command -v git >/dev/null 2>&1; then
  GIT_HASH="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || true)"
fi

# Load env file in a subshell to avoid polluting caller shell.
mapfile -t VITE_KV < <(
  bash -lc "
    set -euo pipefail
    set -a
    . \"$ENV_FILE\"
    set +a
    env | LC_ALL=C sort | grep '^VITE_' || true
  "
)

BUILD_ARGS=()
for kv in "${VITE_KV[@]}"; do
  key="${kv%%=*}"
  val="${kv#*=}"
  BUILD_ARGS+=(--build-arg "${key}=${val}")
done

# Sensible defaults if not present in env file.
if ! printf '%s\n' "${VITE_KV[@]}" | grep -q '^VITE_API_URL='; then
  BUILD_ARGS+=(--build-arg "VITE_API_URL=/api")
fi
if [[ -n "$GIT_HASH" ]] && ! printf '%s\n' "${VITE_KV[@]}" | grep -q '^VITE_APP_GIT_HASH='; then
  BUILD_ARGS+=(--build-arg "VITE_APP_GIT_HASH=$GIT_HASH")
fi

echo "Building $IMAGE_TAG"
echo "  env: $ENV_FILE"
echo "  vite args: ${#BUILD_ARGS[@]}"

docker build \
  -f "$ROOT_DIR/Dockerfile.full" \
  -t "$IMAGE_TAG" \
  "${BUILD_ARGS[@]}" \
  "$ROOT_DIR"

