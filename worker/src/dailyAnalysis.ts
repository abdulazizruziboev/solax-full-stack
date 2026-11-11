// Layer-3 daily analysis, run at Uzbekistan sunset right after the daily
// summary. For each device it computes data completeness, per-string shares on
// high-irradiance samples, updates the learned baseline, and raises
// STRING / FUSE / PERFORMANCE alarms — with a 2-consecutive-day guard on the
// slower signals so a single noisy day can't page the operator.

import { prisma } from "@solax/db"
import { getUzDayBounds } from "./sunset.js"
import { env } from "./env.js"
import { completenessPct } from "./analysis/dataQuality.js"
import { stringShares, computeStringDeviations, worstDeviation } from "./analysis/stringAnalysis.js"
import { detectFuse, describeFuse } from "./analysis/fuseDetection.js"
import { specificYield, performanceIndex } from "./analysis/performance.js"
import { median, mad } from "./analysis/stats.js"
import { summarizeShares, isBaselineReady, deviationThresholdPct, MIN_BASELINE_SAMPLES } from "./analysis/baseline.js"

const STRINGS = [1, 2, 3, 4]
// A sample is "high irradiance" (worth comparing strings on) when AC power is
// above this fraction of rated — below it, low-light noise dominates.
const IRRADIANCE_FRACTION = 0.3
const LOW_YIELD_INDEX = 0.85 // below 85% of peer median = under-producing
// Baseline adapts slowly once established so a genuine new fault isn't absorbed.
const BASELINE_ALPHA = 0.1
// One day contributes at most this many samples toward a baseline's "trusted"
// count, so a baseline needs several distinct days (MIN_BASELINE_SAMPLES /
// cap) of data — not a single sunny day — before it can raise alarms.
const BASELINE_DAILY_SAMPLE_CAP = 6
// A trusted baseline is NOT updated on a day when the string looks faulty
// (share fell below this fraction of its baseline). Otherwise a blown fuse
// would drag the "normal" down ~10%/day and the alarm would clear itself.
const BASELINE_FAULT_RATIO = 0.85

interface ReadingRow {
  ts: Date
  acPower: number | null
  yieldToday: number | null
  raw: unknown
}

function n(raw: Record<string, unknown> | null, key: string): number | null {
  if (!raw) return null
  const v = raw[key]
  return typeof v === "number" ? v : null
}

/** idc1..4 as an ordered array (null where absent). */
function stringCurrents(raw: Record<string, unknown> | null): (number | null)[] {
  return STRINGS.map((i) => n(raw, `idc${i}`))
}

