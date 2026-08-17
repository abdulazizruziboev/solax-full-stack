import "server-only"
import { unstable_cache } from "next/cache"
import { prisma } from "@solax/db"
import type { DeviceCreateInput, DeviceImportRow } from "@solax/shared"

export async function listDevicesWithLatestReading() {
  const devices = await prisma.device.findMany({
    orderBy: { name: "asc" },
    include: {
      readings: {
        orderBy: { ts: "desc" },
        take: 1,
      },
    },
  })

  return devices.map((device) => ({
    id: device.id,
    sn: device.sn,
    inverterSn: device.inverterSn,
    name: device.name,
    tokenId: device.tokenId,
    plantName: device.plantName,
    status: device.status,
    lastSeenAt: device.lastSeenAt,
    latestReading: device.readings[0] ?? null,
  }))
}

export interface ListDevicesOptions {
  page?: number
  limit?: number
  query?: string
  status?: string
  sortField?: "name" | "power" | "yield" | "lastSeen"
  sortDir?: "asc" | "desc"
}

export async function listDevicesPaginated(options: ListDevicesOptions = {}) {
  try {
    const page = Math.max(1, options.page ?? 1)
    const limit = Math.max(1, Math.min(100, options.limit ?? 20))
    const skip = (page - 1) * limit
    const q = options.query?.trim()
    const statusFilter = options.status && options.status !== "ALL" ? options.status : undefined

    const where: Record<string, unknown> = {}
    if (statusFilter) {
      where.status = statusFilter
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sn: { contains: q, mode: "insensitive" } },
        { plantName: { contains: q, mode: "insensitive" } },
      ]
    }

    const total = await prisma.device.count({ where })

    const devices = await prisma.device.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        options.sortField === "lastSeen"
          ? { lastSeenAt: options.sortDir ?? "desc" }
          : { name: options.sortDir ?? "asc" },
    })

    const deviceIds = devices.map((d) => d.id)
    let latestReadingsMap = new Map<string, any>()

    if (deviceIds.length > 0) {
      try {
        const latestReadings = await prisma.reading.findMany({
          where: { deviceId: { in: deviceIds } },
          orderBy: [{ deviceId: "asc" }, { ts: "desc" }],
          distinct: ["deviceId"],
          select: { deviceId: true, acPower: true, yieldToday: true, ts: true },
        })
        for (const r of latestReadings) {
          latestReadingsMap.set(r.deviceId, r)
        }
      } catch (err) {
        console.error("latestReadings fetch error:", err)
      }
    }

    const mapped = devices.map((device) => ({
      id: device.id,
      sn: device.sn,
      inverterSn: device.inverterSn,
      name: device.name,
      tokenId: device.tokenId,
      plantName: device.plantName,
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      latestReading: latestReadingsMap.get(device.id) ?? null,
    }))

    if (options.sortField === "power" || options.sortField === "yield") {
      const dir = options.sortDir === "asc" ? 1 : -1
      mapped.sort((a, b) => {
        const av =
          options.sortField === "power"
            ? (a.latestReading?.acPower ?? -1)
            : (a.latestReading?.yieldToday ?? -1)
        const bv =
          options.sortField === "power"
            ? (b.latestReading?.acPower ?? -1)
            : (b.latestReading?.yieldToday ?? -1)
        return (av - bv) * dir
      })
    }

    const hasMore = skip + devices.length < total

    return {
      devices: mapped,
      total,
      page,
      limit,
      hasMore,
    }
  } catch (err) {
    console.error("listDevicesPaginated error:", err)
    return {
      devices: [],
      total: 0,
      page: 1,
      limit: options.limit ?? 20,
      hasMore: false,
    }
  }
}

