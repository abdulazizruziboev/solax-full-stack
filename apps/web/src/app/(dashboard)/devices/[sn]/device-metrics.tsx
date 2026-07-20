// Renders the full SolaxCloud realtime payload (1:1) for a device, grouped
// into PV strings, AC phases, battery, and inverter meta. Reads straight from
// the latest reading's stored `raw` JSON so every field Solax returns is shown.

type Raw = Record<string, unknown>

function n(raw: Raw, key: string): number | null {
  const v = raw[key]
  return typeof v === "number" ? v : null
}
function s(raw: Raw, key: string): string | null {
  const v = raw[key]
  return typeof v === "string" ? v : null
}
function has(...vals: (number | null)[]): boolean {
  return vals.some((v) => v != null)
}

function fmt(v: number | null, digits = 0): string {
  return v == null ? "—" : v.toFixed(digits)
}

function Cell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-neutral-100 bg-card p-3 dark:border-neutral-800">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {value}
        {unit && value !== "—" && <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  )
}

// Inverter type / status code → human label (from SolaxCloud API docs).
const INVERTER_STATUS: Record<string, string> = {
  "100": "Kutish",
  "101": "Tekshiruv",
  "102": "Normal",
  "103": "Xato",
  "104": "Ruxsat",
  "105": "Yangilash",
  "106": "EPS rejimi",
  "107": "Kutish (self-test)",
  "108": "Idle",
  "109": "Standby",
}

export function DeviceMetrics({ raw }: { raw: unknown }) {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Raw

  const pv = [1, 2, 3, 4].map((i) => ({
    i,
    p: n(r, `powerdc${i}`),
    v: n(r, `vdc${i}`),
    a: n(r, `idc${i}`),
  }))
  const phases = [1, 2, 3].map((i) => ({
    i,
    p: n(r, `pac${i}`),
    v: n(r, `vac${i}`),
    a: n(r, `iac${i}`),
    f: n(r, `fac${i}`),
  }))

  const soc = n(r, "soc")
  const batPower = n(r, "batPower")
  const batVoltage = n(r, "batVoltage")
  const hasBattery = has(soc, batPower, batVoltage)

  const statusCode = s(r, "inverterStatus")
  const statusLabel = statusCode ? (INVERTER_STATUS[statusCode] ?? statusCode) : "—"

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold tracking-tight">To&apos;liq ma&apos;lumot (Solax Cloud 1:1)</h2>
        <p className="text-muted-foreground text-xs">
          Oxirgi yangilanish: {s(r, "uploadTime") ?? "—"}
        </p>
      </div>

      <Section title="Umumiy">
        <Cell label="Nominal quvvat" value={fmt(n(r, "ratedPower"), 1)} unit="kW" />
        <Cell label="Joriy AC quvvat" value={fmt(n(r, "acpower"))} unit="W" />
        <Cell label="Harorat" value={fmt(n(r, "temperature"))} unit="°C" />
        <Cell label="Holat" value={statusLabel} />
        <Cell label="Bugungi generatsiya" value={fmt(n(r, "yieldtoday"), 1)} unit="kWh" />
        <Cell label="Umumiy generatsiya" value={fmt(n(r, "yieldtotal"), 1)} unit="kWh" />
        <Cell label="Tarmoqqa (feed-in)" value={fmt(n(r, "feedinpower"))} unit="W" />
        <Cell label="Eksport energiya" value={fmt(n(r, "feedinenergy"), 1)} unit="kWh" />
        <Cell label="Import energiya" value={fmt(n(r, "consumeenergy"), 1)} unit="kWh" />
      </Section>

      <Section title="Quyosh panellari (DC)">
        {pv
          .filter((p) => has(p.p, p.v, p.a))
          .map((p) => (
            <Cell
              key={p.i}
              label={`PV${p.i}`}
              value={`${fmt(p.p)} W`}
              unit={`· ${fmt(p.v, 1)}V · ${fmt(p.a, 1)}A`}
            />
          ))}
        {pv.every((p) => !has(p.p, p.v, p.a)) && (
          <Cell label="PV" value="—" />
        )}
      </Section>

      <Section title="Chiqish (AC fazalar)">
        {phases
          .filter((p) => has(p.p, p.v, p.a, p.f))
          .map((p) => (
            <Cell
              key={p.i}
              label={`Faza L${p.i}`}
              value={`${fmt(p.p)} W`}
              unit={`· ${fmt(p.v, 1)}V · ${fmt(p.a, 1)}A · ${fmt(p.f, 2)}Hz`}
            />
          ))}
        {phases.every((p) => !has(p.p, p.v, p.a, p.f)) && (
          <Cell label="Faza" value="—" />
        )}
      </Section>

      {hasBattery && (
        <Section title="Batareya">
          <Cell label="Zaryad (SOC)" value={fmt(soc)} unit="%" />
          <Cell label="Quvvat" value={fmt(batPower)} unit="W" />
          <Cell label="Kuchlanish" value={fmt(batVoltage, 1)} unit="V" />
          <Cell label="Harorat" value={fmt(n(r, "battemper"))} unit="°C" />
        </Section>
      )}
    </section>
  )
}
