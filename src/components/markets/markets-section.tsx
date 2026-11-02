"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/common/data-table";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useMatchEvents } from "@/hooks/use-live-refresh";
import { marketsApi } from "@/lib/api/endpoints";
import type { AdminMarket } from "@/lib/api/types";
import { formatBps, formatOdds, formatTokens, humanize } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { CreateMarketDialog } from "./create-market-dialog";
import { MarketActions } from "./market-actions";

const STATUSES = ["OPEN", "SUSPENDED", "CLOSED", "SETTLED", "VOID", "PENDING"].map((value) => ({ value, label: humanize(value) }));

function worstCase(m: AdminMarket): number | null {
  const values = Object.values(m.book?.worstCaseLoss ?? {});
  return values.length ? Math.max(...values) : null;
}

const COLUMNS: Array<Column<AdminMarket>> = [
  {
    header: "Market",
    cell: (m) => (
      <div className="min-w-44">
        <p className="font-medium">{m.name}</p>
        <p className="text-xs text-muted-foreground">{m.inPlay ? "In-play" : "Pre-match"}{m.autoManaged ? "" : " · priced by hand"}</p>
      </div>
    ),
  },
  {
    header: "Status",
    cell: (m) => (
      <div className="grid gap-0.5">
        <StatusBadge status={m.status} />
        {m.suspendReason && <span className="text-xs text-muted-foreground">{humanize(m.suspendReason)}</span>}
      </div>
    ),
  },
  {
    header: "Selections",
    cell: (m) => (
      <ul className="tabular grid min-w-40 gap-0.5 text-xs">
        {m.selections.slice(0, 6).map((s) => (
          <li key={s.id} className="flex justify-between gap-3">
            <span className="truncate">{s.name}</span>
            <span>{formatOdds(s.odds)}</span>
          </li>
        ))}
        {m.selections.length > 6 && <li className="text-muted-foreground">+{m.selections.length - 6} more</li>}
      </ul>
    ),
  },
  { header: "Margin", align: "right", cell: (m) => formatBps(m.marginBps) },
  { header: "Stake range", align: "right", cell: (m) => <span className="whitespace-nowrap">{formatTokens(m.minStake)} – {formatTokens(m.maxStake)}</span> },
  { header: "Max liability", align: "right", cell: (m) => formatTokens(m.maxLiability) },
  { header: "Delay", align: "right", cell: (m) => `${(m.betDelayMs / 1000).toFixed(1)}s` },
  { header: "Staked", align: "right", cell: (m) => formatTokens(m.book?.totalStake ?? 0) },
  {
    header: "Worst case",
    align: "right",
    cell: (m) => {
      const w = worstCase(m);
      return w === null ? "—" : formatTokens(Math.max(0, w));
    },
  },
  { header: "Action", cell: (m) => <MarketActions market={m} /> },
];

export function MarketsSection({ matchId, finished }: { matchId: string; finished: boolean }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.markets(matchId), queryFn: () => marketsApi.list(matchId), refetchInterval: 20_000 });
  useMatchEvents(matchId, [qk.markets(matchId)]);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const rows = status ? data?.filter((m) => m.status === status) : data;

  return (
    <section aria-label="Markets" className="grid gap-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-base font-semibold">Markets</h2>
        <div className="flex flex-wrap items-end gap-2">
          <SelectField label="Status" value={status} onChange={setStatus} options={STATUSES} anyLabel="Any status" />
          {!finished && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" aria-hidden /> New market
            </Button>
          )}
        </div>
      </div>
      {isPending ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState title={status ? "No markets in this state" : "No markets yet"} hint={status ? undefined : "Markets are created when a match syncs. Try Re-evaluate markets."} />
      ) : (
        <DataTable caption="Markets on this match" rows={rows} columns={COLUMNS} rowKey={(m) => m.id} />
      )}
      {creating && <CreateMarketDialog matchId={matchId} onClose={() => setCreating(false)} />}
    </section>
  );
}
