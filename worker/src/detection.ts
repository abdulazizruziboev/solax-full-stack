// Live detection (layers 1 & 2), run on every successful poll. Turns binary
// checks and the frozen-sensor check into categorized alarms, reconciling each
// code: create when the condition appears, resolve when it clears. Returns the
// alarms created this cycle so the caller can notify the operator.

import { prisma } from "@solax/db"
import type { SolaxRealtime } from "@solax/shared"
import { runBinaryChecks, type BinaryFinding } from "./analysis/binaryChecks.js"
import { isFrozen } from "./analysis/dataQuality.js"
import { isProductiveDaytime } from "./sunset.js"

type AlarmCategory = "SYSTEM" | "DATA_QUALITY" | "PERFORMANCE" | "STRING" | "FUSE"
type AlarmSeverity = "INFO" | "WARNING" | "CRITICAL"

interface CreatedAlarm {
  deviceId: string
  code: string
  message: string
  severity: AlarmSeverity
  category: AlarmCategory
}

// How many recent readings to inspect for a frozen (stuck) AC-power value.
const FROZEN_LOOKBACK = 6

// Alarm codes owned by live detection. The processor leaves these alone on a
// successful poll (detection reconciles them itself) and only auto-resolves the
// offline/API-error alarms produced by the failure path.
export const LIVE_DETECTION_CODES = [
  "ZERO_CURRENT_DAY",
  "VOLTAGE_LOW",
  "VOLTAGE_HIGH",
  "INVERTER_FAULT",
  "FROZEN_SENSOR",
] as const

function num(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key]
  return typeof v === "number" ? v : null
}

/**
 * Resolve all open live-detection alarms for a device — used when the device is
 * offline/stale, where its frozen zero data would otherwise trigger false
 * ZERO_CURRENT_DAY / FROZEN alarms. Offline is a status, not a fault alarm.
 */
export async function resolveDetectionAlarms(deviceId: string): Promise<void> {
  await prisma.alarm.updateMany({
    where: { deviceId, resolvedAt: null, code: { in: [...LIVE_DETECTION_CODES] } },
    data: { resolvedAt: new Date() },
  })
}

/**
 * Reconcile the live-check alarms for one device against the latest reading.
 * Each code is create-if-present / resolve-if-absent, so alarms clear
 * automatically once the underlying issue goes away.
 */
export async function runLiveDetection(
  deviceId: string,
  reading: SolaxRealtime
): Promise<CreatedAlarm[]> {
  const raw = reading as unknown as Record<string, unknown>
  const day = isProductiveDaytime()

  const findings = runBinaryChecks({
    acPowerW: reading.acpower ?? null,
    ratedPowerKw: num(raw, "ratedPower"),
    vac: [num(raw, "vac1"), num(raw, "vac2"), num(raw, "vac3")],
    inverterStatus: reading.inverterStatus ?? null,
    isDaytime: day,
  })

  // Frozen AC power (layer 1) — only meaningful in daylight when it should move.
  let frozen = false
  if (day) {
    const recent = await prisma.reading.findMany({
      where: { deviceId },
      orderBy: { ts: "desc" },
      take: FROZEN_LOOKBACK,
      select: { acPower: true },
    })
    frozen = isFrozen(recent.map((r) => r.acPower), FROZEN_LOOKBACK)
  }

  // Map findings → the set of active codes with their alarm metadata.
  const active = new Map<string, CreatedAlarm>()
  const add = (code: string, category: AlarmCategory, severity: AlarmSeverity, message: string) =>
    active.set(code, { deviceId, code, category, severity, message })

  for (const f of findings) addBinary(deviceId, f, add)
  if (frozen) {
    add(
      "FROZEN_SENSOR",
      "DATA_QUALITY",
      "WARNING",
      "Ma'lumot muzlagan — quvvat qiymati o'zgarmayapti (sensor/API nosozligi ehtimoli)"
    )
  }

  return reconcile(deviceId, active, [...LIVE_DETECTION_CODES])
}

function addBinary(
  _deviceId: string,
  f: BinaryFinding,
  add: (code: string, c: AlarmCategory, s: AlarmSeverity, m: string) => void
) {
  switch (f.code) {
    case "ZERO_CURRENT_DAY":
      add("ZERO_CURRENT_DAY", "SYSTEM", "CRITICAL", "Kunduzi ishlab chiqarish nol — invertor yoki AC tomonда nosozlik")
      break
    case "INVERTER_FAULT":
      add("INVERTER_FAULT", "SYSTEM", "CRITICAL", `Invertor xato holati (kod ${f.status})`)
      break
    case "VOLTAGE_LOW":
      add("VOLTAGE_LOW", "SYSTEM", "WARNING", `Tarmoq kuchlanishi past: ${f.value.toFixed(0)} V`)
      break
    case "VOLTAGE_HIGH":
      add("VOLTAGE_HIGH", "SYSTEM", "WARNING", `Tarmoq kuchlanishi yuqori: ${f.value.toFixed(0)} V`)
      break
  }
}

/**
 * Create newly-active alarms (deduped against an already-open one) and resolve
 * any managed code that is no longer active. Only touches the `managedCodes`
 * this detector owns, leaving SYSTEM/offline and daily-analysis alarms alone.
 */
async function reconcile(
  deviceId: string,
  active: Map<string, CreatedAlarm>,
  managedCodes: string[]
): Promise<CreatedAlarm[]> {
  const open = await prisma.alarm.findMany({
    where: { deviceId, resolvedAt: null, code: { in: managedCodes } },
    select: { id: true, code: true },
  })
  const openCodes = new Set(open.map((a) => a.code))

  // Resolve managed alarms whose condition has cleared.
  const toResolve = open.filter((a) => !active.has(a.code)).map((a) => a.id)
  if (toResolve.length > 0) {
    await prisma.alarm.updateMany({
      where: { id: { in: toResolve } },
      data: { resolvedAt: new Date() },
    })
  }

  // Create alarms for newly-active codes.
  const created: CreatedAlarm[] = []
  for (const [code, a] of active) {
    if (openCodes.has(code)) continue
    await prisma.alarm.create({
      data: { deviceId, code, message: a.message, severity: a.severity, category: a.category },
    })
    created.push(a)
  }
  return created
}
