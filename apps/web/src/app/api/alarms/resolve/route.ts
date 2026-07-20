import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { resolveAlarmsByCode, resolveAllAlarms } from "@/server/devices"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const code: unknown = body?.code

  const resolved =
    typeof code === "string" && code.length > 0
      ? await resolveAlarmsByCode(code)
      : await resolveAllAlarms()

  return NextResponse.json({ resolved })
}
