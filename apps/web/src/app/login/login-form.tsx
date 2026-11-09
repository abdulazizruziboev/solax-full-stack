"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { Delete, Loader2 } from "lucide-react"
import { loginAction, type LoginActionState } from "./actions"

const initialState: LoginActionState = {}

export function LoginForm({ pinLength = 6 }: { pinLength?: number }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState)
  const [pin, setPin] = useState("")
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Focus input automatically so keyboard typing works right away
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-submit when PIN reaches required length
  useEffect(() => {
    if (pin.length === pinLength && !pending) {
      formRef.current?.requestSubmit()
    }
  }, [pin, pinLength, pending])

  // If error occurs, shake and clear the pin so user can re-try
  useEffect(() => {
    if (state.error) {
      setShake(true)
      const timer = setTimeout(() => {
        setPin("")
        setShake(false)
        inputRef.current?.focus()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [state.error])

  function handleDigit(digit: string) {
    if (pending || pin.length >= pinLength) return
    setPin((prev) => (prev.length < pinLength ? prev + digit : prev))
  }

  function handleBackspace() {
    if (pending) return
    setPin((prev) => prev.slice(0, -1))
  }

  function handleClear() {
    if (pending) return
    setPin("")
    inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
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
          <h1 className="text-xl font-semibold tracking-tight">Solar Pro Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">PIN kodni kiriting</p>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="w-full flex flex-col items-center">
        {/* Hidden / Transparent actual input for keyboard typing & form submission */}
        <input
          ref={inputRef}
          type="password"
          name="pin"
          value={pin}
          onChange={(e) => {
            if (pending) return
            const val = e.target.value.replace(/\D/g, "").slice(0, pinLength)
            setPin(val)
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="sr-only"
          autoFocus
        />

        {/* Visual PIN Dots Indicator */}
        <div
          onClick={() => inputRef.current?.focus()}
          className={`cursor-pointer flex flex-wrap max-w-[280px] items-center justify-center gap-2.5 py-2 px-4 rounded-xl hover:bg-muted/40 transition-all ${
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

        {/* Status / Error message / Loading indicator */}
        <div className="h-6 mb-4 flex items-center justify-center text-center">
          {pending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
              <Loader2 className="size-4 animate-spin" />
              <span>Tekshirilmoqda...</span>
            </div>
          ) : state.error ? (
            <div className="text-sm font-medium text-destructive animate-in fade-in">
              {state.error}
            </div>
          ) : null}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-2">
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
                  disabled={pending || pin.length === 0}
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
                  disabled={pending || pin.length === 0}
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
                disabled={pending || pin.length >= pinLength}
                className="flex size-14 sm:size-16 items-center justify-center rounded-2xl border border-border/40 bg-card text-xl font-medium tracking-tight shadow-2xs transition-all hover:bg-muted active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {key}
              </button>
            )
          })}
        </div>
      </form>
    </div>
  )
}
