import { startScheduler } from "./scheduler.js"
import { startProcessor } from "./processor.js"
import { startDailySummaryScheduler } from "./dailySummary.js"
import { notifyPendingAlarms, alertingEnabled } from "./alerter.js"

console.log("[worker] starting Solax polling worker...")

startProcessor()
startScheduler()
startDailySummaryScheduler()

// Operator alerting loop — pushes new alarms to Telegram every 30s (no-op if
// TELEGRAM_* env vars are unset).
console.log(`[alerter] Telegram alerting ${alertingEnabled() ? "enabled" : "disabled (no token)"}`)
const ALERT_INTERVAL_MS = 30_000
setInterval(() => {
  notifyPendingAlarms()
    .then((n) => {
      if (n > 0) console.log(`[alerter] sent ${n} alarm notification(s)`)
    })
    .catch((err) => console.error("[alerter] failed:", err))
}, ALERT_INTERVAL_MS)

process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))
