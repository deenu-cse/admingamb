"use client";

import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import type { Page } from "@/lib/api/types";

/** Cursor pagination shared by every admin table. */
export function usePaged<T>(queryKey: QueryKey, fetchPage: (cursor: string | undefined) => Promise<Page<T>>, opts: { refetchInterval?: number; enabled?: boolean } = {}) {
  const q = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    ...opts,
  });
  return { ...q, items: q.data?.pages.flatMap((p) => p.items) ?? [] };
}
