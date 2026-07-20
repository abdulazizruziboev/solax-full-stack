import { CheckCircle2 } from "lucide-react"
import { listGroupedAlarms } from "@/server/devices"
import { AlarmsList } from "./alarms-list"

export const dynamic = "force-dynamic"

export default async function AlarmsPage() {
  const groups = await listGroupedAlarms()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Alarmlar</h1>
        <p className="text-muted-foreground text-sm">
          Faol muammolar turlar bo&apos;yicha guruhlangan
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
          <CheckCircle2 className="size-8 text-emerald-500/60" />
          <p className="text-sm text-muted-foreground">Faol alarm yo&apos;q — hammasi joyida</p>
        </div>
      ) : (
        <AlarmsList
          groups={groups.map((g) => ({ ...g, latestTs: g.latestTs.toISOString() }))}
        />
      )}
    </div>
  )
}
