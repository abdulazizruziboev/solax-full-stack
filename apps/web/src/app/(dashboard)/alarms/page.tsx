import { CheckCircle2 } from "lucide-react"
import { listAlarms, listGroupedAlarms } from "@/server/devices"
import { AlarmsList } from "./alarms-list"

export const dynamic = "force-dynamic"

export default async function AlarmsPage() {
  const [individualAlarms, groups] = await Promise.all([
    listAlarms(true),
    listGroupedAlarms(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Alarmlar</h1>
        <p className="text-muted-foreground text-sm">
          Barcha faol muammolar va ta&apos;sirlangan qurilmalar ro&apos;yxati
        </p>
      </div>

      {individualAlarms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
          <CheckCircle2 className="size-8 text-emerald-500/60" />
          <p className="text-sm text-muted-foreground">Faol alarm yo&apos;q — hammasi joyida</p>
        </div>
      ) : (
        <AlarmsList
          individualAlarms={individualAlarms.map((a) => ({
            id: a.id,
            code: a.code,
            message: a.message,
            severity: a.severity,
            category: a.category,
            ts: a.ts.toISOString(),
            device: a.device,
          }))}
          groups={groups.map((g) => ({ ...g, latestTs: g.latestTs.toISOString() }))}
        />
      )}
    </div>
  )
}
