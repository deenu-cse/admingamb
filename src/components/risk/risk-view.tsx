"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BetsTable } from "@/components/bets/bets-table";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/common/states";
import { StatTile } from "@/components/common/stat-tile";
import { StatusBadge } from "@/components/common/status-badge";
import { useAdminEvents } from "@/hooks/use-live-refresh";
import { riskApi } from "@/lib/api/endpoints";
import type { ExposureRow, UnusualWinner } from "@/lib/api/types";
import { formatBps, formatTokens, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

function Utilization({ bps }: { bps: number }) {
  const pct = Math.min(100, bps / 100);
  return (
    <div className="min-w-24">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn("h-full rounded-full", bps >= 8000 ? "bg-down" : bps >= 5000 ? "bg-chart-4" : "bg-chart-1")} style={{ width: `${pct}%` }} />
      </div>
      <p className="tabular mt-0.5 text-xs text-muted-foreground">{formatBps(bps)} of limit</p>
    </div>
  );
}

const MARKETS: Array<Column<ExposureRow>> = [
  {
    header: "Market",
    cell: (m) => (
      <Link href={`/matches/${m.matchId}`} className="block min-w-48 underline-offset-2 hover:underline">
        <span className="font-medium">{m.marketName}</span>
        <span className="block text-xs text-muted-foreground">{m.matchTitle}</span>
      </Link>
    ),
  },
  { header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
  { header: "Bets", align: "right", cell: (m) => m.bets },
  { header: "Staked", align: "right", cell: (m) => formatTokens(m.totalStake) },
  {
    header: "House P&L if it wins",
    cell: (m) => (
      <ul className="tabular grid min-w-52 gap-0.5 text-xs">
        {[...m.selections].sort((a, b) => b.worstCaseLoss - a.worstCaseLoss).slice(0, 5).map((s) => (
          <li key={s.id} className="flex justify-between gap-3">
            <span className="truncate">{s.name}</span>
            <span>{formatTokens(-s.worstCaseLoss, { sign: true })}</span>
          </li>
        ))}
      </ul>
    ),
  },
  { header: "Worst case", align: "right", cell: (m) => formatTokens(Math.max(0, m.worstCaseLoss)) },
  { header: "Limit used", cell: (m) => <Utilization bps={m.utilizationBps} /> },
];

const WINNERS: Array<Column<UnusualWinner>> = [
  { header: "User", cell: (u) => <Link href={`/users/${u.userId}`} className="underline-offset-2 hover:underline">{u.user?.name ?? "Unknown"}</Link> },
  { header: "Bets", align: "right", cell: (u) => u.bets },
  { header: "Won", align: "right", cell: (u) => u.wins },
  { header: "Win rate", align: "right", cell: (u) => formatBps(u.winRateBps) },
  { header: "Prices implied", align: "right", cell: (u) => formatBps(u.expectedWinRateBps) },
  { header: "Std. deviations", align: "right", cell: (u) => (u.zScoreX100 / 100).toFixed(1) },
  { header: "Net won", align: "right", cell: (u) => formatTokens(u.netWin, { sign: true }) },
];

export function RiskView() {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.risk, queryFn: () => riskApi.get(), refetchInterval: 20_000 });
  useAdminEvents(["admin:liability", "admin:bet"], [qk.risk], { ms: 1500 });

  return (
    <>
      <PageTitle hint="Updates as bets come in.">Risk &amp; liability</PageTitle>
      {isPending ? (
        <ListSkeleton rows={5} className="h-16" />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <StatTile label="Total worst-case liability" value={formatTokens(data.totalLiability)} hint="Sum of each market's worst outcome" />
            <StatTile label="Markets with open bets" value={data.markets.length} />
            <StatTile label="Updated" value={relativeTime(data.generatedAt)} />
          </div>

          <section aria-label="Liability by market" className="grid gap-2">
            <h2 className="text-base font-semibold">Liability by market</h2>
            {data.markets.length === 0 ? <EmptyState title="No open exposure" hint="Markets show here once they have open bets." /> : <DataTable caption="Liability by market" rows={data.markets} columns={MARKETS} rowKey={(m) => m.marketId} />}
          </section>

          <section aria-label="Biggest open bets" className="grid gap-2">
            <h2 className="text-base font-semibold">Biggest open bets</h2>
            {data.biggestBets.length === 0 ? <EmptyState title="No open bets" /> : <BetsTable bets={data.biggestBets} caption="Biggest open bets by potential return" />}
          </section>

          <section aria-label="Unusual win rates" className="grid gap-2">
            <div>
              <h2 className="text-base font-semibold">Unusual win rates</h2>
              <p className="text-sm text-muted-foreground">
                Players at least {data.window.minZScore} standard deviations above what their odds implied, over {data.window.minBets}+ settled bets in {data.window.days} days. A lucky run can land here too, so treat it as a prompt to look, not proof.
              </p>
            </div>
            {data.unusualWinRates.length === 0 ? <EmptyState title="Nobody flagged" hint="Everyone's results are in line with their odds." /> : <DataTable caption="Players beating their odds" rows={data.unusualWinRates} columns={WINNERS} rowKey={(u) => u.userId} />}
          </section>
        </div>
      )}
    </>
  );
}
