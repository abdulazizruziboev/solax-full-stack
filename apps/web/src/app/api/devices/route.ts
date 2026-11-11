import { NextResponse } from "next/server"
import { guard, readJson } from "@/server/guard"
import { listDevicesPaginated, createDevice, type ListDevicesOptions } from "@/server/devices"
import { deviceCreateSchema, deviceStatusValues } from "@solax/shared"

const SORT_FIELDS: readonly NonNullable<ListDevicesOptions["sortField"]>[] = [
  "name",
  "power",
  "yield",
  "lastSeen",
]

function intParam(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request: Request) {
  const denied = await guard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const page = intParam(searchParams.get("page"), 1)
  const limit = intParam(searchParams.get("limit"), 20)
  const query = (searchParams.get("query") ?? "").slice(0, 100)

  const statusParam = searchParams.get("status") ?? "ALL"
  const status = (deviceStatusValues as readonly string[]).includes(statusParam)
    ? statusParam
    : "ALL"

  const sortParam = searchParams.get("sortField")
  const sortField = SORT_FIELDS.find((f) => f === sortParam) ?? "name"
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc"

  try {
    const result = await listDevicesPaginated({
      page,
      limit,
      query,
      status,
      sortField,
      sortDir,
    })

    // Authenticated data: never let a shared cache/CDN store it.
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (err) {
    console.error("GET /api/devices failed:", err)
    return NextResponse.json({ error: "Qurilmalarni yuklab bo'lmadi" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const denied = await guard({ admin: true })
  if (denied) return denied

  const body = await readJson(request)
  if (body === null) {
    return NextResponse.json({ error: "So'rov tanasi noto'g'ri (JSON kutilgan)" }, { status: 400 })
  }
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
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Bu SN allaqachon mavjud" }, { status: 409 })
    }
    console.error("POST /api/devices failed:", err)
    return NextResponse.json({ error: "Qurilmani yaratib bo'lmadi" }, { status: 500 })
  }
}
