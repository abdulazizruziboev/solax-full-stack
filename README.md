# Solax Monitoring

Fleet monitoring for SolaxCloud inverters: a Next.js dashboard (`apps/web`), a
BullMQ polling/analysis worker (`worker`) and shared packages (`packages/*`),
backed by Postgres/TimescaleDB and Redis.

## Local development

```bash
cp .env.example .env            # then fill in AUTH_SECRET, ADMIN_PIN, SOLAX_TOKEN_ID
docker compose up -d            # postgres + redis (bound to 127.0.0.1)
pnpm install
pnpm --filter @solax/db generate
pnpm --filter @solax/db migrate:dev
pnpm --filter @solax/db seed    # creates the admin user
pnpm dev                        # web on :3000
pnpm worker                     # polling worker
```

Checks (also run in CI): `pnpm --filter web lint`, `pnpm typecheck`, `pnpm test`.

## Layout

- `apps/web` — dashboard + API routes (NextAuth, PIN or email login)
- `worker` — SolaxCloud poller, live detection, daily summary/analysis, Telegram alerts
- `packages/db` — Prisma schema/migrations · `packages/shared` — zod schemas ·
  `packages/solax-client` — SolaxCloud API client

Deployment: see [DEPLOY.md](DEPLOY.md).
