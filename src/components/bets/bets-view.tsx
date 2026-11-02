"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, ListSkeleton, LoadMore, PageTitle } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDebounced } from "@/hooks/use-debounced";
import { useAdminEvents } from "@/hooks/use-live-refresh";
import { usePaged } from "@/hooks/use-paged";
import { betsApi } from "@/lib/api/endpoints";
import { humanize, parseTokens } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { BetsTable } from "./bets-table";

const STATUSES = ["PENDING_DELAY", "ACCEPTED", "REJECTED", "WON", "LOST", "VOID", "CASHED_OUT"].map((value) => ({ value, label: humanize(value) }));

export function BetsView() {
  const router = useRouter();
  const params = useSearchParams();
  const marketId = params.get("marketId") ?? "";
  const matchId = params.get("matchId") ?? "";
  const [status, setStatus] = useState("");
  const [minStakeInput, setMinStakeInput] = useState("");
  const [live, setLive] = useState(true);
  const minStake = useDebounced(parseTokens(minStakeInput) ?? "");
  const query = { status, minStake, marketId, matchId };
  const list = usePaged(qk.bets(query), (cursor) => betsApi.list({ ...query, cursor, limit: 50 }));
  useAdminEvents(["admin:bet"], [["bets"]], { enabled: live });

  return (
    <>
      <PageTitle hint="Every bet, newest first." actions={
        <div className="flex items-center gap-2 text-sm">
          <Switch id="live-feed" checked={live} onCheckedChange={setLive} />
          <Label htmlFor="live-feed">Live feed</Label>
        </div>
      }>
        Bets monitor
      </PageTitle>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <SelectField label="Status" value={status} onChange={setStatus} options={STATUSES} anyLabel="Any status" />
        <div className="grid gap-1.5">
          <Label htmlFor="min-stake" className="text-xs text-muted-foreground">Minimum stake (tokens)</Label>
          <Input id="min-stake" inputMode="decimal" className="w-40" value={minStakeInput} onChange={(e) => setMinStakeInput(e.target.value)} placeholder="Any" />
        </div>
        {(marketId || matchId) && (
          <Button variant="outline" size="sm" onClick={() => router.replace("/bets")}>
            Clear {marketId ? "market" : "match"} filter
          </Button>
        )}
      </div>
      {list.isPending ? (
        <ListSkeleton rows={8} />
      ) : list.error ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState title="No bets match" hint="New bets appear here as they're placed." />
      ) : (
        <>
          <BetsTable bets={list.items} caption="Bets" />
          <LoadMore hasNext={list.hasNextPage} loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} />
        </>
      )}
    </>
  );
}
