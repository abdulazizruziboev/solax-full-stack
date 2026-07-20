import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  hint,
  accent = "neutral",
}: {
  title: string
  value: string
  unit?: string
  icon: LucideIcon
  hint?: string
  accent?: "neutral" | "emerald" | "amber" | "red" | "blue"
}) {
  const accentClass = {
    neutral: "bg-muted text-muted-foreground",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  }[accent]

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("flex size-8 items-center justify-center rounded-md", accentClass)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span data-slot="stat-value" className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
