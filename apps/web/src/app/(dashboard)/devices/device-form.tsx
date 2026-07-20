"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { deviceCreateSchema, type DeviceCreateInput } from "@solax/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export function DeviceForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const form = useForm<DeviceCreateInput>({
    resolver: zodResolver(deviceCreateSchema),
    defaultValues: { sn: "", inverterSn: "", tokenId: "", name: "", plantName: "" },
  })

  async function onSubmit(values: DeviceCreateInput) {
    setPending(true)
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Xatolik yuz berdi")
        return
      }

      toast.success("Qurilma qo'shildi")
      form.reset()
      router.refresh()
      onDone?.()
    } finally {
      setPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="sn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registratsiya raqami (SN)</FormLabel>
              <FormControl>
                <Input placeholder="Masalan: XSWEPKLALZ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qurilma nomi</FormLabel>
              <FormControl>
                <Input placeholder="Masalan: Fermer uy 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="inverterSn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inverter SN (ixtiyoriy)</FormLabel>
              <FormControl>
                <Input placeholder="Masalan: MPT30RM4652026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tokenId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TokenId (ixtiyoriy)</FormLabel>
              <FormControl>
                <Input placeholder="Bo'sh qoldirsangiz standart token ishlatiladi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plantName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plant nomi (ixtiyoriy)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Qo'shilmoqda..." : "Qurilma qo'shish"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
