"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { uz } from "date-fns/locale"
import { MoreHorizontal, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DeviceStatusBadge } from "@/components/status-indicator"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditDeviceDialog, type EditableDevice } from "./edit-device-dialog"

export interface DeviceRow {
  id: string
  sn: string
  inverterSn?: string | null
  name: string
  plantName: string | null
  status: string
  lastSeenAt: Date | null
  latestReading?: { acPower: number | null; yieldToday: number | null } | null
}

type SortField = "name" | "power" | "yield" | "lastSeen"
type SortDir = "asc" | "desc"

// Top-level (not defined during render) so it keeps a stable identity across
// renders — React treats an inline component as a brand-new type each render.
function SortHeader({
  field,
  sortField,
  sortDir,
  onToggle,
  children,
  className,
}: {
  field: SortField
  sortField: SortField
  sortDir: SortDir
  onToggle: (f: SortField) => void
  children: React.ReactNode
  className?: string
}) {
  const active = sortField === field
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className={cn(
        "flex items-center gap-1 text-left transition-colors hover:text-foreground",
        active ? "text-foreground" : "",
        className
      )}
    >
      {children}
      <Icon className={cn("size-3", active ? "opacity-100" : "opacity-40")} />
    </button>
  )
}

export function DevicesTable({
  devices,
}: {
  devices: (DeviceRow & { tokenId?: string | null })[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditableDevice | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState<DeviceRow | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: devices.length }
    for (const d of devices) counts[d.status] = (counts[d.status] ?? 0) + 1
    return counts
  }, [devices])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      // Numeric/time columns read best largest-first on first click.
      setSortDir(field === "name" ? "asc" : "desc")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = devices.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        d.sn.toLowerCase().includes(q) ||
        (d.plantName ?? "").toLowerCase().includes(q)
      )
    })

    const dir = sortDir === "asc" ? 1 : -1
    rows.sort((a, b) => {
      switch (sortField) {
        case "power": {
          const av = a.latestReading?.acPower ?? -1
          const bv = b.latestReading?.acPower ?? -1
          return (av - bv) * dir
        }
        case "yield": {
          const av = a.latestReading?.yieldToday ?? -1
          const bv = b.latestReading?.yieldToday ?? -1
          return (av - bv) * dir
        }
        case "lastSeen": {
          const av = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0
          const bv = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0
          return (av - bv) * dir
        }
        default:
          return a.name.localeCompare(b.name, "uz") * dir
      }
    })
    return rows
  }, [devices, query, statusFilter, sortField, sortDir])

  const filters: { value: string; label: string }[] = [
    { value: "ALL", label: "Barchasi" },
    { value: "ONLINE", label: "Onlayn" },
    { value: "ALARM", label: "Alarm" },
    { value: "OFFLINE", label: "Oflayn" },
    { value: "UNKNOWN", label: "Noma'lum" },
  ]

  async function confirmDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(deleting.sn)}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "O'chirishda xatolik")
        return
      }

      toast.success("Qurilma o'chirildi")
      setDeleting(null)
      router.refresh()
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, SN yoki plant bo'yicha qidirish..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-100 p-1 dark:border-neutral-800">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="ml-1 text-muted-foreground">{statusCounts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader field="name" sortField={sortField} sortDir={sortDir} onToggle={toggleSort}>
                Nom
              </SortHeader>
            </TableHead>
            <TableHead>SN</TableHead>
            <TableHead>Plant</TableHead>
            <TableHead className="text-right">
              <SortHeader field="power" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} className="ml-auto justify-end">
                Quvvat
              </SortHeader>
            </TableHead>
            <TableHead className="text-right">
              <SortHeader field="yield" sortField={sortField} sortDir={sortDir} onToggle={toggleSort} className="ml-auto justify-end">
                Bugun
              </SortHeader>
            </TableHead>
            <TableHead>Holat</TableHead>
            <TableHead>
              <SortHeader field="lastSeen" sortField={sortField} sortDir={sortDir} onToggle={toggleSort}>
                Oxirgi ko&apos;rilgan
              </SortHeader>
            </TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
            {filtered.map((device) => (
              <TableRow key={device.id}>
                <TableCell>
                  <Link
                    href={`/devices/${encodeURIComponent(device.sn)}`}
                    className="font-medium hover:underline"
                  >
                    {device.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {device.sn}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {device.plantName ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {device.latestReading?.acPower != null ? (
                    <>
                      <span className="font-medium">
                        {device.latestReading.acPower >= 1000
                          ? `${(device.latestReading.acPower / 1000).toFixed(1)} kW`
                          : `${device.latestReading.acPower.toFixed(0)} W`}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {device.latestReading?.yieldToday != null ? (
                    <span>
                      {device.latestReading.yieldToday.toFixed(1)}
                      <span className="text-muted-foreground ml-0.5 text-xs">kWh</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DeviceStatusBadge status={device.status} />
                </TableCell>
                <TableCell
                  className="text-muted-foreground whitespace-nowrap"
                  title={
                    device.lastSeenAt
                      ? new Date(device.lastSeenAt).toLocaleString("uz-UZ")
                      : undefined
                  }
                >
                  {device.lastSeenAt
                    ? formatDistanceToNow(new Date(device.lastSeenAt), {
                        addSuffix: true,
                        locale: uz,
                      })
                    : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing({
                            id: device.id,
                            sn: device.sn,
                            inverterSn: device.inverterSn ?? null,
                            name: device.name,
                            tokenId: device.tokenId ?? null,
                            plantName: device.plantName,
                          })
                          setEditOpen(true)
                        }}
                      >
                        <Pencil />
                        Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleting(device)}
                      >
                        <Trash2 />
                        O&apos;chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground text-center py-12">
                  {devices.length === 0
                    ? "Hali qurilma qo'shilmagan"
                    : "Qidiruv/filtr bo'yicha qurilma topilmadi"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      <EditDeviceDialog device={editing} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Qurilmani o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; ({deleting?.sn}) qurilmasi va unga tegishli barcha
              o&apos;qishlar hamda alarmlar butunlay o&apos;chiriladi. Bu amalni orqaga
              qaytarib bo&apos;lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePending ? "O'chirilmoqda..." : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
