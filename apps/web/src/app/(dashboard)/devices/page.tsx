import dynamicImport from "next/dynamic"
import { listDevicesPaginated } from "@/server/devices"
import { AddDeviceDialog } from "./add-device-dialog"
import { DevicesTable } from "./devices-table"
import { RefreshDevicesButton } from "./refresh-devices-button"
import type { DevicePdfRow } from "./devices-pdf-button"

const DevicesPdfButton = dynamicImport(
  () => import("./devices-pdf-button").then((mod) => mod.DevicesPdfButton),
  { ssr: false }
)

export const dynamic = "force-dynamic"

export default async function DevicesPage() {
  const { devices, total, hasMore } = await listDevicesPaginated({ page: 1, limit: 20 })

  const pdfRows: DevicePdfRow[] = devices.map((d) => ({
    name: d.name,
    sn: d.sn,
    plantName: d.plantName,
    status: d.status,
    acPowerW: d.latestReading?.acPower ?? null,
    lastSeen: d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("uz-UZ") : null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Qurilmalar</h1>
          <p className="text-muted-foreground text-sm">
            Jami {total} ta qurilma ro&apos;yxatdan o&apos;tgan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DevicesPdfButton rows={pdfRows} />
          <RefreshDevicesButton />
          <AddDeviceDialog />
        </div>
      </div>

      <DevicesTable
        initialDevices={devices}
        initialTotal={total}
        initialHasMore={hasMore}
      />
    </div>
  )
}
