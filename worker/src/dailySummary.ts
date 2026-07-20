import { prisma } from "@solax/db"
import { getNextSunset, getUzDayBounds } from "./sunset.js"
import { runDailyAnalysis } from "./dailyAnalysis.js"

/**
 * Aggregates today's readings/alarms/status per device into one
 * DailySummary row. Runs once per day, right at Uzbekistan sunset, since
 * that's when a solar inverter's daily generation is effectively final.
 *
 * The day boundary is always Uzbekistan's calendar day (UTC+5), regardless
 * of the timezone the worker process happens to run in.
 */
export async function runDailySummary(forDate: Date = new Date()): Promise<number> {
  const { start: dayStart, end: dayEnd, dateOnly } = getUzDayBounds(forDate)

  const devices = await prisma.device.findMany({ select: { id: true, status: true } })

  const [yieldAgg, alarmCounts] = await Promise.all([
    prisma.reading.groupBy({
      by: ["deviceId"],
      where: { ts: { gte: dayStart, lt: dayEnd } },
      _max: { yieldToday: true, acPower: true },
    }),
    prisma.alarm.groupBy({
      by: ["deviceId"],
      where: { ts: { gte: dayStart, lt: dayEnd } },
      _count: { _all: true },
    }),
  ])

  const yieldByDevice = new Map(yieldAgg.map((r) => [r.deviceId, r._max]))
  const alarmsByDevice = new Map(alarmCounts.map((r) => [r.deviceId, r._count._all]))

  // A device counts as "offline today" if it currently has no reading in
  // today's window at all, or its live status is OFFLINE.
  const readingDeviceIds = new Set(yieldAgg.map((r) => r.deviceId))

  let written = 0
  for (const device of devices) {
    const agg = yieldByDevice.get(device.id)
    const hadReadingToday = readingDeviceIds.has(device.id)

    await prisma.dailySummary.upsert({
      where: { deviceId_date: { deviceId: device.id, date: dateOnly } },
      update: {
        totalYieldKwh: agg?.yieldToday ?? null,
        peakAcPowerW: agg?.acPower ?? null,
        alarmCount: alarmsByDevice.get(device.id) ?? 0,
        wasOnline: hadReadingToday,
      },
      create: {
        deviceId: device.id,
        date: dateOnly,
        totalYieldKwh: agg?.yieldToday ?? null,
        peakAcPowerW: agg?.acPower ?? null,
        alarmCount: alarmsByDevice.get(device.id) ?? 0,
        wasOnline: hadReadingToday,
        offlineCount: hadReadingToday ? 0 : 1,
      },
    })
    written += 1
  }

  return written
}

export function startDailySummaryScheduler(): void {
  const schedule = () => {
    const next = getNextSunset()
    const delayMs = next.getTime() - Date.now()

    console.log(
      `[daily-summary] next run at ${next.toISOString()} (in ${Math.round(delayMs / 60000)} min)`
    )

    setTimeout(() => {
      runDailySummary()
        .then((count) => console.log(`[daily-summary] wrote ${count} device summaries`))
        // Layer-3 analysis runs right after the summary is final.
        .then(() => runDailyAnalysis())
        .then((count) => console.log(`[daily-analysis] analyzed ${count} devices`))
        .catch((err) => console.error("[daily-summary/analysis] failed:", err))
        .finally(schedule)
    }, delayMs)
  }

  schedule()
}
