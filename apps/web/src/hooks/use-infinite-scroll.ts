"use client"

import { useEffect, useRef, useCallback } from "react"

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
  threshold = 0.5,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target?.isIntersecting && hasMore && !isLoading) {
        onLoadMoreRef.current()
      }
    },
    [hasMore, isLoading]
  )

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "200px", // Trigger 200px before scrolling into view for smooth prefetching
      threshold,
    })

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [handleIntersect, hasMore])

  return { sentinelRef }
}
