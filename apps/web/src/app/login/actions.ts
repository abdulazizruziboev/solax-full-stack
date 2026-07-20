"use server"

import { AuthError } from "next-auth"
import { signIn } from "@/server/auth"
import { loginSchema } from "@solax/shared"

export interface LoginActionState {
  error?: string
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return { error: "Email yoki parol noto'g'ri formatda" }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    })
    return {}
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email yoki parol xato" }
    }
    throw err
  }
}
