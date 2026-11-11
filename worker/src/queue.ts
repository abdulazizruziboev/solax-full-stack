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

pollQueue.on("error", (err) => {
  console.error("[queue] redis error:", err.message)
})

/**
 * Drops devices that already have a poll waiting, so a restart, a slow cycle or
 * repeated "refresh" clicks can't stack duplicate jobs for the same inverter.
 */
export async function filterAlreadyQueued<T extends { id: string }>(devices: T[]): Promise<T[]> {
  const waiting = await pollQueue.getJobs(["waiting", "prioritized", "delayed"])
  const queued = new Set(waiting.map((j) => (j.data as PollJobData).deviceId))
  return devices.filter((d) => !queued.has(d.id))
}
