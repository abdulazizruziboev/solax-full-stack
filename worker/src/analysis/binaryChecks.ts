// Layer 2 — fast binary checks. No statistics: each returns a clear yes/no on a
// single reading so a serious fault is caught within one poll cycle. Pure and
// side-effect-free; the processor turns positive results into categorized alarms.

export interface BinaryReading {
  acPowerW: number | null
  ratedPowerKw: number | null
  vac: (number | null)[] // phase voltages, any of vac1..3
  inverterStatus: string | null
  isDaytime: boolean // caller decides using sunrise/sunset
}

export type BinaryFinding =
  | { code: "ZERO_CURRENT_DAY"; severity: "CRITICAL" }
  | { code: "VOLTAGE_LOW"; severity: "WARNING"; value: number }
  | { code: "VOLTAGE_HIGH"; severity: "WARNING"; value: number }
  | { code: "INVERTER_FAULT"; severity: "CRITICAL"; status: string }

// SolaxCloud inverterStatus codes that mean a genuine fault/permission-loss
// (not normal running/idle). 103 = fault, 104 = permission.
const FAULT_STATUS = new Set(["103", "104"])

// Grid voltage acceptance band (V). Outside this the inverter is likely to
// derate or trip; a persistent excursion is worth an operator's attention.
const V_MIN = 180
const V_MAX = 260

// A producing daytime inverter should show power; treat anything below this as
// effectively zero (accounts for sensor noise near zero).
const ZERO_POWER_W = 5

export function runBinaryChecks(r: BinaryReading): BinaryFinding[] {
  const findings: BinaryFinding[] = []

  if (r.inverterStatus && FAULT_STATUS.has(r.inverterStatus)) {
    findings.push({ code: "INVERTER_FAULT", severity: "CRITICAL", status: r.inverterStatus })
  }

  // Zero output in daylight on a sized inverter → likely tripped/offline string
  // set or AC-side fault. Only meaningful when we know it's day and rated > 0.
  if (
    r.isDaytime &&
    (r.ratedPowerKw ?? 0) > 0 &&
    r.acPowerW != null &&
    r.acPowerW < ZERO_POWER_W
  ) {
    findings.push({ code: "ZERO_CURRENT_DAY", severity: "CRITICAL" })
  }

  // Voltage band — report the worst offending phase only.
  const voltages = r.vac.filter((v): v is number => v != null && v > 0)
  if (voltages.length > 0) {
    const lo = Math.min(...voltages)
    const hi = Math.max(...voltages)
    if (lo < V_MIN) findings.push({ code: "VOLTAGE_LOW", severity: "WARNING", value: lo })
    else if (hi > V_MAX) findings.push({ code: "VOLTAGE_HIGH", severity: "WARNING", value: hi })
  }

  return findings
}
