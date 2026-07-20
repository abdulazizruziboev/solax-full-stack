"use client"

import { FileDown } from "lucide-react"
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { createPdf, PDF_FONT } from "@/lib/pdf"

export type DeviceReportData = {
  name: string
  sn: string
  inverterSn: string | null
  plantName: string | null
  status: string
  raw: Record<string, unknown> | null
  alarms: { message: string; ts: string; resolved: boolean }[]
}

// Field key → Uzbek label + unit, in display order. Only rows with a value
// are printed, so battery rows are skipped for battery-less inverters.
const FIELDS: [string, string, string][] = [
  ["ratedPower", "Nominal quvvat", "kW"],
  ["acpower", "Joriy AC quvvat", "W"],
  ["temperature", "Harorat", "°C"],
  ["yieldtoday", "Bugungi generatsiya", "kWh"],
  ["yieldtotal", "Umumiy generatsiya", "kWh"],
  ["feedinpower", "Tarmoqqa (feed-in)", "W"],
  ["feedinenergy", "Eksport energiya", "kWh"],
  ["consumeenergy", "Import energiya", "kWh"],
  ["powerdc1", "PV1 quvvat", "W"],
  ["powerdc2", "PV2 quvvat", "W"],
  ["powerdc3", "PV3 quvvat", "W"],
  ["powerdc4", "PV4 quvvat", "W"],
  ["pac1", "Faza L1 quvvat", "W"],
  ["pac2", "Faza L2 quvvat", "W"],
  ["pac3", "Faza L3 quvvat", "W"],
  ["vac1", "Faza L1 kuchlanish", "V"],
  ["vac2", "Faza L2 kuchlanish", "V"],
  ["vac3", "Faza L3 kuchlanish", "V"],
  ["fac1", "Faza L1 chastota", "Hz"],
  ["soc", "Batareya SOC", "%"],
  ["batPower", "Batareya quvvat", "W"],
  ["batVoltage", "Batareya kuchlanish", "V"],
]

export function DevicePdfButton({ data }: { data: DeviceReportData }) {
  const handleDownload = () => {
    const doc = createPdf()
    const now = new Date().toLocaleString("uz-UZ")

    doc.setFontSize(16)
    doc.text(data.name, 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`SN: ${data.sn}${data.inverterSn ? `  ·  Inverter: ${data.inverterSn}` : ""}`, 14, 22)
    doc.text(`Plant: ${data.plantName ?? "—"}  ·  Yaratilgan: ${now}`, 14, 27)
    doc.setTextColor(0)

    const raw = data.raw ?? {}
    const metricRows = FIELDS.filter(([k]) => typeof raw[k] === "number").map(([k, label, unit]) => [
      label,
      `${(raw[k] as number).toLocaleString("uz-UZ")} ${unit}`,
    ])

    autoTable(doc, {
      startY: 34,
      head: [["Ko'rsatkich", "Qiymat"]],
      body: metricRows.length ? metricRows : [["Ma'lumot", "Hali yig'ilmagan"]],
      headStyles: { fillColor: [23, 23, 23], font: PDF_FONT },
      styles: { fontSize: 9, cellPadding: 2, font: PDF_FONT },
      margin: { left: 14, right: 14 },
    })

    // @ts-expect-error lastAutoTable is added by the plugin at runtime
    let y = (doc.lastAutoTable?.finalY ?? 34) + 10

    doc.setFontSize(11)
    doc.text("Alarm tarixi", 14, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [["Xabar", "Vaqt", "Holat"]],
      body: data.alarms.length
        ? data.alarms.map((a) => [a.message, a.ts, a.resolved ? "Hal qilindi" : "Faol"])
        : [["Alarm topilmadi", "", ""]],
      headStyles: { fillColor: [23, 23, 23], font: PDF_FONT },
      styles: { fontSize: 9, cellPadding: 2, font: PDF_FONT },
      margin: { left: 14, right: 14 },
    })

    doc.save(`solax-${data.sn}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <FileDown className="size-4" />
      PDF
    </Button>
  )
}
