"use client"

import { useActionState } from "react"
import { Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction, type LoginActionState } from "./actions"

const initialState: LoginActionState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg bg-foreground text-background">
          <Sun className="size-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Solax Monitoring</h1>
          <p className="text-muted-foreground text-sm">Admin panelga kirish uchun tizimga kiring</p>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-100 bg-card p-6 dark:border-neutral-800">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="admin@solax.local" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Parol</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2 w-full">
            {pending ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  )
}
