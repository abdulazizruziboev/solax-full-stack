import { NextResponse } from "next/server"
import { guard } from "@/server/guard"
import { getDeviceReadings } from "@/server/devices"

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/devices/[sn]/readings">
) {
  const denied = await guard()
  if (denied) return denied

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
