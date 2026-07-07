#!/usr/bin/env bash
# Deploy one or more Edge Functions to the self-hosted content-pipeline
# Supabase stack on Hetzner. The git push only updates the repo. Functions
# are served from the box filesystem, so they must be copied and the runtime
# restarted.
#
# Usage:
#   scripts/deploy-function.sh vera-orchestrator        # one function
#   scripts/deploy-function.sh vera-orchestrator vera-chat
#   scripts/deploy-function.sh --all                    # every function + _shared
#   scripts/deploy-function.sh --shared vera-chat       # also sync _shared/
#   TARGET_SSH_KEY=~/.ssh/vera_hetzner_ed25519 scripts/deploy-function.sh --shared vera-chat
#
# Requires SSH access to the live box.

set -euo pipefail

DOMAIN="${DOMAIN:-supabase-content-eu.innovareai.com}"
REMOTE_DIR="${REMOTE_DIR:-/srv/supabase-content/volumes/functions}"
CONTAINER="${CONTAINER:-content-supabase-edge-functions}"
SSH_KEY="${SSH_KEY:-${TARGET_SSH_KEY:-}}"
ALLOW_NON_LIVE_HOST="${ALLOW_NON_LIVE_HOST:-false}"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/functions"

SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=8)
if [ -n "$SSH_KEY" ]; then
  SSH_ARGS=(-i "$SSH_KEY" -o IdentitiesOnly=yes "${SSH_ARGS[@]}")
fi

resolved_ip="$(dig +short "$DOMAIN" | tail -n 1 || true)"

if [ -z "$resolved_ip" ]; then
  echo "could not resolve $DOMAIN" >&2
  exit 1
fi

HOST="${HOST:-${TARGET_HOST:-root@$resolved_ip}}"
host_without_user="${HOST#*@}"
host_name="${host_without_user%%:*}"

if [ "$ALLOW_NON_LIVE_HOST" != "true" ] && [ "$host_name" != "$DOMAIN" ] && [ "$host_name" != "$resolved_ip" ]; then
  cat >&2 <<EOF
refusing to deploy to $HOST
$DOMAIN currently resolves to $resolved_ip.

Set TARGET_HOST=root@$resolved_ip, use the domain default, or set ALLOW_NON_LIVE_HOST=true for an intentional non-live deploy.
EOF
  exit 1
fi

sync_shared=false
targets=()

for arg in "$@"; do
  case "$arg" in
    --all)
      targets=()
      while IFS= read -r fn; do
        targets+=("$fn")
      done < <(find "$LOCAL_DIR" -mindepth 1 -maxdepth 1 -type d ! -name _shared -exec basename {} \; | sort)
      sync_shared=true
      ;;
    --shared) sync_shared=true ;;
    *)        targets+=("$arg") ;;
  esac
done

if [ "${#targets[@]}" -eq 0 ] && [ "$sync_shared" = false ]; then
  echo "usage: $0 <function-name> [more...] | --all | --shared <function>" >&2
  exit 1
fi

# _shared is imported by most functions; sync it whenever asked or on --all.
echo "target: $HOST ($DOMAIN -> $resolved_ip)"
ssh "${SSH_ARGS[@]}" "$HOST" "test -d '$REMOTE_DIR' && docker inspect '$CONTAINER' >/dev/null"

if [ "$sync_shared" = true ]; then
  echo "syncing _shared/"
  scp -q "${SSH_ARGS[@]}" -r "$LOCAL_DIR/_shared" "$HOST:$REMOTE_DIR/"
fi

for fn in "${targets[@]}"; do
  if [ ! -f "$LOCAL_DIR/$fn/index.ts" ]; then
    echo "$fn: no index.ts found locally, skipping" >&2
    continue
  fi
  echo "deploying $fn"
  scp -q "${SSH_ARGS[@]}" -r "$LOCAL_DIR/$fn" "$HOST:$REMOTE_DIR/"
done

echo "restarting $CONTAINER"
ssh "${SSH_ARGS[@]}" "$HOST" "docker restart '$CONTAINER'" >/dev/null

echo "done. Give it a few seconds to come up, then test the endpoint."