export async function runDailyAnalysis(forDate: Date = new Date()): Promise<number> {
  const { start: dayStart, end: dayEnd, dateOnly } = getUzDayBounds(forDate)
  const windowEnd = Math.min(Date.now(), dayEnd.getTime())
  const expectedIntervalMs = env.pollIntervalSeconds * 1000

  const devices = await prisma.device.findMany({ select: { id: true } })

  // First pass: per-device day metrics (needed to compute the peer median).
  const perDevice = new Map<
    string,
    {
      completeness: number
      ratedKw: number | null
      yieldKwh: number | null
      dayShareByString: Map<number, number> // stringIndex → median share today
      dayMadByString: Map<number, number>
      sampleCount: number
    }
  >()

  for (const device of devices) {
    const readings = (await prisma.reading.findMany({
      where: { deviceId: device.id, ts: { gte: dayStart, lt: dayEnd } },
      orderBy: { ts: "asc" },
      select: { ts: true, acPower: true, yieldToday: true, raw: true },
    })) as ReadingRow[]

    const completeness = completenessPct(
      readings.map((r) => r.ts.getTime()),
      dayStart.getTime(),
      windowEnd,
      expectedIntervalMs
    )

    let ratedKw: number | null = null
    let yieldKwh: number | null = null
    const sharesByString = new Map<number, number[]>()

    for (const r of readings) {
      const raw = (r.raw ?? null) as Record<string, unknown> | null
      const rated = n(raw, "ratedPower")
      if (rated != null) ratedKw = Math.max(ratedKw ?? 0, rated)
      if (r.yieldToday != null) yieldKwh = Math.max(yieldKwh ?? 0, r.yieldToday)

      // High-irradiance gate for string comparison.
      const threshold = (ratedKw ?? rated ?? 0) * 1000 * IRRADIANCE_FRACTION
      if (r.acPower != null && threshold > 0 && r.acPower >= threshold) {
        const shares = stringShares(stringCurrents(raw))
        shares.forEach((s, i) => {
          if (s == null) return
          const arr = sharesByString.get(i + 1) ?? []
          arr.push(s)
          sharesByString.set(i + 1, arr)
        })
      }
    }

    const dayShareByString = new Map<number, number>()
    const dayMadByString = new Map<number, number>()
    let sampleCount = 0
    for (const [idx, arr] of sharesByString) {
      dayShareByString.set(idx, median(arr))
      dayMadByString.set(idx, mad(arr))
      sampleCount = Math.max(sampleCount, arr.length)
    }

    perDevice.set(device.id, {
      completeness,
      ratedKw,
      yieldKwh,
      dayShareByString,
      dayMadByString,
      sampleCount,
    })
  }

  // Peer median specific yield across the fleet (weather affects all equally).
  const specYields: number[] = []
  for (const d of perDevice.values()) {
    if (d.yieldKwh != null && d.ratedKw && d.ratedKw > 0) {
      const sy = specificYield(d.yieldKwh, d.ratedKw)
      if (sy != null) specYields.push(sy)
    }
  }
  const peerMedianYield = specYields.length > 0 ? median(specYields) : null

  // Yesterday's analyses for the 2-consecutive-day guard.
  const prevDate = new Date(dateOnly.getTime() - 86_400_000)
  const prevAnalyses = await prisma.dailyAnalysis.findMany({
    where: { date: prevDate },
    select: { deviceId: true, flags: true },
  })
  const prevFlagsByDevice = new Map(prevAnalyses.map((a) => [a.deviceId, new Set(a.flags)]))

  let written = 0
  for (const device of devices) {
    const d = perDevice.get(device.id)!
    const prevFlags = prevFlagsByDevice.get(device.id) ?? new Set<string>()

    // Load & update baselines for this device's strings.
    const baselines = await prisma.stringBaseline.findMany({ where: { deviceId: device.id } })
    const baseByIdx = new Map(baselines.map((b) => [b.stringIndex, b]))

    for (const [idx, todayShare] of d.dayShareByString) {
      const todayMad = d.dayMadByString.get(idx) ?? 0
      const existing = baseByIdx.get(idx)
      if (!existing) {
        const s = summarizeShares([todayShare])
        await prisma.stringBaseline.create({
          data: { deviceId: device.id, stringIndex: idx, medianShare: todayShare, madShare: todayMad, sampleCount: Math.min(d.sampleCount, BASELINE_DAILY_SAMPLE_CAP) },
        })
        baseByIdx.set(idx, { ...s, deviceId: device.id, stringIndex: idx, id: "", updatedAt: new Date() } as never)
      } else if (
        isBaselineReady(existing) &&
        existing.medianShare > 0 &&
        todayShare / existing.medianShare < BASELINE_FAULT_RATIO
      ) {
        // Suspected fault day — keep the learned normal untouched.
        continue
      } else {
        const newMedian = existing.medianShare * (1 - BASELINE_ALPHA) + todayShare * BASELINE_ALPHA
        const newMad = existing.madShare * (1 - BASELINE_ALPHA) + todayMad * BASELINE_ALPHA
        const newCount = existing.sampleCount + Math.min(d.sampleCount, BASELINE_DAILY_SAMPLE_CAP)
        await prisma.stringBaseline.update({
          where: { id: existing.id },
          data: { medianShare: newMedian, madShare: newMad, sampleCount: newCount },
        })
      }
    }

    // Compute today's string deviations against the (pre-update) baseline.
    const baselineShares = [...baseByIdx.values()].map((b) => ({
      stringIndex: b.stringIndex,
      medianShare: b.medianShare,
      madShare: b.madShare,
    }))
    const todayCurrents = STRINGS.map((i) => d.dayShareByString.get(i) ?? null)
    const deviations = computeStringDeviations(todayCurrents, baselineShares)

    const flags: string[] = []
    const activeDaily = new Map<string, { message: string; severity: "WARNING" | "CRITICAL"; category: "STRING" | "FUSE" | "PERFORMANCE" }>()

    // FUSE — act immediately (only when the string's baseline is trusted).
    for (const f of detectFuse(deviations)) {
      const base = baseByIdx.get(f.stringIndex)
      if (!isBaselineReady(base)) continue
      flags.push(`FUSE:${f.stringIndex}:${f.signature}`)
      activeDaily.set(`FUSE_STRING_${f.stringIndex}`, {
        message: describeFuse(f),
        severity: f.signature === "OPEN" ? "CRITICAL" : "WARNING",
        category: "FUSE",
      })
    }

    // STRING imbalance — worst string beyond its dynamic threshold, needs 2 days.
    const worst = worstDeviation(deviations)
    if (worst && worst.deviationPct != null && worst.deviationPct < 0) {
      const base = baseByIdx.get(worst.stringIndex)
      if (base && isBaselineReady(base)) {
        const thr = deviationThresholdPct({ medianShare: base.medianShare, madShare: base.madShare, sampleCount: base.sampleCount })
        if (Math.abs(worst.deviationPct) > thr && !activeDaily.has(`FUSE_STRING_${worst.stringIndex}`)) {
          flags.push(`STRING_IMBALANCE:${worst.stringIndex}`)
          if (prevFlags.has(`STRING_IMBALANCE:${worst.stringIndex}`)) {
            activeDaily.set(`STRING_IMBALANCE_${worst.stringIndex}`, {
              message: `String ${worst.stringIndex} normadan ${Math.abs(worst.deviationPct).toFixed(0)}% past (2 kun ketma-ket)`,
              severity: "WARNING",
              category: "STRING",
            })
          }
        }
      }
    }

    // PERFORMANCE — low yield vs peers, needs completeness + 2 days.
    const sy = d.yieldKwh != null && d.ratedKw ? specificYield(d.yieldKwh, d.ratedKw) : null
    const perfIndex = performanceIndex(sy, peerMedianYield)
    if (perfIndex != null && perfIndex < LOW_YIELD_INDEX && d.completeness >= 80) {
      flags.push("LOW_YIELD")
      if (prevFlags.has("LOW_YIELD")) {
        activeDaily.set("LOW_YIELD", {
          message: `Ishlab chiqarish hududiy o'rtachadan ${Math.round((1 - perfIndex) * 100)}% past (2 kun ketma-ket)`,
          severity: "WARNING",
          category: "PERFORMANCE",
        })
      }
    }
    if (d.completeness < 80) flags.push("LOW_COMPLETENESS")

    await reconcileDailyAlarms(device.id, activeDaily)

    await prisma.dailyAnalysis.upsert({
      where: { deviceId_date: { deviceId: device.id, date: dateOnly } },
      update: {
        completenessPct: d.completeness,
        specificYield: sy,
        peerMedianYield,
        performanceIndex: perfIndex,
        expectedKwh: peerMedianYield != null && d.ratedKw ? peerMedianYield * d.ratedKw : null,
        actualKwh: d.yieldKwh,
        maxStringDevPct: worst?.deviationPct ?? null,
        flags,
      },
      create: {
        deviceId: device.id,
        date: dateOnly,
        completenessPct: d.completeness,
        specificYield: sy,
        peerMedianYield,
        performanceIndex: perfIndex,
        expectedKwh: peerMedianYield != null && d.ratedKw ? peerMedianYield * d.ratedKw : null,
        actualKwh: d.yieldKwh,
        maxStringDevPct: worst?.deviationPct ?? null,
        flags,
      },
    })
    written++
  }

  return written
}

