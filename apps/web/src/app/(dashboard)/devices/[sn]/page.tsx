import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { getDeviceReadings, getDeviceAnalysis } from "@/server/devices"
import { DeviceStatusBadge } from "@/components/status-indicator"
import { ReadingChart } from "./reading-chart"
import { LiveDevicePoll } from "./live-device-poll"
import { DeviceMetrics } from "./device-metrics"
import { DeviceAnalysis } from "./device-analysis"
import { DevicePdfButton } from "./device-pdf-button"

export const dynamic = "force-dynamic"

function Metric({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className="text-sm font-medium text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ sn: string }>
}) {
  const { sn } = await params
  const decodedSn = decodeURIComponent(sn)
  const [data, analysis] = await Promise.all([
    getDeviceReadings(decodedSn),
    getDeviceAnalysis(decodedSn),
  ])

  if (!data) notFound()

  const { device, readings, alarms } = data
  const latest = readings[readings.length - 1]
  const peak24h = readings.reduce((max, r) => Math.max(max, r.acPower ?? 0), 0)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/devices"
          className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Qurilmalar
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight wrap-break-word">{device.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-mono break-all">SN: {device.sn}</span>
              {device.inverterSn && (
                <span className="font-mono break-all">Inverter: {device.inverterSn}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <DevicePdfButton
              data={{
                name: device.name,
                sn: device.sn,
                inverterSn: device.inverterSn,
                plantName: device.plantName,
                status: device.status,
                raw: (latest?.raw as Record<string, unknown> | null) ?? null,
                alarms: alarms.map((a) => ({
                  message: a.message,
                  ts: new Date(a.ts).toLocaleString("uz-UZ"),
                  resolved: a.resolvedAt != null,
                })),
              }}
            />
            <LiveDevicePoll deviceId={device.id} />
            <DeviceStatusBadge status={device.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Joriy quvvat" value={latest?.acPower?.toFixed(0) ?? "—"} unit="W" />
        <Metric label="Cho'qqi (24 soat)" value={peak24h > 0 ? peak24h.toFixed(0) : "—"} unit="W" />
        <Metric
          label="Bugungi generatsiya"
          value={latest?.yieldToday?.toFixed(1) ?? "—"}
          unit="kWh"
        />
        <Metric label="Batareya (SOC)" value={latest?.batterySoc?.toFixed(0) ?? "—"} unit="%" />
      </div>

      {analysis && (
        <DeviceAnalysis
          latest={analysis.latest}
          baselines={analysis.baselines}
          trendSlope={analysis.trendSlope}
          historyDays={analysis.historyDays}
        />
      )}

      {latest?.raw != null && <DeviceMetrics raw={latest.raw} />}

      <section className="flex flex-col gap-4 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight">So&apos;nggi 24 soat quvvat</h2>
          <p className="text-muted-foreground text-xs">Real vaqtdagi ishlab chiqarish egri chizig&apos;i</p>
        </div>
        {readings.length > 0 ? (
          <ReadingChart
            data={readings.map((r) => ({
              ts: r.ts.toISOString(),
              acPower: r.acPower,
              batterySoc: r.batterySoc,
            }))}
          />
        ) : (
          <p className="text-muted-foreground py-12 text-center text-sm">
            Hali ma&apos;lumot yig&apos;ilmagan
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Alarm tarixi</h2>
        {alarms.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed border-neutral-200 py-8 text-center text-sm dark:border-neutral-800">
            Alarm topilmadi
          </p>
        ) : (
          <div className="rounded-lg border border-neutral-100 dark:border-neutral-800">
            {alarms.map((alarm) => (
              <div
                key={alarm.id}
                className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm font-medium wrap-break-word">{alarm.message}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(alarm.ts).toLocaleString("uz-UZ")}
                  </p>
                </div>
                <span
                  className={
                    alarm.resolvedAt
                      ? "shrink-0 text-xs font-medium text-muted-foreground"
                      : "shrink-0 text-xs font-medium text-red-600 dark:text-red-400"
                  }
                >
                  {alarm.resolvedAt ? "Hal qilindi" : "Faol"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
