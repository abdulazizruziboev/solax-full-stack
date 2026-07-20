import { Worker, type Job } from "bullmq"
import { prisma } from "@solax/db"
import { SolaxClient, SolaxApiError } from "@solax/solax-client"
import { humanizeSolaxError } from "@solax/shared"
import { connection, POLL_QUEUE_NAME, type PollJobData } from "./queue.js"
import { env } from "./env.js"
import { runLiveDetection, LIVE_DETECTION_CODES } from "./detection.js"

const solaxClient = new SolaxClient({
  baseUrl: env.solaxBaseUrl,
  defaultTokenId: env.solaxTokenId,
  // No client-side retries: BullMQ handles reliability, and retrying inside
  // the job would multiply requests and blow past SolaxCloud's rate limit.
  maxRetries: 0,
})

async function handlePollJob(job: Job<PollJobData>): Promise<void> {
  const { deviceId, sn, tokenId } = job.data

  try {
    const reading = await solaxClient.getRealtimeInfo(sn, tokenId ?? undefined)

    await prisma.$transaction([
      prisma.reading.create({
        data: {
          deviceId,
          acPower: reading.acpower ?? null,
          yieldToday: reading.yieldtoday ?? null,
          yieldTotal: reading.yieldtotal ?? null,
          batterySoc: reading.soc ?? null,
          gridPower: reading.gridpower ?? null,
          feedInPower: reading.feedinpower ?? null,
          raw: reading as unknown as object,
        },
      }),
      prisma.device.update({
        where: { id: deviceId },
        data: {
          status: "ONLINE",
          lastSeenAt: new Date(),
        },
      }),
      // Device is reachable again — auto-resolve the offline/API-error alarms.
      // Detection-owned codes (below) are reconciled separately so a real
      // fault seen in the reading itself isn't wiped just because the poll
      // succeeded.
      prisma.alarm.updateMany({
        where: {
          deviceId,
          resolvedAt: null,
          code: { notIn: [...LIVE_DETECTION_CODES] },
        },
        data: { resolvedAt: new Date() },
      }),
    ])

    // Layers 1 & 2 on the fresh reading (creates/clears its own alarms).
    await runLiveDetection(deviceId, reading)

    console.log(`[processor] OK ${sn} acpower=${reading.acpower ?? "-"}W`)
  } catch (err) {
    await handlePollFailure(deviceId, sn, err)
    throw err
  }
}

async function handlePollFailure(
  deviceId: string,
  sn: string,
  err: unknown
): Promise<void> {
  const rawMessage = err instanceof SolaxApiError ? err.message : String(err)
  const code = err instanceof SolaxApiError ? err.code ?? "REQUEST_FAILED" : "UNKNOWN"
  const { message, severity } = humanizeSolaxError(code, rawMessage)

  console.error(`[processor] poll failed for ${sn}:`, rawMessage)

  await prisma.device.update({
    where: { id: deviceId },
    data: { status: code === "103" ? "ALARM" : "OFFLINE" },
  })

  const recentDuplicate = await prisma.alarm.findFirst({
    where: {
      deviceId,
      code,
      resolvedAt: null,
    },
  })

  if (!recentDuplicate) {
    await prisma.alarm.create({
      data: {
        deviceId,
        code,
        message,
        severity,
      },
    })
  }
}

export function startProcessor(): Worker<PollJobData> {
  // SolaxCloud rejects bursts, so we space requests evenly instead of firing
  // `rateLimitPerMin` at once: max 1 job per (60s / rateLimitPerMin) window.
  // With concurrency 1 this yields a steady ~1 request every few seconds.
  const spacingMs = Math.ceil(60_000 / env.rateLimitPerMin)

  const worker = new Worker<PollJobData>(POLL_QUEUE_NAME, handlePollJob, {
    connection,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: spacingMs,
    },
  })

  worker.on("failed", (job, err) => {
    console.error(`[processor] job ${job?.id} failed:`, err.message)
  })

  return worker
}
