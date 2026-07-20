import { z } from "zod"

export const deviceCreateSchema = z.object({
  // Registration No (Wi-Fi/LAN dongle SN) — this is what SolaxCloud's API needs.
  sn: z.string().trim().min(4, "Registratsiya raqami juda qisqa"),
  inverterSn: z.string().trim().optional().or(z.literal("")),
  tokenId: z.string().trim().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Nom kiritilishi shart"),
  plantName: z.string().trim().optional().or(z.literal("")),
})

export type DeviceCreateInput = z.infer<typeof deviceCreateSchema>

export const deviceImportRowSchema = z.object({
  sn: z.string().trim().min(4),
  inverterSn: z.string().trim().optional().default(""),
  tokenId: z.string().trim().optional().default(""),
  name: z.string().trim().min(1),
  plantName: z.string().trim().optional().default(""),
})

export type DeviceImportRow = z.infer<typeof deviceImportRowSchema>

export const deviceStatusValues = ["ONLINE", "OFFLINE", "ALARM", "UNKNOWN"] as const
export type DeviceStatusValue = (typeof deviceStatusValues)[number]

export const alarmSeverityValues = ["INFO", "WARNING", "CRITICAL"] as const
export type AlarmSeverityValue = (typeof alarmSeverityValues)[number]

// Shape of the normalized SolaxCloud realtime response we persist.
// `.passthrough()` keeps EVERY field SolaxCloud returns (1:1), so nothing is
// dropped even if Solax adds new keys; the explicit fields below are just the
// ones we type/use directly. Nullable+optional because coverage varies by
// inverter model (e.g. non-battery units return null battery fields).
const solaxNum = z.number().nullable().optional()
const solaxStr = z.string().nullable().optional()

export const solaxRealtimeSchema = z
  .object({
    inverterSN: z.string(),
    sn: solaxStr,
    inverterSn: solaxStr,
    ratedPower: solaxNum,
    // Core power / yield
    acpower: solaxNum,
    yieldtoday: solaxNum,
    yieldtotal: solaxNum,
    feedinpower: solaxNum,
    gridpower: solaxNum,
    feedinenergy: solaxNum,
    consumeenergy: solaxNum,
    // Temperature
    temperature: solaxNum,
    temperBoard: solaxNum,
    // DC (PV strings)
    powerdc1: solaxNum,
    powerdc2: solaxNum,
    powerdc3: solaxNum,
    powerdc4: solaxNum,
    vdc1: solaxNum,
    vdc2: solaxNum,
    vdc3: solaxNum,
    vdc4: solaxNum,
    idc1: solaxNum,
    idc2: solaxNum,
    idc3: solaxNum,
    idc4: solaxNum,
    // AC (per phase)
    pac1: solaxNum,
    pac2: solaxNum,
    pac3: solaxNum,
    vac1: solaxNum,
    vac2: solaxNum,
    vac3: solaxNum,
    iac1: solaxNum,
    iac2: solaxNum,
    iac3: solaxNum,
    fac1: solaxNum,
    fac2: solaxNum,
    fac3: solaxNum,
    // Battery
    soc: solaxNum,
    batPower: solaxNum,
    batVoltage: solaxNum,
    batCurrent: solaxNum,
    battemper: solaxNum,
    batStatus: solaxStr,
    // Meta
    inverterType: solaxStr,
    inverterStatus: solaxStr,
    powerFactor: solaxNum,
    soh: solaxNum,
    timeZone: solaxStr,
    uploadTime: solaxStr,
    utcDateTime: solaxStr,
  })
  .passthrough()

export type SolaxRealtime = z.infer<typeof solaxRealtimeSchema>

export const loginSchema = z.object({
  email: z.string().trim().email("Email noto'g'ri"),
  password: z.string().min(6, "Parol kamida 6 belgi"),
})

export type LoginInput = z.infer<typeof loginSchema>

// Maps SolaxCloud API error codes / raw exceptions to friendly Uzbek text
// and a severity, so alarms read clearly instead of showing raw API strings.
export function humanizeSolaxError(
  code: string | undefined,
  rawMessage: string
): { message: string; severity: AlarmSeverityValue } {
  const normalized = rawMessage.trim().toLowerCase()

  if (code === "103" || normalized.includes("token invalid")) {
    return {
      message: "SolaxCloud tokeni yaroqsiz — sozlamalardagi tokenId'ni tekshiring",
      severity: "CRITICAL",
    }
  }
  if (normalized.includes("registration") || normalized.includes("sn") && normalized.includes("not")) {
    return {
      message: "Qurilma SN (registratsiya raqami) SolaxCloud'da topilmadi",
      severity: "WARNING",
    }
  }
  if (
    code === "REQUEST_FAILED" ||
    normalized.includes("timeout") ||
    normalized.includes("http")
  ) {
    return {
      message: "SolaxCloud serveriga ulanib bo'lmadi (tarmoq yoki server xatosi)",
      severity: "WARNING",
    }
  }
  if (normalized.includes("frequent") || normalized.includes("limit")) {
    return {
      message: "So'rovlar juda tez-tez yuborilmoqda (rate limit)",
      severity: "INFO",
    }
  }

  return { message: rawMessage, severity: "WARNING" }
}
