# Production image for the polling/analysis worker. Runs via tsx because the
# workspace packages (@solax/shared etc.) are consumed as TypeScript source.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY worker/package.json worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/solax-client/package.json packages/solax-client/
RUN pnpm install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/worker/node_modules ./worker/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @solax/db generate
CMD ["pnpm", "--filter", "worker", "start"]
