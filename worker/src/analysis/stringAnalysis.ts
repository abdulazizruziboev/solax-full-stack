// Layer 3 — per-string (MPPT input) analysis. SolaxCloud reports idc1..4 /
// powerdc1..4 per MPPT input; we call each a "string" (see the wiring-topology
// caveat: an index may actually be a parallel pair). All pure.

import { median } from "./stats.js"

/**
 * Each present string's current as a share of the device's mean string current.
 * Equal strings → all shares ≈ 1.0. Null where the string has no reading so the
 * caller can distinguish "absent" from "zero".
 */
export function stringShares(currents: (number | null)[]): (number | null)[] {
  const present = currents.filter((c): c is number => c != null)
  if (present.length === 0) return currents.map(() => null)
  const avg = present.reduce((s, c) => s + c, 0) / present.length
  if (avg === 0) return currents.map((c) => (c == null ? null : 0))
  return currents.map((c) => (c == null ? null : c / avg))
}

export interface StringBaselineShare {
  stringIndex: number // 1-based
  medianShare: number
  madShare: number
}

export interface StringDeviation {
  stringIndex: number
  share: number
  baselineShare: number | null
  /** (share − baseline) / baseline × 100. Negative = underperforming. */
  deviationPct: number | null
  /** share / baseline — 1.0 is normal, ~0.5 a halved pair, ~0 an open string. */
  ratio: number | null
}

/**
 * Compare live per-string shares against each string's learned baseline share.
 * `currents` is idc1..N in index order (index i → stringIndex i+1).
 */
export function computeStringDeviations(
  currents: (number | null)[],
  baselines: StringBaselineShare[]
): StringDeviation[] {
  const shares = stringShares(currents)
  const byIndex = new Map(baselines.map((b) => [b.stringIndex, b]))
  const out: StringDeviation[] = []

  shares.forEach((share, i) => {
    if (share == null) return
    const stringIndex = i + 1
    const base = byIndex.get(stringIndex)
    if (!base || base.medianShare === 0) {
      out.push({ stringIndex, share, baselineShare: base?.medianShare ?? null, deviationPct: null, ratio: null })
      return
    }
    out.push({
      stringIndex,
      share,
      baselineShare: base.medianShare,
      deviationPct: ((share - base.medianShare) / base.medianShare) * 100,
      ratio: share / base.medianShare,
    })
  })

  return out
}

/**
 * Baseline-free imbalance: flag strings whose share sits more than
 * `thresholdPct` below the median share of the device's own strings. Useful
 * before a baseline exists (the first weeks) and as a cross-check after.
 */
export function detectImbalance(
  currents: (number | null)[],
  thresholdPct = 10
): { stringIndex: number; share: number; belowMedianPct: number }[] {
  const shares = stringShares(currents)
  const present = shares.filter((s): s is number => s != null)
  if (present.length < 2) return []
  const med = median(present)
  if (med === 0) return []
  const out: { stringIndex: number; share: number; belowMedianPct: number }[] = []
  shares.forEach((share, i) => {
    if (share == null) return
    const belowPct = ((med - share) / med) * 100
    if (belowPct > thresholdPct) {
      out.push({ stringIndex: i + 1, share, belowMedianPct: belowPct })
    }
  })
  return out
}

/** The single worst (most negative) baseline deviation, or null if none known. */
export function worstDeviation(devs: StringDeviation[]): StringDeviation | null {
  const known = devs.filter((d) => d.deviationPct != null)
  if (known.length === 0) return null
  return known.reduce((worst, d) => (d.deviationPct! < worst.deviationPct! ? d : worst))
}
