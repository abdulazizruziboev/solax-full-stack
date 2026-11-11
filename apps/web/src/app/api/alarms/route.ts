import { NextResponse } from "next/server"
import { guard } from "@/server/guard"
import { listAlarms } from "@/server/devices"

export async function GET(request: Request) {
  const denied = await guard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const onlyUnresolved = searchParams.get("all") !== "true"

  const alarms = await listAlarms(onlyUnresolved)
  return NextResponse.json({ alarms })
}
