// Layer 1 — data quality gate. Nothing downstream is trustworthy unless the
// underlying samples are complete and actually changing. These functions are
// pure so they can be unit-tested and reused by both the live and daily paths.

/**
 * Fraction (0..100) of expected polls that actually arrived in a window.
 * `expectedIntervalMs` is the nominal poll spacing; the expected count is the
 * window length divided by it. Capped at 100 so a burst of extra polls can't
 * report >100% completeness.
 */
export function completenessPct(
  timestampsMs: number[],
  windowStartMs: number,
  windowEndMs: number,
  expectedIntervalMs: number
): number {
  if (expectedIntervalMs <= 0 || windowEndMs <= windowStartMs) return 0
  const expected = (windowEndMs - windowStartMs) / expectedIntervalMs
  if (expected <= 0) return 0
  const actual = timestampsMs.filter(
    (t) => t >= windowStartMs && t <= windowEndMs
  ).length
  return Math.min(100, (actual / expected) * 100)
}

/**
 * A day is only "confidently analyzable" above this completeness. Below it,
 * daily aggregates (yield, peak) are still shown but flagged as provisional.
 */
export const MIN_CONFIDENT_COMPLETENESS = 80

/**
 * Length of the trailing run of identical, non-null values. A long run on a
 * signal that should vary (e.g. AC power across daylight) points to a frozen
 * sensor or a stale API cache rather than real production.
 */
export function frozenRunLength(values: (number | null | undefined)[]): number {
  let run = 0
  let last: number | null = null
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i]
    if (v == null) break
    if (last === null) {
      last = v
      run = 1
    } else if (v === last) {
      run += 1
    } else {
      break
    }
  }
  return run
}

/**
 * Frozen when the trailing identical run reaches `minRepeats`. `nonZeroOnly`
 * ignores legitimately-flat zero stretches (e.g. night), so only a stuck
 * *producing* value trips it.
 */
export function isFrozen(
  values: (number | null | undefined)[],
  minRepeats = 6,
  nonZeroOnly = true
): boolean {
  const run = frozenRunLength(values)
  if (run < minRepeats) return false
  if (nonZeroOnly) {
    const lastVal = values[values.length - 1]
    if (lastVal == null || lastVal === 0) return false
  }
  return true
}
