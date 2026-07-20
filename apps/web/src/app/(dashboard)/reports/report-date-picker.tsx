"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

// Shift a "YYYY-MM-DD" string by N days without timezone drift.
function shiftDay(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

export function ReportDatePicker({
  selected,
  today,
}: {
  selected: string
  today: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const yesterday = shiftDay(today, -1)

  function go(dateStr: string) {
    if (!dateStr) return
    // Selecting today drops the param so the page shows its default view.
    router.push(dateStr === today ? "/reports" : `/reports?date=${dateStr}`)
  }

  const quick = [
    { label: "Bugun", value: today },
    { label: "Kecha", value: yesterday },
  ]

  const isCustom = selected !== today && selected !== yesterday

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-lg border border-neutral-100 p-1 dark:border-neutral-800">
        {quick.map((q) => (
          <button
            key={q.value}
            type="button"
            onClick={() => go(q.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              selected === q.value
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {q.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          const el = inputRef.current
          if (!el) return
          // showPicker() opens the native calendar reliably and positioned on
          // the control; fall back to focus for older browsers.
          if (typeof el.showPicker === "function") el.showPicker()
          else el.focus()
        }}
        className={cn(
          "relative flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          isCustom
            ? "border-foreground/20 bg-muted text-foreground"
            : "border-neutral-100 text-muted-foreground hover:text-foreground dark:border-neutral-800"
        )}
      >
        <CalendarDays className="size-3.5" />
        <span>{isCustom ? selected : "Sana tanlash"}</span>
        <input
          ref={inputRef}
          type="date"
          value={selected}
          max={today}
          onChange={(e) => go(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Sana tanlash"
        />
      </button>
    </div>
  )
}
