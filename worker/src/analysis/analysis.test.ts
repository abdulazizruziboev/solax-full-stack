import { describe, it, expect } from "vitest"
import { mean, median, mad, clamp, linearSlope, movingAverage } from "./stats.js"
import { completenessPct, frozenRunLength, isFrozen } from "./dataQuality.js"
import { runBinaryChecks } from "./binaryChecks.js"
import {
  stringShares,
  computeStringDeviations,
  detectImbalance,
  worstDeviation,
} from "./stringAnalysis.js"
import { classifyDrop, detectFuse } from "./fuseDetection.js"
import {
  specificYield,
  performanceIndex,
  performanceRatio,
  soilingSlopePerDay,
  degradationPctPerYear,
} from "./performance.js"
import { summarizeShares, isBaselineReady, deviationThresholdPct } from "./baseline.js"

describe("stats", () => {
  it("mean/median/mad", () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(mean([])).toBe(0)
    // MAD of a symmetric set, scaled ~ std
    expect(mad([1, 1, 1])).toBe(0)
    expect(mad([2, 4, 6, 8])).toBeCloseTo(2.9652, 3)
  })
  it("clamp", () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
  it("linearSlope", () => {
    expect(linearSlope([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }])).toBeCloseTo(2)
    expect(linearSlope([{ x: 0, y: 5 }])).toBe(0)
  })
  it("movingAverage trailing", () => {
    expect(movingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5])
  })
})

describe("layer 1 — data quality", () => {
  it("completeness: full vs half vs capped", () => {
    const start = 0
    const end = 10 * 60_000 // 10 min
    const interval = 60_000 // 1/min → 10 expected
    const full = Array.from({ length: 10 }, (_, i) => i * 60_000)
    expect(completenessPct(full, start, end, interval)).toBeCloseTo(100)
    expect(completenessPct(full.slice(0, 5), start, end, interval)).toBeCloseTo(50)
    // extra bursts cannot exceed 100
    const many = Array.from({ length: 30 }, (_, i) => i * 20_000)
    expect(completenessPct(many, start, end, interval)).toBe(100)
  })

  it("frozen run length + isFrozen gating", () => {
    expect(frozenRunLength([1, 2, 5, 5, 5])).toBe(3)
    expect(frozenRunLength([5, 5, 5, null])).toBe(0) // trailing null breaks the run
    expect(isFrozen([5, 5, 5, 5, 5, 5], 6)).toBe(true)
    expect(isFrozen([5, 5, 5], 6)).toBe(false) // too short
    expect(isFrozen([0, 0, 0, 0, 0, 0], 6)).toBe(false) // zeros ignored (night)
    expect(isFrozen([0, 0, 0, 0, 0, 0], 6, false)).toBe(true) // unless allowed
  })
})

describe("layer 2 — binary checks", () => {
  const base = { ratedPowerKw: 10, vac: [220], inverterStatus: "102", isDaytime: true }

  it("zero current in daylight is CRITICAL", () => {
    const f = runBinaryChecks({ ...base, acPowerW: 0 })
    expect(f.some((x) => x.code === "ZERO_CURRENT_DAY")).toBe(true)
  })
  it("no zero-current flag at night", () => {
    const f = runBinaryChecks({ ...base, acPowerW: 0, isDaytime: false })
    expect(f.some((x) => x.code === "ZERO_CURRENT_DAY")).toBe(false)
  })
  it("healthy producing inverter → no findings", () => {
    expect(runBinaryChecks({ ...base, acPowerW: 5000 })).toHaveLength(0)
  })
  it("voltage low / high", () => {
    expect(runBinaryChecks({ ...base, acPowerW: 5000, vac: [170] })[0].code).toBe("VOLTAGE_LOW")
    expect(runBinaryChecks({ ...base, acPowerW: 5000, vac: [270] })[0].code).toBe("VOLTAGE_HIGH")
  })
  it("inverter fault status", () => {
    const f = runBinaryChecks({ ...base, acPowerW: 5000, inverterStatus: "103" })
    expect(f.some((x) => x.code === "INVERTER_FAULT")).toBe(true)
  })
})

