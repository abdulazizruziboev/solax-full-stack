import { describe, expect, it } from "vitest"
import { getSunsetTime, isProductiveDaytime } from "./sunset.js"

describe("isProductiveDaytime", () => {
  it("is true around local noon in summer", () => {
    expect(isProductiveDaytime(new Date("2026-06-21T12:00:00+05:00"))).toBe(true)
  })

  it("is false at night", () => {
    expect(isProductiveDaytime(new Date("2026-06-21T01:00:00+05:00"))).toBe(false)
  })

  it("is false shortly before sunset, when output is legitimately ~0 W", () => {
    const sunset = getSunsetTime(new Date("2026-06-21T12:00:00+05:00"))
    expect(isProductiveDaytime(new Date(sunset.getTime() - 5 * 60_000))).toBe(false)
  })
})
