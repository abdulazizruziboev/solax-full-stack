"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function RefreshDevicesButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleRefresh() {
    setPending(true)
    try {
      const res = await fetch("/api/devices/poll", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Xatolik yuz berdi")
        return
      }

      toast.success(
        `${data.queued} ta qurilma navbatga qo'yildi — ma'lumotlar yangilanmoqda`
      )
      // Give the worker a moment to process the first jobs, then refresh.
      setTimeout(() => router.refresh(), 4000)
    } catch {
      toast.error("Serverga ulanib bo'lmadi")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleRefresh} disabled={pending}>
      <RefreshCw className={pending ? "animate-spin" : ""} />
      {pending ? "Yuborilmoqda..." : "Hoziroq yangilash"}
    </Button>
  )
}
