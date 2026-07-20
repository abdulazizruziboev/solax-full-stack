# Deployment & CI/CD

## Pipeline overview

| Stage | Trigger | What runs |
|-------|---------|-----------|
| **CI** (`.github/workflows/ci.yml`) | every push / PR | install → prisma generate → lint → typecheck (web + worker) → unit tests → `next build` |
| **CD** (`.github/workflows/deploy.yml`) | push to `main` | SSH to the VPS → build images → migrate → restart the Docker stack |

Everything runs in Docker on the VPS: **postgres (TimescaleDB) + redis + web + worker**, optionally fronted by **Caddy** for automatic HTTPS.

---

## One-time VPS setup

1. **Install Docker + Compose plugin** (Ubuntu 22.04/24.04):
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. **Clone the repo** to the app directory:
   ```bash
   sudo mkdir -p /opt/solax && sudo chown $USER /opt/solax
   git clone git@github.com:abdulazizruziboev/solax-full-stack.git /opt/solax
   cd /opt/solax
   ```

3. **Create `.env`** (never committed). Point the app at the compose service
   names, not localhost:
   ```dotenv
   DATABASE_URL="postgresql://solax:<STRONG_PASSWORD>@postgres:5432/solax"
   REDIS_URL="redis://redis:6379"
   POSTGRES_USER="solax"
   POSTGRES_PASSWORD="<STRONG_PASSWORD>"
   POSTGRES_DB="solax"

   AUTH_SECRET="<openssl rand -base64 32>"
   NEXTAUTH_URL="https://solax.example.com"

   SOLAX_TOKEN_ID="<your token>"
   SOLAX_API_BASE_URL="https://www.solaxcloud.com:9443/proxy/api"
   POLL_INTERVAL_SECONDS="1200"
   SOLAX_RATE_LIMIT_PER_MIN="9"

   # Operator alerts + backups (optional)
   TELEGRAM_BOT_TOKEN=""
   TELEGRAM_CHAT_ID=""

   # HTTPS (only if using the caddy profile)
   DOMAIN="solax.example.com"
   ```

4. **First boot**:
   ```bash
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d postgres redis
   docker compose -f docker-compose.prod.yml run --rm worker pnpm --filter @solax/db migrate:deploy
   docker compose -f docker-compose.prod.yml run --rm worker pnpm --filter @solax/db exec tsx prisma/seed.ts   # creates the admin user
   docker compose -f docker-compose.prod.yml up -d
   ```
   With a domain, add HTTPS: `docker compose -f docker-compose.prod.yml --profile proxy up -d`.

5. **Daily DB backup** (cron):
   ```bash
   (crontab -l 2>/dev/null; echo "0 3 * * * /opt/solax/scripts/backup-db.sh >> /var/log/solax-backup.log 2>&1") | crontab -
   ```

---

## GitHub secrets (for auto-deploy)

Repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | server IP / hostname |
| `VPS_USER` | ssh user (e.g. `deploy`) |
| `VPS_SSH_KEY` | private key whose public half is in the server's `~/.ssh/authorized_keys` |
| `VPS_PORT` | ssh port (usually `22`) |
| `VPS_APP_DIR` | `/opt/solax` |

Once set, every push to `main` deploys automatically.

---

## Manual deploy / rollback

```bash
cd /opt/solax
git pull --ff-only        # or: git checkout <good-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes
- Postgres/Redis are **not** exposed to the public internet (no host port
  mapping in prod); only Caddy's 80/443 and web on 127.0.0.1:3000 are.
- The `readings` hypertable + compression are set up by migrations, so a fresh
  DB is production-ready after `migrate:deploy`.
