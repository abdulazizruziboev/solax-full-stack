import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { listDevicesWithLatestReading, createDevice } from "@/server/devices"
import { deviceCreateSchema } from "@solax/shared"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const devices = await listDevicesWithLatestReading()

  return NextResponse.json({
    devices: devices.map((d) => ({
      ...d,
      latestReading: d.latestReading
        ? { ...d.latestReading, id: d.latestReading.id.toString() }
        : null,
    })),
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = deviceCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    )
  }

  try {
    const device = await createDevice(parsed.data)
    return NextResponse.json({ device }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isDuplicate = message.includes("Unique constraint")
    return NextResponse.json(
      { error: isDuplicate ? "Bu SN allaqachon mavjud" : message },
      { status: isDuplicate ? 409 : 500 }
    )
  }
}
