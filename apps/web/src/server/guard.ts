import "server-only"
import { NextResponse } from "next/server"
import { auth } from "@/server/auth"

/**
 * Route-handler guard. Returns an error response to send back, or null when the
 * caller is allowed. `admin: true` additionally requires the ADMIN role —
 * use it for anything that mutates data.
 */
export async function guard(opts: { admin?: boolean } = {}): Promise<NextResponse | null> {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (opts.admin && (session.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}

/** Parse a JSON body, returning null on malformed/missing input. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
