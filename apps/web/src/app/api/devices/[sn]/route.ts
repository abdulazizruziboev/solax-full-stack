import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { updateDevice, deleteDevice } from "@/server/devices"
import { deviceCreateSchema } from "@solax/shared"

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/devices/[sn]">
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sn } = await ctx.params
  const body = await request.json()
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
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { sn } = await ctx.params

  try {
    await deleteDevice(decodeURIComponent(sn))
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isMissing = message.includes("Record to delete does not exist")
    return NextResponse.json(
      { error: isMissing ? "Qurilma topilmadi" : message },
      { status: isMissing ? 404 : 500 }
    )
  }
}
