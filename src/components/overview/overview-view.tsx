"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState, ListSkeleton, PageTitle } from "@/components/common/states";
import { StatTile } from "@/components/common/stat-tile";
import { useAdminEvents } from "@/hooks/use-live-refresh";
import { overviewApi } from "@/lib/api/endpoints";
import { formatTokens } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { OverviewCharts } from "./overview-charts";

const toneOf = (units: number) => (units > 0 ? "up" : units < 0 ? "down" : undefined);

export function OverviewView() {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.overview, queryFn: overviewApi.get, refetchInterval: 15_000 });
  useAdminEvents(["admin:bet", "admin:liability"], [qk.overview], { ms: 2000 });

  return (
    <>
      <PageTitle hint="Tokens are play money with no cash value. P&L is the house token account, from the ledger.">Overview</PageTitle>
      {isPending ? (
        <ListSkeleton rows={3} className="h-20" />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile label="Total users" value={data.users.total.toLocaleString("en-US")} hint={`${data.users.newToday} new today · ${data.users.suspended} suspended`} />
          <StatTile label="Active now" value={data.users.activeNow.toLocaleString("en-US")} hint="Players connected" />
          <StatTile label="Tokens in circulation" value={formatTokens(data.tokens.circulation)} hint={`${formatTokens(data.tokens.locked)} locked in bets`} />
          <StatTile label="Staked today (UTC)" value={formatTokens(data.today.staked)} hint={`${data.today.bets.toLocaleString("en-US")} bets`} />
          <StatTile label="House P&L today" value={formatTokens(data.housePnl.today, { sign: true })} tone={toneOf(data.housePnl.today)} />
          <StatTile label="House P&L 7 days" value={formatTokens(data.housePnl.d7, { sign: true })} tone={toneOf(data.housePnl.d7)} />
          <StatTile label="House P&L 30 days" value={formatTokens(data.housePnl.d30, { sign: true })} tone={toneOf(data.housePnl.d30)} />
          <StatTile label="Open bets" value={data.openBets.toLocaleString("en-US")} hint={`${formatTokens(data.totalLiability)} at risk`} />
        </div>
      )}
      <OverviewCharts />
    </>
  );
}
