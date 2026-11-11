import * as SunCalc from "suncalc"

// Tashkent coordinates — used as the reference sunset time for all of
// Uzbekistan (the country spans a single time zone and ~4-5 degrees of
// longitude, so sunset times differ by only a few minutes edge to edge).
const UZ_LAT = 41.2995
const UZ_LON = 69.2401

// Uzbekistan uses a fixed UTC+5 offset year-round (no DST).
const UZ_UTC_OFFSET_HOURS = 5

export interface UzDayBounds {
  /** Real-world instant of 00:00 Uzbekistan time — use to filter timestamps. */
  start: Date
  /** Real-world instant of the following 00:00 Uzbekistan time (exclusive). */
  end: Date
  /**
   * UTC-midnight Date carrying the same Y-M-D as the Uzbekistan calendar
   * day. Use this (not `start`) for a Postgres `@db.Date` column, since
   * that column drops the time/offset and keeps only the UTC date part —
   * passing `start` there would shift the stored date back by one day.
   */
  dateOnly: Date
}

/**
 * Resolves the Uzbekistan calendar day (UTC+5, no DST) that `instant`
 * falls on — independent of whatever timezone the server process runs in.
 */
export function getUzDayBounds(instant: Date): UzDayBounds {
  const uzMs = instant.getTime() + UZ_UTC_OFFSET_HOURS * 60 * 60 * 1000
  const uzMidnightMs = Math.floor(uzMs / 86_400_000) * 86_400_000

  return {
    start: new Date(uzMidnightMs - UZ_UTC_OFFSET_HOURS * 60 * 60 * 1000),
    end: new Date(uzMidnightMs - UZ_UTC_OFFSET_HOURS * 60 * 60 * 1000 + 86_400_000),
    dateOnly: new Date(uzMidnightMs),
  }
}

/**
 * True when `instant` is between sunrise and sunset at the Uzbekistan
 * reference location — used to gate daylight-only checks (zero-current,
 * string/fuse analysis) so night-time zeros aren't treated as faults.
 */
export function isDaytime(instant: Date = new Date()): boolean {
  const times = SunCalc.getTimes(instant, UZ_LAT, UZ_LON)
  const sunrise = times.sunrise
  const sunset = times.sunset
  if (!sunrise || !sunset) return true // polar edge case — never in Uzbekistan
  return instant.getTime() > sunrise.getTime() && instant.getTime() < sunset.getTime()
}

/**
 * True when the sun is high enough (default ≥10° above the horizon) for an
 * inverter to be genuinely producing. Near sunrise/sunset inverters legitimately
 * output ~0 W for the first/last stretch of "daytime", so zero-power and
 * frozen-value checks use this stricter window to avoid false CRITICAL alarms.
 */
export function isProductiveDaytime(instant: Date = new Date(), minAltitudeDeg = 10): boolean {
  // suncalc v2 reports altitude in degrees (v1 used radians).
  const { altitude } = SunCalc.getPosition(instant, UZ_LAT, UZ_LON)
  return altitude >= minAltitudeDeg
}

export function getSunsetTime(date: Date): Date {
  const sunset = SunCalc.getTimes(date, UZ_LAT, UZ_LON).sunset
  // Uzbekistan's latitude (~41°N) never hits polar day/night, so sunset is
  // always defined in practice; the fallback just satisfies the type and
  // guards against an unexpected library edge case.
  if (sunset) return sunset

  const fallback = new Date(date)
  fallback.setHours(19, 0, 0, 0)
  return fallback
}

/**
 * Returns the next sunset instant strictly after `from`. If today's sunset
 * has already passed, returns tomorrow's sunset.
 */
export function getNextSunset(from: Date = new Date()): Date {
  const todaySunset = getSunsetTime(from)
  if (todaySunset.getTime() > from.getTime()) {
    return todaySunset
  }

  const tomorrow = new Date(from)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getSunsetTime(tomorrow)
}
