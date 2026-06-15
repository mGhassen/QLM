#!/usr/bin/env bash
# Shared helper: compute per-worktree preview ports from a story NNN.
#
# Usage: source scripts/sdd/preview-ports.sh <NNN>
# Exports: WEB_PORT, SERVER_PORT, SB_API, SB_DB, SB_STUDIO, SB_INBUCKET,
#          SB_SMTP, SB_POP3, SB_SHADOW, SB_ANALYTICS, SUPABASE_PROJECT_ID.
#
# Port scheme (deterministic, collision-free with main repo defaults 3000/4096/84321-26):
#   WEB_PORT      = 3000 + NNN   (3001..3999)
#   SERVER_PORT   = 4000 + NNN   (4001..4999)
#   SB_API        = 64000 + NNN*10   (64010, 64020, ...)
#   SB_DB         = SB_API + 1
#   SB_STUDIO     = SB_API + 2
#   SB_INBUCKET   = SB_API + 3
#   SB_SMTP       = SB_API + 4
#   SB_POP3       = SB_API + 5
#   SB_SHADOW     = SB_API + 6
#   SB_ANALYTICS  = SB_API + 7

set -euo pipefail

if [[ -z "${1:-}" ]]; then
  echo "preview-ports.sh: missing NNN argument" >&2
  return 1 2>/dev/null || exit 1
fi

NNN_RAW="$1"
NNN=$((10#$NNN_RAW))

if (( NNN < 1 || NNN > 999 )); then
  echo "preview-ports.sh: NNN must be 001..999, got $NNN_RAW" >&2
  return 1 2>/dev/null || exit 1
fi

export WEB_PORT=$((3000 + NNN))
export SERVER_PORT=$((4000 + NNN))

SB_BASE=$((64000 + NNN * 10))
export SB_API=$SB_BASE
export SB_DB=$((SB_BASE + 1))
export SB_STUDIO=$((SB_BASE + 2))
export SB_INBUCKET=$((SB_BASE + 3))
export SB_SMTP=$((SB_BASE + 4))
export SB_POP3=$((SB_BASE + 5))
export SB_SHADOW=$((SB_BASE + 6))
export SB_ANALYTICS=$((SB_BASE + 7))

export SUPABASE_PROJECT_ID="guepard-sdd-${NNN_RAW}"
