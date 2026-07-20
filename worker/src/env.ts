import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// `override: true` is essential: importing @solax/db initializes Prisma,
// which auto-loads packages/db/.env into process.env first. Without override,
// those (possibly stale) values would win over the real root .env.
config({ path: path.resolve(__dirname, "../../.env"), override: true })

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const env = {
  redisUrl: required("REDIS_URL"),
  solaxTokenId: process.env.SOLAX_TOKEN_ID ?? "",
  solaxBaseUrl: process.env.SOLAX_API_BASE_URL,
  pollIntervalSeconds: Number(process.env.POLL_INTERVAL_SECONDS ?? 1500),
  pollConcurrency: Number(process.env.POLL_CONCURRENCY ?? 3),
  // SolaxCloud free tier allows ~10 API calls/minute per token and rejects
  // bursts. We space requests evenly at this rate (see processor.ts).
  rateLimitPerMin: Number(process.env.SOLAX_RATE_LIMIT_PER_MIN ?? 8),
  // Operator alerting via Telegram. Optional — when unset, the alerter no-ops
  // (alarms are still stored and shown in the UI, just not pushed).
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
}
