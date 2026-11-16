#!/bin/bash
# Auto-start infrastructure dependencies before `next dev`.
# - local mongod (single-node replica set) when MONGODB_URI points to 127.0.0.1
# - (realtime is provided by Pusher Channels — no local service needed)
# This script NEVER fails the dev chain.

cd "$(dirname "$0")/.." || exit 0

# make .env visible to this shell (next.js loads it separately)
set -a
[ -f .env ] && . ./.env 2>/dev/null
set +a

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3>&- && exec 3<&- && return 0; return 1; }

MONGO_LOCAL=false
case "$MONGODB_URI" in
  *127.0.0.1*|*localhost*) MONGO_LOCAL=true ;;
esac

if [ "$MONGO_LOCAL" = "true" ] && [ -x ".bin/mongod" ]; then
  if port_open 27017; then
    echo "[start-deps] mongod already running"
  else
    echo "[start-deps] starting local mongod (replica set rs0)..."
    mkdir -p db
    nohup .bin/mongod \
      --dbpath db \
      --port 27017 \
      --bind_ip 127.0.0.1 \
      --replSet rs0 \
      --wiredTigerCacheSizeGB 0.35 \
      --logpath db/mongod.log \
      --fork >/dev/null 2>&1
    sleep 2
    bun scripts/init-replica.ts >/dev/null 2>&1 || true
    sleep 1
    if port_open 27017; then echo "[start-deps] mongod is up"; else echo "[start-deps] WARNING: mongod did not start (see db/mongod.log)"; fi
  fi
fi

exit 0
