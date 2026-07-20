import { Skeleton } from "@/components/ui/skeleton"

export default function DevicesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
