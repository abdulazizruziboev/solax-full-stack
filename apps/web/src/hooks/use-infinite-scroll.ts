"use client"

import { useEffect, useRef } from "react"

interface UseInfiniteScrollOptions {
  onLoadMore: () => void | Promise<void>
  hasMore: boolean
  isLoading: boolean
  threshold?: number
}

/**
 * Reusable IntersectionObserver hook for YouTube-style infinite scroll pagination.
 * Attach the returned `sentinelRef` to an element at the bottom of the list.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Keep the latest values in refs so the observer callback never goes stale.
  // Refs are written in an effect (not during render) to stay concurrent-safe.
  const onLoadMoreRef = useRef(onLoadMore)
  const hasMoreRef = useRef(hasMore)
  const isLoadingRef = useRef(isLoading)
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
    hasMoreRef.current = hasMore
    isLoadingRef.current = isLoading
  })

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target?.isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          onLoadMoreRef.current()
        }
      },
      {
        root: null,
        rootMargin: "150px", // Trigger 150px before scrolling into view
        threshold,
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [threshold, hasMore])

  return { sentinelRef }
}
