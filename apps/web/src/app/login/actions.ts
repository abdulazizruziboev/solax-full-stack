"use server"

import { headers } from "next/headers"
import { AuthError } from "next-auth"
import { signIn } from "@/server/auth"
import { loginRetryAfter, recordLoginFailure, recordLoginSuccess } from "@/server/rate-limit"
import { loginSchema } from "@solax/shared"

export interface LoginActionState {
  error?: string
}

async function clientKey(): Promise<string> {
  const h = await headers()
  // Caddy appends the real client address as the last X-Forwarded-For entry.
  const xff = h.get("x-forwarded-for")
  const last = xff?.split(",").pop()?.trim()
  return last || h.get("x-real-ip") || "unknown"
}

function lockedMessage(seconds: number): string {
  return `Juda ko'p noto'g'ri urinish. ${Math.ceil(seconds / 60)} daqiqadan keyin qayta urinib ko'ring`
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const key = await clientKey()
  const wait = loginRetryAfter(key)
  if (wait > 0) return { error: lockedMessage(wait) }

  const pin = formData.get("pin")?.toString()?.trim()

  if (pin) {
    try {
      await signIn("credentials", {
        pin,
        redirectTo: "/",
      })
      recordLoginSuccess(key)
      return {}
    } catch (err) {
      if (err instanceof AuthError) {
        recordLoginFailure(key)
        return { error: "PIN kod noto'g'ri" }
      }
      // signIn signals a successful redirect by throwing NEXT_REDIRECT.
      recordLoginSuccess(key)
      throw err
    }
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: "PIN kod yoki ma'lumotlar noto'g'ri" }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    })
    recordLoginSuccess(key)
    return {}
  } catch (err) {
    if (err instanceof AuthError) {
      recordLoginFailure(key)
      return { error: "Email yoki parol xato" }
    }
    recordLoginSuccess(key)
    throw err
  }
}
