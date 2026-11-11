import { prisma } from "@solax/db"
import { pollQueue, filterAlreadyQueued, type PollJobData } from "./queue.js"
import { env } from "./env.js"

/**
 * Enqueues one poll job per device on a fixed interval. BullMQ concurrency
 * (see processor.ts) throttles actual outbound requests to respect
 * SolaxCloud's rate limit, so we can safely enqueue all devices at once.
 */
export async function enqueueAllDevices(): Promise<number> {
  const all = await prisma.device.findMany({
    select: { id: true, sn: true, tokenId: true },
  })
  // If the previous cycle hasn't drained yet, don't pile a second job per device.
  const devices = await filterAlreadyQueued(all)
  if (devices.length === 0) return 0

  await pollQueue.addBulk(
    devices.map((device) => ({
      name: "poll-device",
      data: {
        deviceId: device.id,
        sn: device.sn,
        tokenId: device.tokenId,
      } satisfies PollJobData,
      opts: {
        jobId: `poll-${device.id}-${Date.now()}`,
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    }))
  )

  return devices.length
}

export function startScheduler(): NodeJS.Timeout {
  const run = () => {
    enqueueAllDevices()
      .then((count) => {
        console.log(`[scheduler] enqueued ${count} device poll jobs`)
      })
      .catch((err) => {
        console.error("[scheduler] failed to enqueue devices", err)
      })
  }

  run()
  return setInterval(run, env.pollIntervalSeconds * 1000)
}