const DAILY_CODE_PREFIXES = ["FUSE_STRING_", "STRING_IMBALANCE_", "LOW_YIELD"]

/** Create newly-active daily alarms and resolve cleared ones (per device). */
async function reconcileDailyAlarms(
  deviceId: string,
  active: Map<string, { message: string; severity: "WARNING" | "CRITICAL"; category: "STRING" | "FUSE" | "PERFORMANCE" }>
): Promise<void> {
  const open = await prisma.alarm.findMany({
    where: { deviceId, resolvedAt: null },
    select: { id: true, code: true },
  })
  const managedOpen = open.filter((a) => DAILY_CODE_PREFIXES.some((p) => a.code.startsWith(p)))
  const openCodes = new Set(managedOpen.map((a) => a.code))

  const toResolve = managedOpen.filter((a) => !active.has(a.code)).map((a) => a.id)
  if (toResolve.length > 0) {
    await prisma.alarm.updateMany({ where: { id: { in: toResolve } }, data: { resolvedAt: new Date() } })
  }
  for (const [code, a] of active) {
    if (openCodes.has(code)) continue
    await prisma.alarm.create({
      data: { deviceId, code, message: a.message, severity: a.severity, category: a.category },
    })
  }
}

export { MIN_BASELINE_SAMPLES }
