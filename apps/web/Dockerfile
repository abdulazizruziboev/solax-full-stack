# Production image for the Next.js web app (pnpm monorepo, standalone output).
# Debian-slim base so Prisma's engine works without musl gymnastics.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
RUN corepack enable
# Prisma needs openssl present at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- install deps (cached on manifests) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY worker/package.json worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/solax-client/package.json packages/solax-client/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @solax/db generate
RUN pnpm --filter web build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone bundle keeps the monorepo layout under the trace root.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
