// Baseline learning — the "normal portrait" of each string. During an initial
// window (and slowly after) we collect the string's current share on
// high-irradiance samples and summarize it robustly. Thresholds then key off
// this learned normal, not a book constant, so an installation-specific offset
// (e.g. a string that always sits 3% low by geometry) is treated as its normal.

import { median, mad } from "./stats.js"

/** Minimum samples before a baseline is trusted enough to alert against. */
export const MIN_BASELINE_SAMPLES = 20

export interface BaselineSummary {
  medianShare: number
  madShare: number
  sampleCount: number
}

/** Summarize a string's share samples into a robust center + spread. */
export function summarizeShares(samples: number[]): BaselineSummary {
  return {
    medianShare: median(samples),
    madShare: mad(samples),
    sampleCount: samples.length,
  }
}

/** True once a baseline has enough samples to drive alerts. */
export function isBaselineReady(b: { sampleCount: number } | null | undefined): boolean {
  return !!b && b.sampleCount >= MIN_BASELINE_SAMPLES
}

/**
 * Dynamic per-string deviation threshold (in %). Wider when the string is
 * naturally noisy (high MAD), tighter when it's stable — but always within a
 * sane floor/ceiling so one quiet string can't hide a real drop and a jittery
 * one isn't a false-alarm generator.
 */
export function deviationThresholdPct(b: BaselineSummary): number {
  if (b.medianShare <= 0) return 10
  // 3× the relative MAD, clamped to [8%, 25%].
  const relMadPct = (b.madShare / b.medianShare) * 100
  return Math.max(8, Math.min(25, 3 * relMadPct))
}
