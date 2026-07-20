import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { getDeviceReadings } from "@/server/devices"

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/devices/[sn]/readings">
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sn } = await ctx.params
  const data = await getDeviceReadings(decodeURIComponent(sn))

  if (!data) {
    return NextResponse.json({ error: "Qurilma topilmadi" }, { status: 404 })
  }

  return NextResponse.json({
    device: data.device,
    readings: data.readings.map((r) => ({ ...r, id: r.id.toString() })),
    alarms: data.alarms,
  })
}
