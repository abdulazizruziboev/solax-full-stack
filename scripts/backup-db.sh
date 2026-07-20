#!/usr/bin/env bash
#
# Daily off-server backup of the Solax database.
#
# Dumps Postgres (compressed) and ships it to Telegram — the DB is ~13 MB so a
# gzipped dump is a couple of MB, well under Telegram's 50 MB bot limit. Keeps
# the newest few dumps locally and prunes the rest.
#
# The golden rule this satisfies: the backup leaves the box. If the VPS burns,
# the data is already in your Telegram chat.
#
# Cron (daily 03:00):
#   0 3 * * * /opt/solax/scripts/backup-db.sh >> /var/log/solax-backup.log 2>&1
#
# Requires in .env: DATABASE_URL, TELEGRAM_BOT_TOKEN, and one of
# TELEGRAM_BACKUP_CHAT_ID / TELEGRAM_CHAT_ID.
#
# NOTE: .env itself (secrets) is intentionally NOT sent here — keep it in a
# password manager, not a chat.

set -euo pipefail

# --- locate project root & load .env -----------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[backup] .env not found at $ENV_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

CONTAINER="${POSTGRES_CONTAINER:-solax_postgres}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
KEEP="${BACKUP_KEEP:-7}"
CHAT_ID="${TELEGRAM_BACKUP_CHAT_ID:-${TELEGRAM_CHAT_ID:-}}"

# --- parse DATABASE_URL: postgresql://user:pass@host:port/db -----------------
url="${DATABASE_URL:?DATABASE_URL missing}"
creds="${url#*://}"              # user:pass@host:port/db
userpass="${creds%%@*}"         # user:pass
DB_USER="${userpass%%:*}"
DB_PASS="${userpass#*:}"
DB_NAME="${url##*/}"
DB_NAME="${DB_NAME%%\?*}"        # strip any ?query

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/solax-$STAMP.sql.gz"

# --- dump (inside the container, so no host pg client needed) -----------------
echo "[backup] dumping $DB_NAME from $CONTAINER ..."
docker exec -e PGPASSWORD="$DB_PASS" "$CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges \
  | gzip -9 > "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[backup] wrote $OUT ($SIZE)"

# --- ship to Telegram ---------------------------------------------------------
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "$CHAT_ID" ]; then
  echo "[backup] sending to Telegram ..."
  http_code="$(curl -s -o /dev/null -w '%{http_code}' \
    -F "chat_id=$CHAT_ID" \
    -F "document=@$OUT" \
    -F "caption=🗄️ Solax DB backup · $STAMP · $SIZE" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument")"
  if [ "$http_code" = "200" ]; then
    echo "[backup] delivered to Telegram"
  else
    echo "[backup] Telegram upload failed (HTTP $http_code) — local copy kept" >&2
  fi
else
  echo "[backup] TELEGRAM_* not set — local copy only ($OUT)" >&2
fi

# --- prune old local dumps ----------------------------------------------------
ls -1t "$BACKUP_DIR"/solax-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f "$old" && echo "[backup] pruned $old"
done

echo "[backup] done."
