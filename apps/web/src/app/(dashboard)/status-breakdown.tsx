import Link from "next/link"
import { Zap, TriangleAlert, PowerOff, HelpCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusStats {
  total: number
  online: number
  alarm: number
  offline: number
  unknown: number
}

// Status palette (reserved, never reused for series) — each row always ships
// icon + label + count, so state is never communicated by color alone.
const SEGMENTS: {
  key: keyof Omit<StatusStats, "total">
  label: string
  icon: LucideIcon
  bar: string
  chip: string
}[] = [
  {
    key: "online",
    label: "Onlayn",
    icon: Zap,
    bar: "bg-emerald-500",
    chip: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "alarm",
    label: "Alarm",
    icon: TriangleAlert,
    bar: "bg-red-500",
    chip: "text-red-600 dark:text-red-400",
  },
  {
    key: "offline",
    label: "Oflayn",
    icon: PowerOff,
    bar: "bg-neutral-400 dark:bg-neutral-500",
    chip: "text-neutral-600 dark:text-neutral-300",
  },
  {
    key: "unknown",
    label: "Noma'lum",
    icon: HelpCircle,
    bar: "bg-neutral-200 dark:bg-neutral-700",
    chip: "text-muted-foreground",
  },
]

export function StatusBreakdown({ stats }: { stats: StatusStats }) {
  const visible = SEGMENTS.filter((s) => stats[s.key] > 0)

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Segmented fleet bar — 2px gaps between fills */}
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {visible.length === 0 ? (
          <div className="h-full w-full rounded-full bg-muted" />
        ) : (
          visible.map((s) => (
            <div
              key={s.key}
              className={cn("h-full rounded-full", s.bar)}
              style={{ width: `${(stats[s.key] / stats.total) * 100}%` }}
            />
          ))
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2">
        {SEGMENTS.map((s) => {
          const count = stats[s.key]
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
          return (
            <Link
              key={s.key}
              href={`/devices`}
              className="group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
            >
              <span className="flex items-center gap-2 text-sm">
                <s.icon className={cn("size-3.5", s.chip)} />
                <span className="text-foreground/90">{s.label}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold tabular-nums">{count}</span>
                <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                  {pct}%
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
