"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { uz } from "date-fns/locale"
import { MoreHorizontal, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DeviceStatusBadge } from "@/components/status-indicator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
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
  initialDevices = [],
  initialTotal = 0,
  initialHasMore = false,
}: {
  initialDevices?: (DeviceRow & { tokenId?: string | null })[]
  initialTotal?: number
  initialHasMore?: boolean
}) {
  const router = useRouter()
  const [items, setItems] = useState<(DeviceRow & { tokenId?: string | null })[]>(initialDevices)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [editing, setEditing] = useState<EditableDevice | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState<DeviceRow | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Count status types from loaded items
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: totalCount }
    for (const d of items) counts[d.status] = (counts[d.status] ?? 0) + 1
    return counts
  }, [items, totalCount])

  // Fetch page 1 when search/filter/sort changes
  const fetchFirstPage = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        query: debouncedQuery.trim(),
        status: statusFilter,
        sortField,
        sortDir,
      })
      const res = await fetch(`/api/devices?${params.toString()}`)
      const data = await res.json()
      if (res.ok && data.devices) {
        setItems(data.devices)
        setTotalCount(data.total ?? data.devices.length)
        setPage(1)
        setHasMore(data.hasMore ?? false)
      }
    } catch (err) {
      console.error("Qurilmalarni yuklashda xatolik:", err)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, statusFilter, sortField, sortDir])

  // Re-fetch initial page on filter change (skip first render if using initial props)
  const [isFirstRender, setIsFirstRender] = useState(true)
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false)
      return
    }
    fetchFirstPage()
  }, [debouncedQuery, statusFilter, sortField, sortDir, fetchFirstPage])

  // Load next batch on scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return
    setIsLoadingMore(true)
    try {
      const nextPage = page + 1
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "20",
        query: debouncedQuery.trim(),
        status: statusFilter,
        sortField,
        sortDir,
      })
      const res = await fetch(`/api/devices?${params.toString()}`)
      const data = await res.json()
      if (res.ok && data.devices) {
        setItems((prev) => {
          const existing = new Set(prev.map((d) => d.sn))
          const newUnique = data.devices.filter((d: DeviceRow) => !existing.has(d.sn))
          return [...prev, ...newUnique]
        })
        setPage(nextPage)
        setHasMore(data.hasMore ?? false)
      }
    } catch (err) {
      console.error("Keyingi sahifani yuklashda xatolik:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [page, isLoadingMore, hasMore, isLoading, debouncedQuery, statusFilter, sortField, sortDir])

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoading || isLoadingMore,
  })

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir(field === "name" ? "asc" : "desc")
    }
  }

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
      fetchFirstPage()
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
              {statusCounts[f.value] != null && (
                <span className="ml-1 text-muted-foreground">{statusCounts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-md border border-neutral-100 dark:border-neutral-800">
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
            {items.map((device) => (
              <TableRow key={device.id} className="transition-colors hover:bg-muted/50">
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
                    <span className="font-medium">
                      {device.latestReading.acPower >= 1000
                        ? `${(device.latestReading.acPower / 1000).toFixed(1)} kW`
                        : `${device.latestReading.acPower.toFixed(0)} W`}
                    </span>
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

            {/* Skeleton Loading Rows when fetching next page */}
            {isLoadingMore && (
              <>
                {[1, 2, 3].map((idx) => (
                  <TableRow key={`skeleton-${idx}`} className="animate-pulse opacity-70">
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  </TableRow>
                ))}
              </>
            )}

            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-12 text-center">
                  {totalCount === 0
                    ? "Hali qurilma qo'shilmagan"
                    : "Qidiruv/filtr bo'yicha qurilma topilmadi"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Sentinel Trigger Element for YouTube-style infinite scroll */}
        <div ref={sentinelRef} className="h-4 w-full" />
      </div>

      {/* Infinite Scroll Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Yuklandi: {items.length} / {totalCount} ta qurilma</span>
        {isLoadingMore && (
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <Loader2 className="size-3.5 animate-spin" />
            Yangi qurilmalar yuklanmoqda...
          </span>
        )}
        {!hasMore && items.length > 0 && (
          <span>Barcha qurilmalar yuklandi</span>
        )}
      </div>

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

