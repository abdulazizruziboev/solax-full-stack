import { NextResponse } from "next/server"
import { guard, readJson } from "@/server/guard"
import { enqueueDevicePolls } from "@/server/poll-queue"

const MAX_IDS = 500

// POST /api/devices/poll
// Body (optional): { deviceIds: string[] } — poll specific devices.
// No body / empty ids → poll every device now.
export async function POST(request: Request) {
  const denied = await guard()
  if (denied) return denied

  let deviceIds: string[] | undefined
  const body = (await readJson(request)) as { deviceIds?: unknown } | null
  if (Array.isArray(body?.deviceIds)) {
    if (
      body.deviceIds.length > MAX_IDS ||
      !body.deviceIds.every((id): id is string => typeof id === "string")
    ) {
      return NextResponse.json({ error: "deviceIds noto'g'ri" }, { status: 400 })
    }
    deviceIds = body.deviceIds
  }

  try {
    const count = await enqueueDevicePolls(deviceIds)
    return NextResponse.json({ queued: count })
  } catch (err) {
    console.error("POST /api/devices/poll failed:", err)
    return NextResponse.json({ error: "Navbatga qo'shib bo'lmadi" }, { status: 500 })
  }
}