export const getDashboardStats = unstable_cache(
  async () => {
    try {
      const [statusCounts, alarmCount, aggregate] = await Promise.all([
        prisma.device.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.alarm.count({ where: { resolvedAt: null } }),
        prisma.$queryRaw<
          { total_ac_power: number | null; total_yield_today: number | null }[]
        >`
          SELECT
            SUM("acPower") AS total_ac_power,
            SUM("yieldToday") AS total_yield_today
          FROM (
            SELECT DISTINCT ON ("deviceId") "acPower", "yieldToday"
            FROM readings
            WHERE ts > NOW() - INTERVAL '48 hours'
            ORDER BY "deviceId", ts DESC
          ) latest
        `,
      ])

      const byStatus = Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count._all])
      ) as Record<string, number>

      const online = byStatus.ONLINE ?? 0
      const offline = byStatus.OFFLINE ?? 0
      const alarm = byStatus.ALARM ?? 0
      const unknown = byStatus.UNKNOWN ?? 0

      return {
        total: online + offline + alarm + unknown,
        online,
        offline,
        alarm,
        unknown,
        activeAlarms: alarmCount,
        totalAcPowerW: aggregate[0]?.total_ac_power ?? 0,
        totalYieldTodayKwh: aggregate[0]?.total_yield_today ?? 0,
      }
    } catch (err) {
      console.error("getDashboardStats error:", err)
      return {
        total: 0,
        online: 0,
        offline: 0,
        alarm: 0,
        unknown: 0,
        activeAlarms: 0,
        totalAcPowerW: 0,
        totalYieldTodayKwh: 0,
      }
    }
  },
  ["dashboard-stats"],
  { revalidate: 10 }
)

// Start of "today" in Uzbekistan (UTC+5) — inverters reset yieldToday at
// their local midnight, so day-scoped aggregates must use this boundary.
function uzDayStart(): Date {
  const UZ_OFFSET_MS = 5 * 60 * 60 * 1000
  const uzNow = new Date(Date.now() + UZ_OFFSET_MS)
  return new Date(
    Date.UTC(uzNow.getUTCFullYear(), uzNow.getUTCMonth(), uzNow.getUTCDate()) - UZ_OFFSET_MS
  )
}

/**
 * Fleet-wide AC power over the last `hours`, in 30-minute buckets.
 */
export const getFleetPowerCurve = unstable_cache(
  async (hours = 24) => {
    try {
      const rows = await prisma.$queryRaw<{ bucket: Date; total_w: number }[]>`
        SELECT bucket, SUM(avg_w)::float AS total_w
        FROM (
          SELECT
            to_timestamp(floor(extract(epoch FROM ts) / 1800) * 1800) AS bucket,
            "deviceId",
            AVG("acPower") AS avg_w
          FROM readings
          WHERE ts > NOW() - make_interval(hours => ${hours}::int)
            AND "acPower" IS NOT NULL
          GROUP BY 1, 2
        ) per_device
        GROUP BY bucket
        ORDER BY bucket
      `

      return rows.map((r) => ({ ts: r.bucket.toISOString(), totalW: r.total_w }))
    } catch (err) {
      console.error("getFleetPowerCurve error:", err)
      return []
    }
  },
  ["fleet-power-curve"],
  { revalidate: 15 }
)

/** Today's most productive devices (by max yieldToday since UZ midnight). */
export const getTopProducersToday = unstable_cache(
  async (limit = 5) => {
    try {
      const dayStart = uzDayStart()
      return await prisma.$queryRaw<
        { name: string; sn: string; yield_kwh: number | null; peak_w: number | null }[]
      >`
        SELECT d.name, d.sn,
               r."yieldToday"::float AS yield_kwh,
               r."acPower"::float AS peak_w
        FROM (
          SELECT DISTINCT ON ("deviceId") "deviceId", "yieldToday", "acPower"
          FROM readings
          WHERE ts >= ${dayStart} AND "yieldToday" IS NOT NULL
          ORDER BY "deviceId", "yieldToday" DESC
        ) r
        JOIN devices d ON d.id = r."deviceId"
        ORDER BY yield_kwh DESC
        LIMIT ${limit}
      `
    } catch (err) {
      console.error("getTopProducersToday error:", err)
      return []
    }
  },
  ["top-producers-today"],
  { revalidate: 15 }
)

