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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

export interface EditableDevice {
  id: string
  sn: string
  inverterSn: string | null
  name: string
  tokenId: string | null
  plantName: string | null
}

export function EditDeviceDialog({
  device,
  open,
  onOpenChange,
}: {
  device: EditableDevice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const form = useForm<DeviceCreateInput>({
    resolver: zodResolver(deviceCreateSchema),
    values: device
      ? {
          sn: device.sn,
          inverterSn: device.inverterSn ?? "",
          name: device.name,
          tokenId: device.tokenId ?? "",
          plantName: device.plantName ?? "",
        }
      : { sn: "", inverterSn: "", name: "", tokenId: "", plantName: "" },
  })

  async function onSubmit(values: DeviceCreateInput) {
    if (!device) return
    setPending(true)
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(device.sn)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Xatolik yuz berdi")
        return
      }

      toast.success("Qurilma yangilandi")
      router.refresh()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Qurilmani tahrirlash</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registratsiya raqami (SN)</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                {pending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
