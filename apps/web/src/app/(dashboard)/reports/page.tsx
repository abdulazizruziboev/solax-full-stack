import Link from "next/link"
import { CalendarClock } from "lucide-react"
import {
  listDailySummariesForDate,
  listReportDates,
  uzTodayStr,
} from "@/server/devices"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DownloadReportButton, type ReportRow } from "./download-report-button"
import { ReportDatePicker } from "./report-date-picker"

export const dynamic = "force-dynamic"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const today = uzTodayStr()
  const selected = date && DATE_RE.test(date) ? date : today

  const [summaries, availableDates] = await Promise.all([
    listDailySummariesForDate(selected),
    listReportDates(90),
  ])

  const reportRows: ReportRow[] = summaries.map((s) => ({
    id: s.id,
    date: selected,
    deviceName: s.device.name,
    deviceSn: s.device.sn,
    totalYieldKwh: s.totalYieldKwh,
    peakAcPowerW: s.peakAcPowerW,
    wasOnline: s.wasOnline,
    alarmCount: s.alarmCount,
  }))

  const dayYield = summaries.reduce((s, r) => s + (r.totalYieldKwh ?? 0), 0)
  const dayOnline = summaries.filter((r) => r.wasOnline).length
  const dayAlarms = summaries.reduce((s, r) => s + r.alarmCount, 0)

  const heading = new Date(`${selected}T00:00:00.000Z`).toLocaleDateString("uz-UZ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })

  const isToday = selected === today

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">Kunlik hisobotlar</h1>
            <p className="text-muted-foreground text-sm">
              Har kuni O&apos;zbekistonda quyosh botganda barcha qurilmalar uchun avtomatik
              hisoblanadi
            </p>
          </div>
          <DownloadReportButton rows={reportRows} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReportDatePicker selected={selected} today={today} />
          {availableDates.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {availableDates.length} kunlik hisobot mavjud
            </p>
          )}
        </div>
      </div>

      {/* Day header + totals */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold capitalize tracking-tight">
          {heading}
          {isToday && (
            <span className="text-muted-foreground ml-2 font-normal">(bugun)</span>
          )}
        </h2>
        {summaries.length > 0 && (
          <p className="text-muted-foreground text-xs tabular-nums">
            Jami:{" "}
            <span className="font-medium text-foreground">{dayYield.toFixed(1)} kWh</span>
            {" · "}Onlayn: {dayOnline}/{summaries.length}
            {dayAlarms > 0 && (
              <>
                {" · "}
                <span className="font-medium text-red-600 dark:text-red-400">
                  {dayAlarms} alarm
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
          <CalendarClock className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {isToday
              ? "Bugungi hisobot hali tayyor emas — u quyosh botganda avtomatik yaratiladi."
              : "Bu sana uchun hisobot topilmadi."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Qurilma</TableHead>
              <TableHead className="text-right">Kunlik generatsiya</TableHead>
              <TableHead className="text-right">Cho&apos;qqi quvvat</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead className="text-right">Alarmlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/devices/${encodeURIComponent(row.device.sn)}`}
                    className="font-medium hover:underline"
                  >
                    {row.device.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.totalYieldKwh != null ? `${row.totalYieldKwh.toFixed(1)} kWh` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.peakAcPowerW != null ? `${row.peakAcPowerW.toFixed(0)} W` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={row.wasOnline ? "secondary" : "outline"}>
                    {row.wasOnline ? "Onlayn bo'lgan" : "Oflayn"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.alarmCount > 0 ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {row.alarmCount}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
