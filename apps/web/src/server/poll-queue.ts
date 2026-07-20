import "server-only"
import { Queue, type ConnectionOptions } from "bullmq"
import { prisma } from "@solax/db"

// Mirrors worker/src/queue.ts so the web app can enqueue on-demand poll jobs
// onto the same BullMQ queue the worker already consumes. The worker's
// processor picks these up exactly like scheduled polls.
const POLL_QUEUE_NAME = "solax-device-poll"

function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  }
}

// Reuse one Queue instance across requests (Next.js may keep the module warm).
const globalForQueue = globalThis as unknown as { pollQueue?: Queue }

function getPollQueue(): Queue {
  if (!globalForQueue.pollQueue) {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379"
    globalForQueue.pollQueue = new Queue(POLL_QUEUE_NAME, {
      connection: parseRedisUrl(redisUrl),
    })
  }
  return globalForQueue.pollQueue
}

/**
 * Enqueues an immediate poll for the given devices (or all devices when no
 * ids are passed). Returns how many jobs were queued. The worker's rate
 * limiter still spaces the outbound SolaxCloud requests, so a full refresh
 * trickles through rather than firing all at once.
 */
export async function enqueueDevicePolls(deviceIds?: string[]): Promise<number> {
  const devices = await prisma.device.findMany({
    where: deviceIds?.length ? { id: { in: deviceIds } } : undefined,
    select: { id: true, sn: true, tokenId: true },
  })

  if (devices.length === 0) return 0

  const queue = getPollQueue()
  await queue.addBulk(
    devices.map((device) => ({
      name: "poll-device",
      data: { deviceId: device.id, sn: device.sn, tokenId: device.tokenId },
      opts: {
        jobId: `poll-${device.id}-${Date.now()}`,
        removeOnComplete: 500,
        removeOnFail: 1000,
        // On-demand polls jump ahead of the scheduler's bulk backlog so the
        // "refresh now" / live view feels immediate. The worker's rate limiter
        // still spaces outbound SolaxCloud requests. (Lower number = higher
        // priority; scheduled jobs use the default/lowest priority.)
        priority: 1,
      },
    }))
  )

  return devices.length
}
