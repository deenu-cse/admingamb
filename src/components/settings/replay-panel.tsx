"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/common/confirm-button";
import { DataTable, type Column } from "@/components/common/data-table";
import { SelectField } from "@/components/common/select-field";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/api/client";
import { replayApi } from "@/lib/api/endpoints";
import type { ReplayAction, ReplaySession } from "@/lib/api/types";
import { qk } from "@/lib/query-keys";

const SPEEDS = [
  { value: "1000", label: "1s per ball" },
  { value: "2000", label: "2s per ball" },
  { value: "5000", label: "5s per ball" },
  { value: "10000", label: "10s per ball" },
  { value: "20000", label: "20s per ball" },
  { value: "30000", label: "30s per ball" },
];
const STARTS = [
  { value: "0", label: "Straight away" },
  { value: "60", label: "In 1 minute" },
  { value: "300", label: "In 5 minutes" },
  { value: "3600", label: "In 1 hour" },
];

export function ReplayPanel() {
  const qc = useQueryClient();
  const scripts = useQuery({ queryKey: qk.replayScripts, queryFn: replayApi.scripts, staleTime: Infinity });
  const sessions = useQuery({ queryKey: qk.replaySessions, queryFn: replayApi.sessions, refetchInterval: 3000 });
  const [scriptId, setScriptId] = useState("");
  const [speed, setSpeed] = useState("5000");
  const [start, setStart] = useState("300");
  const refresh = () => void qc.invalidateQueries({ queryKey: qk.replaySessions });
  const fail = (err: unknown) => toast.error(errorMessage(err));

  const create = useMutation({
    mutationFn: () => replayApi.create({ scriptId, intervalMs: Number(speed), startInSec: Number(start) }),
    onSuccess: () => {
      toast.success("Replay created");
      refresh();
    },
    onError: fail,
  });
  const control = useMutation({ mutationFn: ({ id, action }: { id: string; action: ReplayAction }) => replayApi.control(id, action), onSuccess: refresh, onError: fail });
  const changeSpeed = useMutation({ mutationFn: ({ id, intervalMs }: { id: string; intervalMs: number }) => replayApi.speed(id, intervalMs), onSuccess: refresh, onError: fail });

  const titles = new Map(scripts.data?.map((s) => [s.id, s.title]));
  const act = (s: ReplaySession, action: ReplayAction, label: string) => (
    <Button variant="outline" size="xs" disabled={control.isPending} onClick={() => control.mutate({ id: s.id, action })}>
      {label}
    </Button>
  );

  const columns: Array<Column<ReplaySession>> = [
    {
      header: "Match",
      cell: (s) => {
        const title = titles.get(s.scriptId) ?? s.scriptId;
        return s.match ? <Link href={`/matches/${s.match.matchId}`} className="block w-56 font-medium whitespace-normal underline-offset-2 hover:underline">{title}</Link> : <span className="block w-56 font-medium whitespace-normal">{title}</span>;
      },
    },
    { header: "Replay", cell: (s) => <StatusBadge status={s.status} label={s.abandoned ? "Abandoned" : s.pauseReason === "rain" ? "Rain" : undefined} /> },
    { header: "Step", align: "right", cell: (s) => Math.max(0, s.cursor) },
    {
      header: "Speed",
      cell: (s) =>
        s.status === "finished" ? (
          `${s.intervalMs / 1000}s`
        ) : (
          <SelectField label="Speed" className="grid gap-0 [&>label]:sr-only" value={String(s.intervalMs)} onChange={(v) => changeSpeed.mutate({ id: s.id, intervalMs: Number(v) })} options={SPEEDS.some((o) => o.value === String(s.intervalMs)) ? SPEEDS : [{ value: String(s.intervalMs), label: `${s.intervalMs / 1000}s per ball` }, ...SPEEDS]} />
        ),
    },
    {
      header: "Controls",
      cell: (s) =>
        s.status === "finished" ? null : (
          <div className="flex min-w-80 flex-wrap gap-1">
            {s.status === "scheduled" && act(s, "start", "Start now")}
            {s.status === "running" && act(s, "pause", "Pause")}
            {s.status === "running" && act(s, "rain", "Rain")}
            {s.status === "paused" && act(s, "resume", "Resume")}
            {act(s, s.outage ? "outage_off" : "outage_on", s.outage ? "End outage" : "Simulate outage")}
            <ConfirmButton title="Finish this replay now?" description="Jumps to the final result, so its markets settle and tokens move." confirmLabel="Finish" disabled={control.isPending} onConfirm={() => control.mutate({ id: s.id, action: "finish" })}>Finish</ConfirmButton>
            <ConfirmButton title="Abandon this replay?" description="The match ends with no result, so bets on undecided markets are refunded." confirmLabel="Abandon" disabled={control.isPending} onConfirm={() => control.mutate({ id: s.id, action: "abandon" })}>Abandon</ConfirmButton>
          </div>
        ),
    },
  ];

  return (
    <div className="grid gap-3">
      <Card className="gap-3 p-4">
        <div>
          <h2 className="font-semibold">Start a replay</h2>
          <p className="text-sm text-muted-foreground">Plays a simulated match through the real pipeline: markets, bets and settlement all run for real, with no provider calls.</p>
        </div>
        {scripts.error ? (
          <ErrorState error={scripts.error} retry={() => void scripts.refetch()} />
        ) : (
          <div className="grid items-end gap-2 md:grid-cols-[1fr_auto_auto_auto]">
            <SelectField label="Match" value={scriptId} onChange={setScriptId} anyLabel="Choose a match" options={(scripts.data ?? []).map((s) => ({ value: s.id, label: s.title }))} />
            <SelectField label="Speed" value={speed} onChange={setSpeed} options={SPEEDS} />
            <SelectField label="Starts" value={start} onChange={setStart} options={STARTS} />
            <Button disabled={!scriptId || create.isPending} onClick={() => create.mutate()}>
              {create.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Create replay
            </Button>
          </div>
        )}
      </Card>
      {sessions.isPending ? (
        <ListSkeleton rows={3} />
      ) : sessions.error ? (
        <ErrorState error={sessions.error} retry={() => void sessions.refetch()} />
      ) : sessions.data.length === 0 ? (
        <EmptyState title="No replays yet" hint="Create one above to simulate a live match." />
      ) : (
        <DataTable caption="Replay sessions" rows={sessions.data} columns={columns} rowKey={(s) => s.id} />
      )}
    </div>
  );
}
