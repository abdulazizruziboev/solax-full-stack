import { NextResponse } from "next/server"
import { guard, readJson } from "@/server/guard"
import { updateDevice, deleteDevice } from "@/server/devices"
import { deviceCreateSchema } from "@solax/shared"

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/devices/[sn]">
) {
  const denied = await guard({ admin: true })
  if (denied) return denied

  const { sn } = await ctx.params
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
    const device = await updateDevice(decodeURIComponent(sn), parsed.data)
    return NextResponse.json({ device })
  } catch (err) {
    console.error("PATCH /api/devices/[sn] failed:", err)
    const message = err instanceof Error ? err.message : String(err)
    const isDuplicate = message.includes("Unique constraint")
    const isMissing = message.includes("Record to update not found")
    return NextResponse.json(
      {
        error: isDuplicate
          ? "Bu SN allaqachon mavjud"
          : isMissing
            ? "Qurilma topilmadi"
            : message,
      },
      { status: isDuplicate ? 409 : isMissing ? 404 : 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/devices/[sn]">
) {
  const denied = await guard({ admin: true })
  if (denied) return denied

  const { sn } = await ctx.params

  try {
    await deleteDevice(decodeURIComponent(sn))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE /api/devices/[sn] failed:", err)
    const message = err instanceof Error ? err.message : String(err)
    const isMissing = message.includes("Record to delete does not exist")
    return NextResponse.json(
      { error: isMissing ? "Qurilma topilmadi" : "Qurilmani o'chirib bo'lmadi" },
      { status: isMissing ? 404 : 500 }
    )
  }
}
