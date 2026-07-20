import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { enqueueDevicePolls } from "@/server/poll-queue"

// POST /api/devices/poll
// Body (optional): { deviceIds: string[] } — poll specific devices.
// No body / empty ids → poll every device now.
export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let deviceIds: string[] | undefined
  try {
    const body = await request.json()
    if (Array.isArray(body?.deviceIds)) deviceIds = body.deviceIds
  } catch {
    // no body — poll all
  }

  try {
    const count = await enqueueDevicePolls(deviceIds)
    return NextResponse.json({ queued: count })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
