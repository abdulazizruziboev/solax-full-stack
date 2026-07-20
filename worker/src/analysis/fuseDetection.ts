// Fuse / open-string detection. A blown string fuse (or open connector/cable —
// the electrical signature is identical) shows up as a string current that
// collapses relative to its learned normal:
//   • single string per MPPT input  → current ≈ 0        (ratio ~0)
//   • two strings paralleled per input → current ≈ halves (ratio ~0.5)
// The exact drop depends on wiring topology, so we report the signature and let
// the operator confirm at the combiner box. All pure.

import type { StringDeviation } from "./stringAnalysis.js"

export type FuseSignature = "OPEN" | "HALF"

export interface FuseFinding {
  stringIndex: number
  signature: FuseSignature
  ratio: number
}

// ratio = live share / baseline share.
const OPEN_MAX = 0.15 // at/near zero → whole string input lost
const HALF_LO = 0.35 // one of a parallel pair lost sits around 0.5,
const HALF_HI = 0.65 // so accept a band around it

/** Classify a single string's current-vs-baseline ratio, or null if normal. */
export function classifyDrop(ratio: number | null): FuseSignature | null {
  if (ratio == null || !Number.isFinite(ratio) || ratio < 0) return null
  if (ratio <= OPEN_MAX) return "OPEN"
  if (ratio >= HALF_LO && ratio <= HALF_HI) return "HALF"
  return null
}

/**
 * Scan baseline deviations for fuse signatures. Only meaningful on
 * high-irradiance samples (the caller gates on power > ~30% of rated), so a
 * low ratio reflects a lost string rather than dusk/cloud.
 */
export function detectFuse(deviations: StringDeviation[]): FuseFinding[] {
  const out: FuseFinding[] = []
  for (const d of deviations) {
    const sig = classifyDrop(d.ratio)
    if (sig && d.ratio != null) {
      out.push({ stringIndex: d.stringIndex, signature: sig, ratio: d.ratio })
    }
  }
  return out
}

/** Human-readable Uzbek explanation for an operator alert. */
export function describeFuse(f: FuseFinding): string {
  const pct = Math.round(f.ratio * 100)
  return f.signature === "OPEN"
    ? `String ${f.stringIndex}: tok deyarli nol (normaning ${pct}%) — uzilgan string yoki kuygan fuse ehtimoli`
    : `String ${f.stringIndex}: tok ~yarmiga tushdi (normaning ${pct}%) — parallel juftlikdan biri uzilgan bo'lishi mumkin`
}
