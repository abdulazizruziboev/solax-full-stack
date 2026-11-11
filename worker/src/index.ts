import { startScheduler } from "./scheduler.js"
import { startProcessor } from "./processor.js"
import { startDailySummaryScheduler } from "./dailySummary.js"
import { notifyPendingAlarms, alertingEnabled } from "./alerter.js"
import { pollQueue } from "./queue.js"

console.log("[worker] starting Solax polling worker...")

const worker = startProcessor()
const pollTimer = startScheduler()
startDailySummaryScheduler()

// Operator alerting loop — pushes new alarms to Telegram every 30s (no-op if
// TELEGRAM_* env vars are unset).
console.log(`[alerter] Telegram alerting ${alertingEnabled() ? "enabled" : "disabled (no token)"}`)
const ALERT_INTERVAL_MS = 30_000
let alerting = false
const alertTimer = setInterval(() => {
  // Skip a tick if the previous one is still sending, so a slow Telegram call
  // can't make two runs notify the same alarm twice.
  if (alerting) return
  alerting = true
  notifyPendingAlarms()
    .then((n) => {
      if (n > 0) console.log(`[alerter] sent ${n} alarm notification(s)`)
    })
    .catch((err) => console.error("[alerter] failed:", err))
    .finally(() => {
      alerting = false
    })
}, ALERT_INTERVAL_MS)

let shuttingDown = false
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[worker] ${signal} received, shutting down...`)
  clearInterval(pollTimer)
  clearInterval(alertTimer)
  // Let the in-flight job finish (BullMQ waits for it) so it isn't re-run as
  // "stalled"; force-exit if that takes too long.
  const force = setTimeout(() => process.exit(1), 25_000)
  force.unref()
  try {
    await worker.close()
    await pollQueue.close()
  } catch (err) {
    console.error("[worker] error during shutdown:", err)
  }
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))
