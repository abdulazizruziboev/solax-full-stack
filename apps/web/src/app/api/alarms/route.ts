import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { listAlarms } from "@/server/devices"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const onlyUnresolved = searchParams.get("all") !== "true"

  const alarms = await listAlarms(onlyUnresolved)
  return NextResponse.json({ alarms })
}
