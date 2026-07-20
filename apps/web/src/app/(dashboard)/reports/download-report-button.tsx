"use client"

import { Download } from "lucide-react"
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { createPdf, PDF_FONT } from "@/lib/pdf"

export type ReportRow = {
  id: string
  date: string
  deviceName: string
  deviceSn: string
  totalYieldKwh: number | null
  peakAcPowerW: number | null
  wasOnline: boolean
  alarmCount: number
}

export function DownloadReportButton({ rows }: { rows: ReportRow[] }) {
  const handleDownload = () => {
    const doc = createPdf({ orientation: "landscape" })

    const generatedAt = new Date().toLocaleString("uz-UZ")

    doc.setFontSize(16)
    doc.text("Solax - Kunlik hisobotlar", 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Yaratilgan: ${generatedAt}`, 14, 22)
    doc.setTextColor(0)

    // Group by date, one section per day.
    const byDate = new Map<string, ReportRow[]>()
    for (const row of rows) {
      byDate.set(row.date, [...(byDate.get(row.date) ?? []), row])
    }

    let startY = 30
    for (const [date, dayRows] of byDate) {
      const heading = new Date(date).toLocaleDateString("uz-UZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      autoTable(doc, {
        startY,
        head: [
          [
            "Qurilma",
            "Kunlik generatsiya",
            "Cho'qqi quvvat",
            "Holat",
            "Alarmlar",
          ],
        ],
        body: dayRows.map((r) => [
          r.deviceName,
          r.totalYieldKwh != null ? `${r.totalYieldKwh.toFixed(1)} kWh` : "-",
          r.peakAcPowerW != null ? `${r.peakAcPowerW.toFixed(0)} W` : "-",
          r.wasOnline ? "Onlayn bo'lgan" : "Oflayn",
          String(r.alarmCount),
        ]),
        headStyles: { fillColor: [23, 23, 23], font: PDF_FONT },
        styles: { fontSize: 9, cellPadding: 2, font: PDF_FONT },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          doc.setFontSize(11)
          doc.text(heading, 14, startY - 3)
        },
      })

      // @ts-expect-error lastAutoTable is added by the plugin at runtime
      startY = (doc.lastAutoTable?.finalY ?? startY) + 14
    }

    doc.save(`solax-hisobot-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={rows.length === 0}>
      <Download className="size-4" />
      PDF yuklab olish
    </Button>
  )
}
