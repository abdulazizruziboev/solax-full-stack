"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
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
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20 my-8">
      <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
        <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Ma&apos;lumotlarni yuklashda xatolik</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Baza yoki server bilan bog'lanishda muammo yuzaga keldi."}
        </p>
      </div>
      <Button onClick={() => reset()} variant="outline" className="gap-2">
        <RefreshCw className="size-4" />
        Qayta urinib ko&apos;rish
      </Button>
    </div>
  )
}
