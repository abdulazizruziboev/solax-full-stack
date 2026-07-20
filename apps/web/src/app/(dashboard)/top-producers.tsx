import Link from "next/link"

interface Producer {
  name: string
  sn: string
  yield_kwh: number | null
  peak_w: number | null
}

/**
 * Today's top devices by generated energy — thin single-hue bars (magnitude),
 * values right-aligned in text ink, name doubles as the row label.
 */
export function TopProducers({ producers }: { producers: Producer[] }) {
  if (producers.length === 0) {
    return (
      <p className="text-muted-foreground flex h-full min-h-32 items-center justify-center text-sm">
        Bugun hali generatsiya qayd etilmagan
      </p>
    )
  }

  const max = Math.max(...producers.map((p) => p.yield_kwh ?? 0), 0.001)

  return (
    <div className="flex flex-col gap-3">
      {producers.map((p, i) => (
        <Link
          key={p.sn}
          href={`/devices/${encodeURIComponent(p.sn)}`}
          className="group flex flex-col gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-muted-foreground w-4 shrink-0 text-xs tabular-nums">
                {i + 1}
              </span>
              <span className="truncate text-sm font-medium group-hover:underline">
                {p.name}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {(p.yield_kwh ?? 0).toFixed(1)}
              <span className="text-muted-foreground ml-1 text-xs font-normal">kWh</span>
            </span>
          </div>
          <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--chart-3)]"
              style={{ width: `${((p.yield_kwh ?? 0) / max) * 100}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  )
}
