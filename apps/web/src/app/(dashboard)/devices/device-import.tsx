"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ImportResponse {
  created?: number
  skipped?: number
  rowErrors?: string[]
  error?: string
}

export function DeviceImport({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)

  async function onImport() {
    const file = inputRef.current?.files?.[0]
    if (!file) {
      toast.error("Avval Excel/CSV fayl tanlang")
      return
    }

    setPending(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/devices/import", {
        method: "POST",
        body: formData,
      })

      let data: ImportResponse
      try {
        data = await res.json()
      } catch {
        toast.error(`Serverdan noto'g'ri javob keldi (HTTP ${res.status})`)
        return
      }

      if (!res.ok) {
        toast.error(data.error ?? "Import muvaffaqiyatsiz")
        return
      }

      toast.success(
        `${data.created ?? 0} qurilma import qilindi${data.skipped ? `, ${data.skipped} tashlab ketildi` : ""}`
      )
      if (data.rowErrors?.length) {
        console.warn("Import qatorlaridagi xatoliklar:", data.rowErrors)
      }
      if (inputRef.current) inputRef.current.value = ""
      router.refresh()
      onDone?.()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="import-file">
          Excel/CSV fayl — o&apos;z shablonimiz (sn, name, tokenId, plantName) yoki
          SolaxCloud&apos;dan eksport qilingan qurilmalar ro&apos;yxati (Inverter SN,
          SiteName, UserName) qabul qilinadi
        </Label>
        <Input
          id="import-file"
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        />
      </div>
      <Button type="button" disabled={pending} onClick={onImport}>
        {pending ? "Yuklanmoqda..." : "Import qilish"}
      </Button>
    </div>
  )
}
