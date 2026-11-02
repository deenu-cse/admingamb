"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { StaffUser } from "@/lib/api/types";
import { qk } from "@/lib/query-keys";
import { disconnectAdminSocket } from "@/lib/socket";

/** The signed-in admin, or null when signed out. Never throws for "not logged in". */
export function useMe() {
  return useQuery<StaffUser | null>({
    queryKey: qk.me,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      disconnectAdminSocket();
      qc.clear();
      router.replace("/login");
      router.refresh();
    },
  });
}
