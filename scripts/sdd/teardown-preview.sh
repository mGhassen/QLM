#!/usr/bin/env bash
# Tear down a worktree's preview environment.
#
# Invoked by `/finish` before `git worktree remove`. Idempotent.
#
# Usage: scripts/sdd/teardown-preview.sh <worktree-path>
#
# Does:
#   1. Sources <worktree>/.preview.env to learn its allocated ports.
#   2. Stops the worktree's supabase stack (scoped by its project_id).
#   3. Kills any listener on WEB_PORT / SERVER_PORT.
#
# Never destructive beyond its own ports. If .preview.env is missing, no-op.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: teardown-preview.sh <worktree-path>" >&2
  exit 1
fi

WORKTREE="$1"
PREVIEW_ENV="$WORKTREE/.preview.env"

if [[ ! -f "$PREVIEW_ENV" ]]; then
  echo "[teardown-preview] no .preview.env at $WORKTREE — nothing to tear down"
  exit 0
fi

# shellcheck source=/dev/null
set -a
source "$PREVIEW_ENV"
set +a

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "[teardown-preview] killing PIDs on :$port — $pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -ti :"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

# Stop supabase for this worktree's project. `supabase stop` reads config.toml
# from cwd, so run it from inside the worktree's apps/web.
if command -v supabase >/dev/null 2>&1 && [[ -f "$WORKTREE/apps/web/supabase/config.toml" ]]; then
  ( cd "$WORKTREE/apps/web" && supabase stop --no-backup 2>/dev/null || true )
fi

for port in "$WEB_PORT" "$SERVER_PORT" "$SB_API" "$SB_DB" "$SB_STUDIO" "$SB_INBUCKET" "$SB_SMTP"; do
  [[ -n "${port:-}" ]] && kill_port "$port"
done

echo "[teardown-preview] done for $SUPABASE_PROJECT_ID"
