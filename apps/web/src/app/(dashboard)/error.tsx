"use client"

import { useEffect } from "react"
import { Bug, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center my-8 max-w-md mx-auto">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-xs">
        <Bug className="size-7" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Xatolik yuz berdi</h2>
        <p className="text-sm text-muted-foreground">
          Ma&apos;lumotlarni yuklashda muammo yuzaga keldi. Iltimos, qayta urinib ko&apos;ring.
        </p>
      </div>
      <Button onClick={() => reset()} variant="outline" className="gap-2 mt-1 cursor-pointer">
        <RefreshCw className="size-4" />
        Qayta urinib ko&apos;rish
      </Button>
    </div>
  )
}
