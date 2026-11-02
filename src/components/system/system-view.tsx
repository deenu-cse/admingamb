"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DataTable, type Column } from "@/components/common/data-table";
import { ErrorState, ListSkeleton, PageTitle } from "@/components/common/states";
import { StatTile } from "@/components/common/stat-tile";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { systemApi } from "@/lib/api/endpoints";
import type { SystemHealth } from "@/lib/api/types";
import { formatBps, formatUptime, relativeTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";

type Queue = SystemHealth["queues"][number];

const QUEUES: Array<Column<Queue>> = [
  { header: "Queue", cell: (q) => <code className="text-xs">{q.name}</code> },
  { header: "Waiting", align: "right", cell: (q) => q.waiting },
  { header: "Active", align: "right", cell: (q) => q.active },
  { header: "Delayed", align: "right", cell: (q) => q.delayed },
  { header: "Failed", align: "right", cell: (q) => q.failed },
];

function Dependency({ name, dep }: { name: string; dep: { ok: boolean; latencyMs: number } }) {
  return <StatTile label={name} value={<StatusBadge status={dep.ok ? "active" : "failed"} label={dep.ok ? "Up" : "Down"} />} hint={`${dep.latencyMs} ms`} />;
}

function circuitLabel(state: string | undefined): string {
  if (!state) return "Not in use";
  return state === "CLOSED" ? "Healthy" : state === "OPEN" ? "Failing: calls paused" : "Testing recovery";
}

export function SystemView() {
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.health, queryFn: systemApi.health, refetchInterval: 5000 });

  return (
    <>
      <PageTitle hint={data ? `Refreshes every 5 seconds. API up for ${formatUptime(data.uptimeSec)}.` : "Refreshes every 5 seconds."}>System health</PageTitle>
      {isPending ? (
        <ListSkeleton rows={4} className="h-20" />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Dependency name="MongoDB" dep={data.dependencies.mongo} />
            <Dependency name="Redis" dep={data.dependencies.redis} />
            <StatTile label={`Error rate (${data.errorRate.windowMinutes} min)`} value={formatBps(data.errorRate.rateBps)} hint={`${data.errorRate.errors} of ${data.errorRate.requests.toLocaleString("en-US")} requests`} tone={data.errorRate.rateBps > 100 ? "down" : undefined} />
            <StatTile label="Socket connections" value={(data.sockets.live + data.sockets.user + data.sockets.admin).toLocaleString("en-US")} hint={`${data.sockets.live} public · ${data.sockets.user} players · ${data.sockets.admin} staff`} />
          </div>

          <Card className="gap-3 p-4">
            <h2 className="font-semibold">Data provider</h2>
            <dl className="tabular grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Mode</dt><dd>{data.provider.providerMode === "live" ? "Live (CricAPI)" : "Replay"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">API key</dt><dd>{data.provider.liveConfigured ? "Configured" : "Not configured"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Provider status</dt><dd>{circuitLabel(data.provider.circuit?.state)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">API hits today</dt><dd>{data.provider.budget.used} of {data.provider.budget.limit}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Last match sync</dt><dd>{relativeTime(data.lastSyncAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Last poller tick</dt><dd>{relativeTime(data.provider.poller.lastTickAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Matches in progress</dt><dd>{data.provider.matches.inProgress}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Stale matches</dt><dd>{data.provider.matches.stale}</dd></div>
            </dl>
          </Card>

          <section aria-label="Queues" className="grid gap-2">
            <h2 className="text-base font-semibold">Queues</h2>
            <DataTable caption="Queue depths" rows={data.queues} columns={QUEUES} rowKey={(q) => q.name} />
          </section>

          <p className="text-sm text-muted-foreground">
            Last reconciliation:{" "}
            {data.lastReconciliation ? (
              <Link href="/ledger" className="underline underline-offset-2">
                {data.lastReconciliation.status}, {relativeTime(data.lastReconciliation.startedAt)}
              </Link>
            ) : (
              "none yet"
            )}
          </p>
        </div>
      )}
    </>
  );
}
