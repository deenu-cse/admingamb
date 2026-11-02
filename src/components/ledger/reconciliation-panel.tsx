"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { ledgerApi } from "@/lib/api/endpoints";
import type { ReconciliationRun } from "@/lib/api/types";
import { formatDateTime, formatTokens } from "@/lib/format";
import { qk } from "@/lib/query-keys";

type Mismatch = ReconciliationRun["mismatches"][number];

const MISMATCHES: Array<Column<Mismatch>> = [
  { header: "User", cell: (m) => <Link href={`/users/${m.userId}`} className="font-mono text-xs underline-offset-2 hover:underline">{m.userId}</Link> },
  { header: "Field", cell: (m) => <code className="text-xs">{m.field}</code> },
  { header: "Ledger says", align: "right", cell: (m) => formatTokens(m.expected) },
  { header: "Wallet says", align: "right", cell: (m) => formatTokens(m.actual) },
  { header: "Difference", align: "right", cell: (m) => formatTokens(m.actual - m.expected, { sign: true }) },
];

function RunDetail({ run }: { run: ReconciliationRun }) {
  return (
    <div className="grid gap-2">
      <dl className="tabular grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Wallets checked</dt><dd>{run.walletsChecked.toLocaleString("en-US")}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Entries scanned</dt><dd>{run.ledgerEntriesScanned.toLocaleString("en-US")}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Global sum (must be 0)</dt><dd>{formatTokens(run.globalSum)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Unbalanced transactions</dt><dd>{run.unbalancedTxns.length}</dd></div>
      </dl>
      {run.error && (
        <Alert variant="destructive">
          <AlertDescription>{run.error}</AlertDescription>
        </Alert>
      )}
      {run.mismatches.length > 0 ? (
        <DataTable caption="Wallet mismatches" rows={run.mismatches} columns={MISMATCHES} rowKey={(m) => `${m.userId}:${m.field}`} />
      ) : (
        run.status === "clean" && <p className="text-sm text-muted-foreground">Every wallet matches the ledger.</p>
      )}
    </div>
  );
}

export function ReconciliationPanel() {
  const qc = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({ queryKey: qk.reconRuns, queryFn: ledgerApi.runs });
  const [selected, setSelected] = useState<string | null>(null);
  const run = useMutation({
    mutationFn: ledgerApi.run,
    onSuccess: (r) => {
      setSelected(r._id);
      if (r.status === "clean") toast.success("Reconciliation clean");
      else toast.error(`Reconciliation found ${r.mismatches.length} mismatches`);
      void qc.invalidateQueries({ queryKey: qk.reconRuns });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const columns: Array<Column<ReconciliationRun>> = [
    { header: "Started", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.startedAt)}</span> },
    { header: "Trigger", cell: (r) => (r.trigger === "manual" ? "Manual" : "Scheduled") },
    { header: "Result", cell: (r) => <StatusBadge status={r.status} /> },
    { header: "Mismatches", align: "right", cell: (r) => r.mismatches.length },
    { header: "Wallets", align: "right", cell: (r) => r.walletsChecked.toLocaleString("en-US") },
    {
      header: "Details",
      cell: (r) => (
        <Button variant="ghost" size="xs" aria-pressed={selected === r._id} onClick={() => setSelected(r._id)}>
          View
        </Button>
      ),
    },
  ];
  const shown = data?.find((r) => r._id === selected) ?? data?.[0];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Rebuilds every balance from the ledger and compares it with the wallets.</p>
        <Button size="sm" disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Run reconciliation
        </Button>
      </div>
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState error={error} retry={() => void refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="No runs yet" hint="It runs on a schedule, or start one now." />
      ) : (
        <>
          {shown && <RunDetail run={shown} />}
          <DataTable caption="Reconciliation runs" rows={data} columns={columns} rowKey={(r) => r._id} />
        </>
      )}
    </div>
  );
}
