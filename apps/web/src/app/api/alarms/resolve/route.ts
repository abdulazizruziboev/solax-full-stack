import { NextResponse } from "next/server"
import { guard, readJson } from "@/server/guard"
import { resolveAlarmById, resolveAlarmsByCode, resolveAllAlarms } from "@/server/devices"

export async function POST(request: Request) {
  const denied = await guard({ admin: true })
  if (denied) return denied

  const body = (await readJson(request)) as { code?: unknown; alarmId?: unknown } | null
  const code = body?.code
  const alarmId = body?.alarmId

  let resolved = 0
  if (typeof alarmId === "string" && alarmId.length > 0) {
    resolved = await resolveAlarmById(alarmId)
  } else if (typeof code === "string" && code.length > 0) {
    resolved = await resolveAlarmsByCode(code)
  } else {
    resolved = await resolveAllAlarms()
  }

  return NextResponse.json({ resolved })
}
