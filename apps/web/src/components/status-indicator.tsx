import { cn } from "@/lib/utils"

type DeviceStatus = "ONLINE" | "OFFLINE" | "ALARM" | "UNKNOWN"
type AlarmSeverity = "INFO" | "WARNING" | "CRITICAL"

const deviceConfig: Record<
  DeviceStatus,
  { label: string; dot: string; text: string; bg: string; pulse: boolean }
> = {
  ONLINE: {
    label: "Onlayn",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    pulse: true,
  },
  OFFLINE: {
    label: "Oflayn",
    dot: "bg-neutral-400",
    text: "text-neutral-600 dark:text-neutral-400",
    bg: "bg-neutral-100 dark:bg-neutral-800/60",
    pulse: false,
  },
  ALARM: {
    label: "Alarm",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
    pulse: true,
  },
  UNKNOWN: {
    label: "Noma'lum",
    dot: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    pulse: false,
  },
}

const severityConfig: Record<
  AlarmSeverity,
  { label: string; dot: string; text: string; bg: string; pulse: boolean }
> = {
  INFO: {
    label: "Ma'lumot",
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    pulse: false,
  },
  WARNING: {
    label: "Ogohlantirish",
    dot: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    pulse: false,
  },
  CRITICAL: {
    label: "Kritik",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
    pulse: true,
  },
}

function Pill({
  label,
  dot,
  text,
  bg,
  pulse,
}: {
  label: string
  dot: string
  text: string
  bg: string
  pulse: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 rounded-md px-2 text-xs font-medium",
        bg,
        text
      )}
    >
      <span className="relative flex size-1.5">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-75",
              dot
            )}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dot)} />
      </span>
      {label}
    </span>
  )
}

export function DeviceStatusBadge({ status }: { status: string }) {
  const config = deviceConfig[status as DeviceStatus] ?? deviceConfig.UNKNOWN
  return <Pill {...config} />
}

export function AlarmSeverityBadge({ severity }: { severity: string }) {
  const config = severityConfig[severity as AlarmSeverity] ?? severityConfig.WARNING
  return <Pill {...config} />
}
