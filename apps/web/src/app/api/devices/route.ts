import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { listDevicesPaginated, createDevice } from "@/server/devices"
import { deviceCreateSchema } from "@solax/shared"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const limit = parseInt(searchParams.get("limit") ?? "20", 10)
  const query = searchParams.get("query") ?? ""
  const status = searchParams.get("status") ?? "ALL"
  const sortField = (searchParams.get("sortField") as any) ?? "name"
  const sortDir = (searchParams.get("sortDir") as any) ?? "asc"

  const result = await listDevicesPaginated({
    page,
    limit,
    query,
    status,
    sortField,
    sortDir,
  })

  return NextResponse.json(
    {
      ...result,
      devices: result.devices.map((d) => ({
        ...d,
        latestReading: d.latestReading
          ? { ...d.latestReading, id: d.latestReading.id.toString() }
          : null,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
      },
    }
  )
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
