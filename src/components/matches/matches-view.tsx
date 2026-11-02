"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column } from "@/components/common/data-table";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { EmptyState, ErrorState, ListSkeleton, LoadMore, PageTitle } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounced } from "@/hooks/use-debounced";
import { usePaged } from "@/hooks/use-paged";
import { matchesApi } from "@/lib/api/endpoints";
import type { AdminMatch } from "@/lib/api/types";
import { formatDateTime, formatTokens, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { PendingSettlements } from "./pending-settlements";

export function scoreLine(m: Pick<AdminMatch, "score">): string {
  return m.score.map((i) => `${i.runs}/${i.wickets} (${i.overs})`).join(" · ") || "—";
}

export function MatchesView() {
  const qc = useQueryClient();
  const [bucket, setBucket] = useState("all");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<AdminMatch | null>(null);
  const q = useDebounced(search.trim());
  const query = { bucket, q };
  const list = usePaged(qk.matches(query), (cursor) => matchesApi.list({ ...query, cursor, limit: 25 }), { refetchInterval: 15_000 });

  const columns: Array<Column<AdminMatch>> = [
    {
      header: "Match",
      cell: (m) => (
        <Link href={`/matches/${m.id}`} className="block min-w-52 underline-offset-2 hover:underline">
          <span className="font-medium">{m.title}</span>
          <span className="block text-xs text-muted-foreground">{m.format} · {m.source} · {formatDateTime(m.startTime)}</span>
        </Link>
      ),
    },
    { header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
    { header: "Score", cell: (m) => <span className="tabular whitespace-nowrap">{scoreLine(m)}</span> },
    { header: "Betting", cell: (m) => <Switch checked={m.bettingEnabled} aria-label={`Betting on ${m.title}`} onCheckedChange={() => setToggling(m)} /> },
    { header: "Markets", align: "right", cell: (m) => `${m.markets.open} / ${m.markets.total}` },
    { header: "Open bets", align: "right", cell: (m) => m.openBets },
    { header: "Open stake", align: "right", cell: (m) => formatTokens(m.openStake) },
    { header: "Last sync", cell: (m) => (m.stale ? <StatusBadge status="SUSPENDED" label="Stale" /> : relativeTime(m.lastSyncedAt)) },
  ];

  return (
    <>
      <PageTitle hint="Everything synced from the data provider or a replay.">Matches &amp; markets</PageTitle>
      <PendingSettlements />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tabs value={bucket} onValueChange={setBucket}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="recent">Finished</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input aria-label="Search matches" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by team or title" />
        </div>
      </div>
      {list.isPending ? (
        <ListSkeleton rows={6} />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No matches here" hint="Start a replay from Settings, or check that the provider is syncing in System health." />
      ) : (
        <>
          <DataTable caption="Matches" rows={list.items} columns={columns} rowKey={(m) => m.id} />
          <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
        </>
      )}
      {toggling && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setToggling(null)}
          title={toggling.bettingEnabled ? "Turn betting off?" : "Turn betting on?"}
          description={toggling.bettingEnabled ? `Suspends every market on ${toggling.title} until it's turned back on. Open bets are not affected.` : `Lets markets on ${toggling.title} open again.`}
          confirmLabel={toggling.bettingEnabled ? "Turn betting off" : "Turn betting on"}
          destructive={toggling.bettingEnabled}
          success="Betting updated"
          onConfirm={(reason) => matchesApi.patch(toggling.id, { bettingEnabled: !toggling.bettingEnabled, reason })}
          onDone={() => void qc.invalidateQueries({ queryKey: ["matches"] })}
        />
      )}
    </>
  );
}
