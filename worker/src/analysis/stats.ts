// Small, dependency-free statistics helpers used across the analysis layers.
// Kept pure and separately tested so the detection logic on top is trustworthy.

/** Arithmetic mean of the numbers; 0 for an empty list. */
export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

/** Median; 0 for an empty list. Does not mutate the input. */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

/**
 * Median Absolute Deviation — a robust (outlier-resistant) spread measure.
 * Scaled by 1.4826 so it approximates the standard deviation for normal data.
 */
export function mad(xs: number[]): number {
  if (xs.length === 0) return 0
  const m = median(xs)
  const absDev = xs.map((x) => Math.abs(x - m))
  return median(absDev) * 1.4826
}

/** Clamp v into [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Least-squares slope of y over x (units: y per unit x). Returns 0 when there
 * are fewer than two points or x has no spread. Used for soiling/degradation
 * trends where the sign and magnitude of the slope carry the signal.
 */
export function linearSlope(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 2) return 0
  const mx = mean(points.map((p) => p.x))
  const my = mean(points.map((p) => p.y))
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

/** Trailing simple moving average; window is clamped to the series length. */
export function movingAverage(series: number[], window: number): number[] {
  if (window < 1) return [...series]
  const out: number[] = []
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1)
    out.push(mean(series.slice(start, i + 1)))
  }
  return out
}
