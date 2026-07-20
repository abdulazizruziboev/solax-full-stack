// Layer 3 (specific yield, peer comparison) + Layer 4 (performance ratio,
// soiling & degradation trends). Pure functions; the callers supply the data.

import { linearSlope, mean, movingAverage } from "./stats.js"

/** Daily energy per installed kWp — the size-normalized yardstick (kWh/kWp). */
export function specificYield(yieldKwh: number, ratedKw: number): number | null {
  if (ratedKw <= 0) return null
  return yieldKwh / ratedKw
}

/**
 * A device's specific yield relative to its peer group's median for the day.
 * 1.0 = at par, <1 = under-producing versus similar plants. Peer-relative, so
 * it needs no irradiance data — weather affects the whole group equally.
 */
export function performanceIndex(
  deviceSpecificYield: number | null,
  peerMedianYield: number | null
): number | null {
  if (deviceSpecificYield == null || peerMedianYield == null || peerMedianYield <= 0) {
    return null
  }
  return deviceSpecificYield / peerMedianYield
}

/** Expected energy from the peer-median specific yield and this plant's size. */
export function expectedFromPeers(peerMedianYield: number, ratedKw: number): number {
  return peerMedianYield * ratedKw
}

/**
 * Performance Ratio — actual energy over the theoretical maximum for the
 * received irradiance: PR = Yield / (H · kWp), with H in kWh/m² and the
 * reference irradiance 1 kW/m². Typically 0.75–0.85; needs an irradiance
 * source (e.g. NASA POWER). Returns null when irradiance is unavailable.
 */
export function performanceRatio(
  actualKwh: number,
  irradianceKwhPerM2: number | null,
  ratedKw: number
): number | null {
  if (irradianceKwhPerM2 == null || irradianceKwhPerM2 <= 0 || ratedKw <= 0) return null
  return actualKwh / (irradianceKwhPerM2 * ratedKw)
}

/**
 * Soiling signal: slope (per day) of the 7-day moving average of a daily
 * performance series. A steady negative slope that resets after rain is the
 * classic soiling pattern. Returns slope in series-units per day.
 */
export function soilingSlopePerDay(dailySeries: number[], window = 7): number {
  if (dailySeries.length < 2) return 0
  const ma = movingAverage(dailySeries, window)
  return linearSlope(ma.map((y, x) => ({ x, y })))
}

/**
 * Annualized degradation from a series of periodic PR (or performance-index)
 * points: slope per day × 365, expressed as % of the mean. Only meaningful
 * over long spans (≥1 year). Negative = degrading.
 */
export function degradationPctPerYear(points: { dayIndex: number; value: number }[]): number | null {
  if (points.length < 2) return null
  const m = mean(points.map((p) => p.value))
  if (m === 0) return null
  const slopePerDay = linearSlope(points.map((p) => ({ x: p.dayIndex, y: p.value })))
  return (slopePerDay * 365 / m) * 100
}
