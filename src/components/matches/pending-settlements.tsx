"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/api/client";
import { matchesApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query-keys";

/** Closed markets on finished matches that the resolvers couldn't decide, so they wait for a person. */
export function PendingSettlements() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: qk.pending, queryFn: matchesApi.pending, refetchInterval: 30_000 });
  const catchUp = useMutation({
    mutationFn: matchesApi.catchUp,
    onSuccess: () => {
      toast.success("Settlement catch-up finished");
      void qc.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  if (!data || data.length === 0) return null;

  return (
    <Card className="mb-3 gap-2 border-chart-4/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{data.length} {data.length === 1 ? "market needs" : "markets need"} manual settlement</h2>
        <Button variant="outline" size="xs" disabled={catchUp.isPending} onClick={() => catchUp.mutate()}>
          {catchUp.isPending && <Loader2 className="size-3 animate-spin" aria-hidden />}
          Run auto-settlement again
        </Button>
      </div>
      <ul className="grid gap-1 text-sm">
        {data.slice(0, 5).map(({ market, match }) => (
          <li key={market.id}>
            <Link href={`/matches/${market.matchId}`} className="underline-offset-2 hover:underline">
              {market.name}
            </Link>
            <span className="text-muted-foreground"> · {match?.title ?? "Unknown match"}</span>
          </li>
        ))}
      </ul>
      {data.length > 5 && <p className="text-xs text-muted-foreground">and {data.length - 5} more</p>}
    </Card>
  );
}
