"use client"

import { FileDown } from "lucide-react"
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { createPdf, PDF_FONT } from "@/lib/pdf"

export type DevicePdfRow = {
  name: string
  sn: string
  plantName: string | null
  status: string
  acPowerW: number | null
  lastSeen: string | null
}

const STATUS_UZ: Record<string, string> = {
  ONLINE: "Onlayn",
  OFFLINE: "Oflayn",
  ALARM: "Alarm",
  UNKNOWN: "Noma'lum",
}

export function DevicesPdfButton({ rows }: { rows: DevicePdfRow[] }) {
  const handleDownload = () => {
    const doc = createPdf({ orientation: "landscape" })
    const now = new Date().toLocaleString("uz-UZ")

    doc.setFontSize(16)
    doc.text("Solax - Qurilmalar ro'yxati", 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Jami: ${rows.length} ta  ·  Yaratilgan: ${now}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [["#", "Nom", "SN", "Plant", "Joriy quvvat", "Holat", "Oxirgi ko'rilgan"]],
      body: rows.map((r, i) => [
        String(i + 1),
        r.name,
        r.sn,
        r.plantName ?? "—",
        r.acPowerW != null ? `${r.acPowerW.toFixed(0)} W` : "—",
        STATUS_UZ[r.status] ?? r.status,
        r.lastSeen ?? "—",
      ]),
      headStyles: { fillColor: [23, 23, 23], font: PDF_FONT },
      styles: { fontSize: 8, cellPadding: 1.5, font: PDF_FONT },
      margin: { left: 14, right: 14 },
    })

    doc.save(`solax-qurilmalar-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={rows.length === 0}>
      <FileDown />
      PDF
    </Button>
  )
}
