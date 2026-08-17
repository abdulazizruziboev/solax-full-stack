// Whether a SolaxCloud reading is "fresh" (the inverter is actually online).
// SolaxCloud returns the last-known values with an OLD timestamp for offline
// inverters, so a successful API response does NOT mean the device is online —
// the data timestamp does. This mirrors how the SolaxCloud portal itself marks
// plants offline.

import type { SolaxRealtime } from "@solax/shared"

/** Epoch ms of the reading's own timestamp, or null if unparseable. */
export function readingTimestampMs(reading: SolaxRealtime): number | null {
  const raw = reading as unknown as Record<string, unknown>

  // Preferred: explicit UTC field.
  const utc = raw.utcDateTime
  if (typeof utc === "string") {
    const t = Date.parse(utc)
    if (!Number.isNaN(t)) return t
  }

  // Fallback: uploadTime is "YYYY-MM-DD HH:mm:ss" in Uzbekistan local time
  // (UTC+5, no DST). Make it explicit so the server timezone doesn't matter.
  const up = raw.uploadTime
  if (typeof up === "string") {
    const t = Date.parse(up.replace(" ", "T") + "+05:00")
    if (!Number.isNaN(t)) return t
  }

  return null
}

/**
 * True when the reading is recent enough that the inverter counts as online.
 * When the timestamp can't be determined, we err toward online (assume fresh)
 * rather than falsely reporting a working plant as offline.
 */
export function isReadingFresh(reading: SolaxRealtime, staleMinutes: number): boolean {
  const ts = readingTimestampMs(reading)
  if (ts == null) return true
  const ageMinutes = (Date.now() - ts) / 60_000
  return ageMinutes <= staleMinutes
}
