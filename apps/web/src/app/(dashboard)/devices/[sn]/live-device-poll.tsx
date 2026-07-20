"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

const POLL_INTERVAL_MS = 30_000
// After asking the worker to fetch fresh data, wait a bit for it to land in
// the DB before pulling the page's server data again.
const REFRESH_DELAY_MS = 5_000

export function LiveDevicePoll({ deviceId }: { deviceId: string }) {
  const router = useRouter()
  const [live, setLive] = useState(true)
  const [busy, setBusy] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tick = useCallback(async () => {
    setBusy(true)
    try {
      await fetch("/api/devices/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceIds: [deviceId] }),
      })
      refreshTimer.current = setTimeout(() => {
        router.refresh()
        setBusy(false)
      }, REFRESH_DELAY_MS)
    } catch {
      setBusy(false)
    }
  }, [deviceId, router])

  useEffect(() => {
    if (!live) return
    tick() // immediately on mount / when turned on
    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      clearInterval(id)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [live, tick])

  return (
    <button
      type="button"
      onClick={() => setLive((v) => !v)}
      className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted dark:border-neutral-800"
      title={live ? "Jonli yangilanish yoqilgan — o'chirish uchun bosing" : "Jonli yangilanishni yoqish"}
    >
      {live ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
      ) : (
        <span className="inline-flex size-2 rounded-full bg-neutral-400" />
      )}
      {live ? "Jonli (30s)" : "Jonli o'chiq"}
      {busy && <RefreshCw className="size-3 animate-spin text-muted-foreground" />}
    </button>
  )
}
