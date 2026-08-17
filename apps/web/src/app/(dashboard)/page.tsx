import Link from "next/link"
import { Zap, Sun, Server, TriangleAlert, ArrowUpRight, Activity } from "lucide-react"
import {
  getDashboardStats,
  getFleetPowerCurve,
  getTopProducersToday,
  listAlarms,
  listDevicesPaginated,
} from "@/server/devices"
import dynamicImport from "next/dynamic"
import { StatCard } from "./stat-card"
import { StatusBreakdown } from "./status-breakdown"
import { TopProducers } from "./top-producers"
import { RecentAlarms } from "./recent-alarms"
import { DeviceStatusBadge } from "@/components/status-indicator"
import { Skeleton } from "@/components/ui/skeleton"

const FleetPowerChart = dynamicImport(
  () => import("./fleet-power-chart").then((mod) => mod.FleetPowerChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-full rounded-md" />,
  }
)

export const dynamic = "force-dynamic"

function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-lg border border-neutral-100 bg-card p-5 dark:border-neutral-800 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

export default async function DashboardPage() {
  const [stats, curve, producers, activeAlarms, devicesResult] = await Promise.all([
    getDashboardStats(),
    getFleetPowerCurve(24),
    getTopProducersToday(5),
    listAlarms(true),
    listDevicesPaginated({ page: 1, limit: 8 }),
  ])

  const devices = devicesResult.devices

  const onlinePct = stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0
  const peakW = curve.reduce((max, p) => Math.max(max, p.totalW), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Barcha {stats.total} qurilmaning umumiy holati bir qarashda
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Joriy quvvat"
          value={(stats.totalAcPowerW / 1000).toFixed(1)}
          unit="kW"
          icon={Activity}
          accent="blue"
          hint={`Cho'qqi (24 soat): ${(peakW / 1000).toFixed(1)} kW`}
        />
        <StatCard
          title="Bugungi generatsiya"
          value={stats.totalYieldTodayKwh.toFixed(1)}
          unit="kWh"
          icon={Sun}
          accent="amber"
          hint="Barcha qurilmalar yig'indisi"
        />
        <StatCard
          title="Onlayn"
          value={String(stats.online)}
          unit={`/ ${stats.total}`}
          icon={Zap}
          accent="emerald"
          hint={`${onlinePct}% faol · ${stats.offline} oflayn`}
        />
        <StatCard
          title="Faol alarmlar"
          value={String(stats.activeAlarms)}
          icon={TriangleAlert}
          accent={stats.activeAlarms > 0 ? "red" : "neutral"}
          hint={stats.activeAlarms > 0 ? "E'tibor talab qiladi" : "Hammasi joyida"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Portfel quvvati"
          hint="So'nggi 24 soat · barcha qurilmalar yig'indisi, kW"
          className="lg:col-span-2"
        >
          <FleetPowerChart data={curve} />
        </Panel>

        <Panel title="Qurilmalar holati" hint={`Jami ${stats.total} ta`}>
          <StatusBreakdown stats={stats} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Bugungi yetakchilar"
          hint="Generatsiya bo'yicha top 5 (O'zbekiston kuni)"
        >
          <TopProducers producers={producers} />
        </Panel>

        <Panel
          title="So'nggi alarmlar"
          hint={
            stats.activeAlarms > 0
              ? `${stats.activeAlarms} ta faol alarm`
              : "Faol alarm yo'q"
          }
          action={
            <Link
              href="/alarms"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Barchasi
              <ArrowUpRight className="size-3.5" />
            </Link>
          }
        >
          <RecentAlarms alarms={activeAlarms.slice(0, 5)} />
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Qurilmalar</h2>
          <Link
            href="/devices"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Barchasini ko&apos;rish
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
            <Server className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Hali qurilma qo&apos;shilmagan</p>
            <Link href="/devices" className="text-sm font-medium underline underline-offset-4">
              Qurilma qo&apos;shish
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {devices.slice(0, 8).map((device) => (
              <Link
                key={device.id}
                href={`/devices/${encodeURIComponent(device.sn)}`}
                className="group flex flex-col gap-4 rounded-lg border border-neutral-100 bg-card p-4 transition-colors hover:border-neutral-200 hover:bg-muted/30 dark:border-neutral-800 dark:hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{device.name}</p>
                    <p className="text-muted-foreground truncate font-mono text-xs">{device.sn}</p>
                  </div>
                  <DeviceStatusBadge status={device.status} />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-muted-foreground text-[11px]">Quvvat</p>
                    <p className="text-lg font-semibold tracking-tight tabular-nums">
                      {device.latestReading?.acPower?.toFixed(0) ?? "—"}
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">W</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-[11px]">Bugun</p>
                    <p className="text-lg font-semibold tracking-tight tabular-nums">
                      {device.latestReading?.yieldToday?.toFixed(1) ?? "—"}
                      <span className="ml-0.5 text-xs font-normal text-muted-foreground">kWh</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