export async function createDevice(input: DeviceCreateInput) {
  return prisma.device.create({
    data: {
      sn: input.sn,
      inverterSn: input.inverterSn || null,
      tokenId: input.tokenId || null,
      name: input.name,
      plantName: input.plantName || null,
    },
  })
}

export async function updateDevice(currentSn: string, input: DeviceCreateInput) {
  return prisma.device.update({
    where: { sn: currentSn },
    data: {
      sn: input.sn,
      inverterSn: input.inverterSn || null,
      tokenId: input.tokenId || null,
      name: input.name,
      plantName: input.plantName || null,
    },
  })
}

export async function deleteDevice(sn: string) {
  return prisma.device.delete({ where: { sn } })
}

export async function importDevices(rows: DeviceImportRow[]) {
  const results = { created: 0, skipped: 0, errors: [] as string[] }

  for (const row of rows) {
    try {
      await prisma.device.upsert({
        where: { sn: row.sn },
        update: {
          name: row.name,
          inverterSn: row.inverterSn || null,
          plantName: row.plantName || null,
          tokenId: row.tokenId || null,
        },
        create: {
          sn: row.sn,
          inverterSn: row.inverterSn || null,
          name: row.name,
          plantName: row.plantName || null,
          tokenId: row.tokenId || null,
        },
      })
      results.created += 1
    } catch (err) {
      results.skipped += 1
      results.errors.push(`${row.sn}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return results
}

// Least-squares slope of y over x — small inline copy so the web app needn't
// import the worker's analysis package just to draw a trend arrow.
function slope(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 2) return 0
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

/**
 * Layer 3/4 analytics for one device: the latest daily analysis, the learned
 * string baselines, and a soiling/degradation trend derived from the recent
 * performance-index history. Returns null when the device is unknown.
 */
export async function getDeviceAnalysis(sn: string) {
  const device = await prisma.device.findUnique({ where: { sn }, select: { id: true } })
  if (!device) return null

  const [history, baselines] = await Promise.all([
    prisma.dailyAnalysis.findMany({
      where: { deviceId: device.id },
      orderBy: { date: "desc" },
      take: 60,
    }),
    prisma.stringBaseline.findMany({
      where: { deviceId: device.id },
      orderBy: { stringIndex: "asc" },
    }),
  ])

  const latest = history[0] ?? null

  // Trend: slope of performance index over the last N days (peer-relative, so
  // weather cancels out). Negative slope ≈ gradual soiling/degradation.
  const perfPoints = history
    .filter((h) => h.performanceIndex != null)
    .map((h, i) => ({ x: history.length - i, y: h.performanceIndex! }))
  const trendSlope = perfPoints.length >= 5 ? slope(perfPoints) : null

  return { latest, history, baselines, trendSlope, historyDays: history.length }
}

export async function getDeviceReadings(sn: string, hours = 24) {
  const device = await prisma.device.findUnique({ where: { sn } })
  if (!device) return null

  const readings = await prisma.reading.findMany({
    where: {
      deviceId: device.id,
      ts: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
    },
    orderBy: { ts: "asc" },
  })

  const alarms = await prisma.alarm.findMany({
    where: { deviceId: device.id },
    orderBy: { ts: "desc" },
    take: 20,
  })

  return { device, readings, alarms }
}

export async function listAlarms(onlyUnresolved = true) {
  return prisma.alarm.findMany({
    where: onlyUnresolved ? { resolvedAt: null } : undefined,
    orderBy: { ts: "desc" },
    take: 200,
    include: { device: { select: { name: true, sn: true } } },
  })
}

// Collapses the flood of identical open alarms into one entry per
// (code, message, severity), with the count of affected devices and a few
// example device names for context.
export async function listGroupedAlarms() {
  const alarms = await prisma.alarm.findMany({
    where: { resolvedAt: null },
    orderBy: { ts: "desc" },
    include: { device: { select: { name: true, sn: true } } },
  })

  const groups = new Map<
    string,
    {
      code: string
      message: string
      severity: string
      category: string
      count: number
      latestTs: Date
      sampleDevices: { name: string; sn: string }[]
    }
  >()

  for (const a of alarms) {
    const key = `${a.code}::${a.message}`
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      if (existing.sampleDevices.length < 4) {
        existing.sampleDevices.push({ name: a.device.name, sn: a.device.sn })
      }
      if (a.ts > existing.latestTs) existing.latestTs = a.ts
    } else {
      groups.set(key, {
        code: a.code,
        message: a.message,
        severity: a.severity,
        category: a.category,
        count: 1,
        latestTs: a.ts,
        sampleDevices: [{ name: a.device.name, sn: a.device.sn }],
      })
    }
  }

  const order = { CRITICAL: 0, WARNING: 1, INFO: 2 } as Record<string, number>
  return [...groups.values()].sort(
    (a, b) =>
      (order[a.severity] ?? 3) - (order[b.severity] ?? 3) || b.count - a.count
  )
}

// Resolving an alarm acknowledges the issue; the device is no longer in a
// known-bad state, but we also have no fresh reading — so reset any ALARM
// devices to UNKNOWN until the next poll determines their real status.
export async function resolveAlarmsByCode(code: string) {
  const affected = await prisma.alarm.findMany({
    where: { code, resolvedAt: null },
    select: { deviceId: true },
    distinct: ["deviceId"],
  })
  const deviceIds = affected.map((a) => a.deviceId)

  const [result] = await prisma.$transaction([
    prisma.alarm.updateMany({
      where: { code, resolvedAt: null },
      data: { resolvedAt: new Date() },
    }),
    prisma.device.updateMany({
      where: { id: { in: deviceIds }, status: "ALARM" },
      data: { status: "UNKNOWN" },
    }),
  ])
  return result.count
}

export async function resolveAllAlarms() {
  const [result] = await prisma.$transaction([
    prisma.alarm.updateMany({
      where: { resolvedAt: null },
      data: { resolvedAt: new Date() },
    }),
    prisma.device.updateMany({
      where: { status: "ALARM" },
      data: { status: "UNKNOWN" },
    }),
  ])
  return result.count
}

export async function countActiveAlarms() {
  return prisma.alarm.count({ where: { resolvedAt: null } })
}

export async function listDailySummaries(limitDays = 14) {
  const since = new Date()
  since.setDate(since.getDate() - limitDays)
  since.setHours(0, 0, 0, 0)

  return prisma.dailySummary.findMany({
    where: { date: { gte: since } },
    orderBy: [{ date: "desc" }, { device: { name: "asc" } }],
    include: { device: { select: { name: true, sn: true } } },
  })
}

// Today's date in Uzbekistan (UTC+5), as a "YYYY-MM-DD" string. The daily
// summary `date` column stores UTC-midnight of the UZ calendar day, so this
// string maps directly onto a stored row.
export function uzTodayStr(): string {
  const UZ_OFFSET_MS = 5 * 60 * 60 * 1000
  return new Date(Date.now() + UZ_OFFSET_MS).toISOString().slice(0, 10)
}

/** All device summaries for one calendar day ("YYYY-MM-DD"). */
export async function listDailySummariesForDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`)
  return prisma.dailySummary.findMany({
    where: { date },
    orderBy: { device: { name: "asc" } },
    include: { device: { select: { name: true, sn: true } } },
  })
}

/** Distinct dates ("YYYY-MM-DD") that have at least one summary, newest first. */
export async function listReportDates(limit = 60): Promise<string[]> {
  const rows = await prisma.dailySummary.findMany({
    distinct: ["date"],
    orderBy: { date: "desc" },
    select: { date: true },
    take: limit,
  })
  return rows.map((r) => r.date.toISOString().slice(0, 10))
}
