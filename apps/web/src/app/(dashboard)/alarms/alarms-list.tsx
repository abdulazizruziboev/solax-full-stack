"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AlarmSeverityBadge } from "@/components/status-indicator"
import { cn } from "@/lib/utils"

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

export function AlarmsList({ groups }: { groups: AlarmGroup[] }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAllMap, setShowAllMap] = useState<Record<string, boolean>>({})

  function toggleShowAll(code: string) {
    setShowAllMap((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  async function resolve(code?: string) {
    setPending(code ?? "__all__")
    try {
      const res = await fetch("/api/alarms/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(code ? { code } : {}),
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

  const totalDevices = groups.reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {groups.length} xil muammo · {totalDevices} ta qurilma
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending === "__all__"}
          onClick={() => resolve()}
        >
          <Check />
          Barchasini hal qilish
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const isOpen = expanded === group.code
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
                    onClick={() => setExpanded(isOpen ? null : group.code)}
                    className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Ta&apos;sirlangan qurilmalar
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
                  onClick={() => resolve(group.code)}
                  className="shrink-0"
                >
                  <Check />
                  Hal qilish
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
