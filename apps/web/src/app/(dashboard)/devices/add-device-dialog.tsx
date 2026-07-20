"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeviceForm } from "./device-form"
import { DeviceImport } from "./device-import"

export function AddDeviceDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus />Qurilma qo&apos;shish</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Qurilma qo&apos;shish</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1">
              Qo&apos;lda
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1">
              Fayldan (Excel/CSV)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="pt-2">
            <DeviceForm onDone={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="import" className="pt-2">
            <DeviceImport onDone={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
