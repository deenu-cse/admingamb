"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { adminSocket, watchMatch } from "@/lib/socket";

/** Runs `fn` at most once per `ms`, always including the latest call, so a burst becomes one refetch. */
export function throttled(fn: () => void, ms: number): { call: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    call: () => {
      timer ??= setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

/** Refetches `keys` when the staff socket reports activity; `enabled: false` pauses the feed. */
export function useAdminEvents(events: string[], keys: QueryKey[], opts: { enabled?: boolean; ms?: number } = {}) {
  const qc = useQueryClient();
  const { enabled = true, ms = 1000 } = opts;
  const latest = useRef({ keys });
  useEffect(() => {
    latest.current = { keys };
  });
  const eventList = events.join(",");
  useEffect(() => {
    if (!enabled) return;
    const socket = adminSocket();
    const refresh = throttled(() => latest.current.keys.forEach((queryKey) => void qc.invalidateQueries({ queryKey })), ms);
    const names = eventList.split(",");
    for (const e of names) socket.on(e, refresh.call);
    return () => {
      refresh.cancel();
      for (const e of names) socket.off(e, refresh.call);
    };
  }, [qc, eventList, enabled, ms]);
}

/** Refetches `keys` when this match's score or markets change. */
export function useMatchEvents(matchId: string, keys: QueryKey[]) {
  const qc = useQueryClient();
  const latest = useRef({ keys });
  useEffect(() => {
    latest.current = { keys };
  });
  useEffect(() => {
    const refresh = throttled(() => latest.current.keys.forEach((queryKey) => void qc.invalidateQueries({ queryKey })), 750);
    const stop = watchMatch(matchId, refresh.call);
    return () => {
      refresh.cancel();
      stop();
    };
  }, [qc, matchId]);
}