describe("layer 3 — string analysis", () => {
  it("equal strings → shares ~1", () => {
    expect(stringShares([10, 10, 10])).toEqual([1, 1, 1])
  })
  it("null strings preserved", () => {
    expect(stringShares([10, null, 10])).toEqual([1, null, 1])
  })
  it("deviations vs baseline", () => {
    const devs = computeStringDeviations(
      [12, 6], // string2 at half of string1 → shares 1.33 & 0.67
      [
        { stringIndex: 1, medianShare: 1.0, madShare: 0.02 },
        { stringIndex: 2, medianShare: 1.0, madShare: 0.02 },
      ]
    )
    const s2 = devs.find((d) => d.stringIndex === 2)!
    expect(s2.ratio!).toBeCloseTo(0.667, 2)
    expect(s2.deviationPct!).toBeLessThan(-30)
    expect(worstDeviation(devs)!.stringIndex).toBe(2)
  })
  it("baseline-free imbalance flags the low string", () => {
    const flagged = detectImbalance([10, 10, 5], 10) // string3 is 33% below median
    expect(flagged).toHaveLength(1)
    expect(flagged[0].stringIndex).toBe(3)
  })
})

describe("fuse detection", () => {
  it("classifyDrop bands", () => {
    expect(classifyDrop(0.05)).toBe("OPEN")
    expect(classifyDrop(0.5)).toBe("HALF")
    expect(classifyDrop(1.0)).toBe(null)
    expect(classifyDrop(null)).toBe(null)
    expect(classifyDrop(-1)).toBe(null)
  })
  it("detectFuse from deviations", () => {
    const findings = detectFuse([
      { stringIndex: 1, share: 1.3, baselineShare: 1, deviationPct: 30, ratio: 1.3 },
      { stringIndex: 2, share: 0.5, baselineShare: 1, deviationPct: -50, ratio: 0.5 },
      { stringIndex: 3, share: 0.02, baselineShare: 1, deviationPct: -98, ratio: 0.02 },
    ])
    expect(findings).toHaveLength(2)
    expect(findings.find((f) => f.stringIndex === 2)!.signature).toBe("HALF")
    expect(findings.find((f) => f.stringIndex === 3)!.signature).toBe("OPEN")
  })
})

describe("performance (layers 3 & 4)", () => {
  it("specific yield & peer index", () => {
    expect(specificYield(50, 10)).toBe(5)
    expect(specificYield(50, 0)).toBe(null)
    expect(performanceIndex(4, 5)).toBeCloseTo(0.8)
    expect(performanceIndex(5, 0)).toBe(null)
  })
  it("performance ratio", () => {
    // 40 kWh, 5 kWh/m² sun, 10 kWp → PR = 40/(5*10) = 0.8
    expect(performanceRatio(40, 5, 10)).toBeCloseTo(0.8)
    expect(performanceRatio(40, null, 10)).toBe(null)
  })
  it("soiling slope is negative for a steady decline", () => {
    const declining = [1.0, 0.98, 0.96, 0.94, 0.92, 0.9, 0.88, 0.86]
    expect(soilingSlopePerDay(declining, 3)).toBeLessThan(0)
  })
  it("degradation %/year", () => {
    // ~0.5%/yr drop: value falls from 0.8 by 0.8*0.005/365 per day
    const pts = Array.from({ length: 400 }, (_, d) => ({
      dayIndex: d,
      value: 0.8 - (0.8 * 0.005 * d) / 365,
    }))
    const deg = degradationPctPerYear(pts)!
    expect(deg).toBeCloseTo(-0.5, 1)
  })
})

describe("baseline", () => {
  it("summarize & readiness", () => {
    const s = summarizeShares([1.0, 1.02, 0.98, 1.01, 0.99])
    expect(s.medianShare).toBeCloseTo(1.0, 2)
    expect(isBaselineReady({ sampleCount: 5 })).toBe(false)
    expect(isBaselineReady({ sampleCount: 25 })).toBe(true)
    expect(isBaselineReady(null)).toBe(false)
  })
  it("dynamic threshold widens with noise, clamped", () => {
    expect(deviationThresholdPct({ medianShare: 1, madShare: 0.001, sampleCount: 30 })).toBe(8)
    expect(deviationThresholdPct({ medianShare: 1, madShare: 0.5, sampleCount: 30 })).toBe(25)
  })
})
