import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { uz } from "date-fns/locale"
import { TriangleAlert, Info, OctagonAlert, CheckCircle2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlarmRow {
  id: string
  message: string
  severity: string
  ts: Date
  device: { name: string; sn: string }
}

const SEVERITY: Record<string, { icon: LucideIcon; cls: string; label: string }> = {
  CRITICAL: {
    icon: OctagonAlert,
    cls: "text-red-600 dark:text-red-400",
    label: "Kritik",
  },
  WARNING: {
    icon: TriangleAlert,
    cls: "text-amber-600 dark:text-amber-400",
    label: "Ogohlantirish",
  },
  INFO: { icon: Info, cls: "text-blue-600 dark:text-blue-400", label: "Info" },
}

export function RecentAlarms({ alarms }: { alarms: AlarmRow[] }) {
  if (alarms.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full min-h-32 flex-col items-center justify-center gap-2 text-sm">
        <CheckCircle2 className="size-6 text-emerald-500/60" />
        Faol alarm yo&apos;q — hammasi joyida
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {alarms.map((a) => {
        const sev = SEVERITY[a.severity] ?? SEVERITY.INFO
        return (
          <Link
            key={a.id}
            href={`/devices/${encodeURIComponent(a.device.sn)}`}
            className="flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/60"
          >
            <sev.icon className={cn("mt-0.5 size-4 shrink-0", sev.cls)} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">{a.device.name}</p>
              <p className="text-muted-foreground truncate text-xs">{a.message}</p>
            </div>
            <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
              {formatDistanceToNow(a.ts, { addSuffix: true, locale: uz })}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
