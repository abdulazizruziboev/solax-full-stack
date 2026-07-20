import { Queue, type ConnectionOptions } from "bullmq"
import { env } from "./env.js"

// Pass parsed connection options (rather than constructing our own ioredis
// instance) so BullMQ manages the client with a matching ioredis version
// internally — avoids duplicate-ioredis-instance type mismatches that show
// up when multiple ioredis versions get installed in a pnpm workspace.
function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  }
}

export const connection: ConnectionOptions = parseRedisUrl(env.redisUrl)

export const POLL_QUEUE_NAME = "solax-device-poll"

export const pollQueue = new Queue(POLL_QUEUE_NAME, { connection })

export interface PollJobData {
  deviceId: string
  sn: string
  tokenId: string | null
}
