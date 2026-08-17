"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ChevronDown, Layers, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlarmSeverityBadge } from "@/components/status-indicator"
import { cn } from "@/lib/utils"

export interface IndividualAlarm {
  id: string
  code: string
  message: string
  severity: string
  category: string
  ts: string
  device: { name: string; sn: string }
}

export interface AlarmGroup {
  code: string
  message: string
  severity: string
  category: string
  count: number
  latestTs: string
  sampleDevices: { name: string; sn: string }[]
}

const CATEGORY_LABEL: Record<string, string> = {
  SYSTEM: "Tizim",
  DATA_QUALITY: "Ma'lumot sifati",
  PERFORMANCE: "Ishlash",
  STRING: "String",
  FUSE: "Fuse / uzilish",
}

export function AlarmsList({
  individualAlarms = [],
  groups = [],
}: {
  individualAlarms?: IndividualAlarm[]
  groups?: AlarmGroup[]
}) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"individual" | "grouped">("individual")
  const [pending, setPending] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showAllMap, setShowAllMap] = useState<Record<string, boolean>>({})

  function toggleShowAll(code: string) {
    setShowAllMap((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  async function resolve({ code, alarmId }: { code?: string; alarmId?: string }) {
    const pendingKey = alarmId ?? code ?? "__all__"
    setPending(pendingKey)
    try {
      const res = await fetch("/api/alarms/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, alarmId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Xatolik")
        return
      }
      toast.success(`${data.resolved} ta alarm hal qilindi`)
      router.refresh()
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls & View switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-neutral-100 p-1 dark:border-neutral-800 w-fit">
          <button
            type="button"
            onClick={() => setViewMode("individual")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "individual"
                ? "bg-muted text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Server className="size-3.5" />
            Alohida qurilmalar ({individualAlarms.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "grouped"
                ? "bg-muted text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="size-3.5" />
            Turlar bo&apos;yicha ({groups.length})
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={pending === "__all__"}
          onClick={() => resolve({})}
        >
          <Check className="size-3.5" />
          Barchasini hal qilish
        </Button>
      </div>

      {/* Mode 1: Individual Alarm List for Each Device */}
      {viewMode === "individual" && (
        <div className="flex flex-col gap-3">
          {individualAlarms.map((alarm) => (
            <div
              key={alarm.id}
              className="flex flex-col gap-3 rounded-lg border border-neutral-100 bg-card p-4 transition-colors hover:border-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <AlarmSeverityBadge severity={alarm.severity} />
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {CATEGORY_LABEL[alarm.category] ?? alarm.category}
                  </span>
                  <Link
                    href={`/devices/${encodeURIComponent(alarm.device.sn)}`}
                    className="text-sm font-semibold hover:underline text-foreground"
                  >
                    {alarm.device.name}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">({alarm.device.sn})</span>
                </div>

                <p className="text-sm text-foreground wrap-break-word">{alarm.message}</p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Sana: {new Date(alarm.ts).toLocaleString("uz-UZ")}</span>
                  <span className="font-mono">kod: {alarm.code}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={pending === alarm.id}
                onClick={() => resolve({ alarmId: alarm.id })}
                className="shrink-0 self-start sm:self-center"
              >
                <Check className="size-3.5" />
                Hal qilish
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Mode 2: Grouped View */}
      {viewMode === "grouped" && (
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const isOpen = expandedGroup === group.code
            const isShowAll = !!showAllMap[group.code]
            const visibleDevices = isShowAll
              ? group.sampleDevices
              : group.sampleDevices.slice(0, 4)
            const remainingCount = group.sampleDevices.length - 4

            return (
              <div
                key={group.code}
                className="rounded-lg border border-neutral-100 bg-card dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlarmSeverityBadge severity={group.severity} />
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {CATEGORY_LABEL[group.category] ?? group.category}
                      </span>
                      <span className="text-sm font-medium wrap-break-word">{group.message}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        {group.count} ta qurilma
                      </span>
                      <span>Oxirgi: {new Date(group.latestTs).toLocaleString("uz-UZ")}</span>
                      <span className="font-mono">kod: {group.code}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isOpen ? null : group.code)}
                      className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Ta&apos;sirlangan qurilmalar ({group.sampleDevices.length})
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
                      />
                    </button>

                    {isOpen && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {visibleDevices.map((d) => (
                          <Link
                            key={d.sn}
                            href={`/devices/${encodeURIComponent(d.sn)}`}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
                          >
                            {d.name}
                          </Link>
                        ))}

                        {group.sampleDevices.length > 4 && (
                          <button
                            type="button"
                            onClick={() => toggleShowAll(group.code)}
                            className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                          >
                            {isShowAll ? "Yashirish" : `+${remainingCount} ta (Barchasini ko'rsat)`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending === group.code}
                    onClick={() => resolve({ code: group.code })}
                    className="shrink-0"
                  >
                    <Check className="size-3.5" />
                    Hal qilish
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
