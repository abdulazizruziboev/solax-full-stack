import { LoginForm } from "./login-form"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  const pinLength = process.env.ADMIN_PIN?.trim().length || 6

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <LoginForm pinLength={pinLength} />
    </div>
  )
}
