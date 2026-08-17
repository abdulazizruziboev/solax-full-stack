import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { resolveAlarmById, resolveAlarmsByCode, resolveAllAlarms } from "@/server/devices"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const code: unknown = body?.code
  const alarmId: unknown = body?.alarmId

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
