"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { Delete, Loader2 } from "lucide-react"
import { loginAction } from "./actions"

export function LoginForm({ pinLength = 6 }: { pinLength?: number }) {
  const [pin, setPin] = useState("")
  const [shake, setShake] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount so physical keyboard typing works right away
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submitPin(code: string) {
    if (isPending) return
    setErrorMsg(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("pin", code)
      const res = await loginAction({}, formData)

      if (res?.error) {
        setShake(true)
        setErrorMsg(res.error)
        setPin("") // Clear dots immediately on wrong PIN
        setTimeout(() => {
          setShake(false)
          inputRef.current?.focus()
        }, 500)
      }
    })
  }

  function handleDigit(digit: string) {
    if (isPending) return
    setErrorMsg(null)
    const next = pin + digit
    if (next.length > pinLength) return
    setPin(next)

    if (next.length === pinLength) {
      submitPin(next)
    }
  }

  function handleBackspace() {
    if (isPending) return
    setErrorMsg(null)
    setPin((prev) => prev.slice(0, -1))
  }

  function handleClear() {
    if (isPending) return
    setErrorMsg(null)
    setPin("")
    inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center justify-center">
      {/* Brand Header */}
      <div className="mb-3 flex flex-col items-center gap-3 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-white p-2 shadow-sm border border-border/40 overflow-hidden">
          <Image
            src="/logo.png"
            alt="Solar Pro Logo"
            width={80}
            height={80}
            priority
            unoptimized
            className="size-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Solar Pro Monitoring</h1>
          <p className="text-muted-foreground text-xs mt-0.5">PIN kodni kiriting</p>
        </div>
      </div>

      <div className="w-full flex flex-col items-center">
        {/* Hidden input for physical keyboard typing */}
        <input
          ref={inputRef}
          type="password"
          value={pin}
          disabled={isPending}
          onChange={(e) => {
            if (isPending) return
            setErrorMsg(null)
            const val = e.target.value.replace(/\D/g, "").slice(0, pinLength)
            setPin(val)
            if (val.length === pinLength) {
              submitPin(val)
            }
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="sr-only"
          autoFocus
        />

        {/* Visual PIN Dots Indicator */}
        <div
          onClick={() => inputRef.current?.focus()}
          className={`cursor-pointer flex flex-wrap max-w-[280px] items-center justify-center gap-2.5 py-1 px-4 rounded-xl hover:bg-muted/40 transition-all ${
            shake ? "animate-shake text-destructive" : ""
          }`}
        >
          {Array.from({ length: pinLength }).map((_, idx) => {
            const isFilled = idx < pin.length
            return (
              <div
                key={idx}
                className={`transition-all duration-200 rounded-full ${
                  isFilled
                    ? "size-3.5 bg-foreground scale-110 shadow-sm"
                    : "size-3 bg-muted-foreground/30 border border-muted-foreground/40"
                } ${shake ? "bg-destructive border-destructive" : ""}`}
              />
            )
          })}
        </div>

        {/* Fixed-height Status / Error message / Loading indicator to prevent layout jumping */}
        <div className="h-6 flex items-center justify-center text-center my-1">
          {isPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Tekshirilmoqda...</span>
            </div>
          ) : errorMsg ? (
            <div className="text-xs font-medium text-destructive animate-in fade-in">
              {errorMsg}
            </div>
          ) : null}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            "1", "2", "3",
            "4", "5", "6",
            "7", "8", "9",
            "C", "0", "del"
          ].map((key) => {
            if (key === "C") {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleClear}
                  disabled={isPending || pin.length === 0}
                  className="flex size-14 sm:size-16 items-center justify-center rounded-2xl border border-border/40 bg-card text-sm font-medium text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  C
                </button>
              )
            }
            if (key === "del") {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={handleBackspace}
                  disabled={isPending || pin.length === 0}
                  className="flex size-14 sm:size-16 items-center justify-center rounded-2xl border border-border/40 bg-card text-muted-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Delete className="size-5" />
                </button>
              )
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                disabled={isPending || pin.length >= pinLength}
                className="flex size-14 sm:size-16 items-center justify-center rounded-2xl border border-border/40 bg-card text-xl font-medium tracking-tight shadow-2xs transition-all hover:bg-muted active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {key}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
