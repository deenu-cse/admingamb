"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/common/reason-dialog";
import { ErrorState, ListSkeleton, PageTitle } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { MarketsSection } from "@/components/markets/markets-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMatchEvents } from "@/hooks/use-live-refresh";
import { errorMessage } from "@/lib/api/client";
import { matchesApi } from "@/lib/api/endpoints";
import type { MatchDetail } from "@/lib/api/types";
import { formatDateTime, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";

function LiveState({ match }: { match: MatchDetail }) {
  const s = match.currentState;
  const [a, b] = match.teams;
  const pa = s?.winProbabilityBps === null || s?.winProbabilityBps === undefined ? null : Math.round(s.winProbabilityBps / 100);
  return (
    <Card className="gap-2 p-3">
      <div className="grid gap-1">
        {match.teams.map((team) => {
          const innings = match.score.filter((i) => i.teamKey === team.key);
          return (
            <div key={team.key} className="flex items-baseline justify-between gap-2">
              <span className="truncate">{team.name}</span>
              <span className="tabular font-semibold">{innings.length ? innings.map((i) => `${i.runs}/${i.wickets} (${i.overs})`).join(" & ") : "—"}</span>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">{match.statusText || "Waiting for the match to start"}</p>
      {s && (
        <dl className="tabular grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Run rate</dt><dd>{(s.runRate100 / 100).toFixed(2)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Target</dt><dd>{s.target ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Required rate</dt><dd>{s.requiredRunRate100 === null ? "—" : (s.requiredRunRate100 / 100).toFixed(2)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Win probability</dt><dd>{pa === null || !a || !b ? "—" : `${a.shortName} ${pa}% · ${b.shortName} ${100 - pa}%`}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted-foreground">Batting</dt><dd>{[s.striker, s.nonStriker].flatMap((p) => (p ? [`${p.name} ${p.runs} (${p.balls})`] : [])).join(", ") || "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Bowling</dt><dd>{s.bowler ? `${s.bowler.name} ${s.bowler.wickets}/${s.bowler.runs}` : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Last balls</dt><dd>{s.lastSixBalls.join(" ") || "—"}</dd></div>
        </dl>
      )}
    </Card>
  );
}

function MatchControls({ match }: { match: MatchDetail }) {
  const qc = useQueryClient();
  const [change, setChange] = useState<"betting" | "featured" | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["matches", "detail", match.id] });
  const resync = useMutation({
    mutationFn: () => matchesApi.resync(match.id),
    onSuccess: (r) => {
      toast.success(r.changed ? "Resynced: match data updated" : "Resynced: already up to date");
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const reevaluate = useMutation({
    mutationFn: () => matchesApi.reevaluate(match.id),
    onSuccess: () => {
      toast.success("Markets re-evaluated");
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Switch id="betting" checked={match.bettingEnabled} onCheckedChange={() => setChange("betting")} />
        <Label htmlFor="betting">Betting</Label>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Switch id="featured" checked={match.featured} onCheckedChange={() => setChange("featured")} />
        <Label htmlFor="featured">Featured</Label>
      </div>
      <Button variant="outline" size="sm" disabled={resync.isPending} onClick={() => resync.mutate()}>
        {resync.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
        Force resync
      </Button>
      <Button variant="outline" size="sm" disabled={reevaluate.isPending} onClick={() => reevaluate.mutate()}>
        Re-evaluate markets
      </Button>
      {change && (
        <ReasonDialog
          open
          onOpenChange={(open) => !open && setChange(null)}
          title={change === "betting" ? (match.bettingEnabled ? "Turn betting off?" : "Turn betting on?") : match.featured ? "Remove from featured?" : "Feature this match?"}
          description={change === "betting" ? (match.bettingEnabled ? "Suspends every market on this match. Open bets are not affected." : "Lets this match's markets open again.") : "Changes where this match appears on the player home page."}
          confirmLabel="Confirm"
          destructive={change === "betting" && match.bettingEnabled}
          success="Match updated"
          onConfirm={(reason) => matchesApi.patch(match.id, change === "betting" ? { bettingEnabled: !match.bettingEnabled, reason } : { featured: !match.featured, reason })}
          onDone={refresh}
        />
      )}
    </>
  );
}

export function MatchDetailView({ id }: { id: string }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.match(id), queryFn: () => matchesApi.get(id), refetchInterval: 20_000 });
  useMatchEvents(id, [qk.match(id)]);

  return (
    <>
      <Link href="/matches" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> Matches
      </Link>
      {isPending ? (
        <ListSkeleton rows={4} className="h-20" />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : (
        <div className="grid gap-3">
          <PageTitle hint={`${data.format} · ${data.source} · starts ${formatDateTime(data.startTime)} · synced ${relativeTime(data.lastSyncedAt)}`} actions={<MatchControls match={data} />}>
            <span className="inline-flex items-center gap-2">
              {data.title}
              <StatusBadge status={data.status} />
            </span>
          </PageTitle>
          {data.stale && (
            <Alert>
              <AlertDescription>Data is stale: in-play markets stay suspended until the feed recovers.</AlertDescription>
            </Alert>
          )}
          <LiveState match={data} />
          <MarketsSection matchId={id} finished={["COMPLETED", "ABANDONED", "NO_RESULT"].includes(data.status)} />
        </div>
      )}
    </>
  );
}
